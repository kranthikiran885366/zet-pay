
// backend/controllers/foodController.js
const foodProviderService = require('../services/foodProviderService');
const { addTransaction } = require('../services/transactionLogger');
const { payViaWalletInternal } = require('../services/wallet');
const { sendToUser } = require('../server');
const { doc, updateDoc, getDoc, serverTimestamp, collection, addDoc } = require('firebase/firestore');
const db = require('../config/firebaseAdmin').db;
import type { Transaction } from '../services/types';

exports.searchRestaurants = async (req, res, next) => {
    const { location, cuisine, query: searchQuery } = req.query;
    console.log('[Food Ctrl] Searching restaurants:', { location, cuisine, searchQuery });
    try {
        const results = await foodProviderService.searchRestaurantsFromApi({ location, cuisine, query: searchQuery });
        res.status(200).json(results);
    } catch (error) {
        next(error);
    }
};

exports.getRestaurantMenu = async (req, res, next) => {
    const { restaurantId } = req.params;
    console.log(`[Food Ctrl] Fetching menu for restaurant ID: ${restaurantId}`);
    try {
        const menu = await foodProviderService.fetchMenuFromApi(restaurantId);
        if (!menu) {
            res.status(404);
            return next(new Error("Menu not found for this restaurant."));
        }
        res.status(200).json(menu);
    } catch (error) {
        next(error);
    }
};

exports.placeFoodOrder = async (req, res, next) => {
    const userId = req.user.uid;
    const { restaurantId, items, totalAmount, deliveryAddress, paymentMethod = 'wallet' } = req.body;
    const restaurantDetails = await foodProviderService.fetchRestaurantDetailsFromApi(restaurantId); // Get name for logging

    console.log(`[Food Ctrl] Placing food order for user ${userId} at restaurant ${restaurantId}`);

    let paymentSuccess = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.' };
    let orderResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Order placement or payment failed.';
    const orderName = `Food Order: ${restaurantDetails?.name || restaurantId}`;

    let logData = {
        userId,
        type: 'Food Order',
        name: orderName,
        description: `Order from ${restaurantDetails?.name || restaurantId} with ${items.length} item(s). Address: ${deliveryAddress.line1}`,
        amount: -totalAmount,
        status: 'Pending', // Initial status before payment
        billerId: restaurantId,
        paymentMethodUsed: paymentMethod,
    };
    let paymentTransactionId = null;

    try {
        // 1. Log initial pending transaction
        const initialTxLog = await addTransaction(logData);
        paymentTransactionId = initialTxLog.id;

        // 2. Process Payment
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `FOOD_ORDER_${restaurantId}_${Date.now()}`, totalAmount, orderName, 'Food Order');
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed for food order.');
            paymentSuccess = true;
        } else {
            // TODO: Implement UPI/Card payment via paymentGatewayService
            throw new Error(`Payment method ${paymentMethod} not yet implemented for food orders.`);
        }

        if (!paymentResult.transactionId && paymentSuccess) { // If payViaWalletInternal doesn't return its own tx id used for food tx
             paymentResult.transactionId = paymentTransactionId; // Use the one we created
        } else if (paymentResult.transactionId && paymentResult.transactionId !== paymentTransactionId) {
            // If payViaWalletInternal created its own transaction, we might want to update our initial log
            // or decide which transaction ID is primary for the order. For simplicity, let's assume our initial one is primary.
            // This might need reconciliation if payViaWalletInternal logs independently with a different purpose.
             console.warn(`[Food Ctrl] Initial log ${paymentTransactionId} and payment log ${paymentResult.transactionId} differ. Using initial log ID for order reference.`);
        }


        // 3. Confirm Order with Food Provider/Aggregator
        console.log(`[Food Ctrl] Payment successful (Tx ID: ${paymentTransactionId}). Confirming with food provider...`);
        orderResult = await foodProviderService.placeOrderWithProviderApi({
            userId, restaurantId, items, totalAmount, deliveryAddress, paymentTransactionId
        });

        if ((orderResult as any).success) {
            finalStatus = 'Completed'; // Or 'Processing' if provider has stages
            logData.status = finalStatus;
            logData.ticketId = (orderResult as any).orderId || paymentTransactionId; // Use provider's order ID
            failureReason = '';
            paymentResult.message = (orderResult as any).message || 'Order placed successfully with provider.';

            await updateDoc(doc(db, 'transactions', paymentTransactionId), {
                status: finalStatus,
                description: `${logData.description} - Provider Order ID: ${logData.ticketId}`,
                ticketId: logData.ticketId,
                updatedAt: serverTimestamp()
            });

            const userOrdersRef = collection(db, 'users', userId, 'foodOrders');
            await addDoc(userOrdersRef, {
                orderId: (orderResult as any).orderId,
                restaurantId,
                restaurantName: restaurantDetails?.name,
                items, totalAmount, deliveryAddress, paymentMethod,
                orderDate: serverTimestamp(),
                status: finalStatus, // e.g., 'Placed', 'Preparing', 'Out for Delivery'
                userId,
                paymentTransactionId,
            });
        } else {
            finalStatus = 'Failed';
            failureReason = (orderResult as any).message || 'Order placement failed at provider after payment.';
            logData.status = 'Failed';
            paymentResult.message = failureReason;

            console.error(`[Food Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but food order failed at provider. Refunding.`);
            await updateDoc(doc(db, 'transactions', paymentTransactionId), {
                status: 'Failed',
                description: `Order Failed at provider for ${logData.name} - ${failureReason}`,
                failureReason: failureReason,
                updatedAt: serverTimestamp()
            });
            if (paymentMethod === 'wallet') {
                await payViaWalletInternal(userId, `REFUND_FOOD_${paymentTransactionId}`, -totalAmount, `Refund: Failed Food Order ${orderName}`, 'Refund');
                paymentResult.message = failureReason + " Refund to wallet initiated.";
            } else {
                // TODO: Initiate refund for other payment methods
            }
            throw new Error(paymentResult.message);
        }

        // Send WebSocket update for transaction
        const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
        if (finalTxDoc.exists()) {
            const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate().toISOString() };
            sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
        }
        // Send WebSocket update for order status
        sendToUser(userId, { type: 'food_order_update', payload: { orderId: (orderResult as any).orderId, status: finalStatus, ...orderResult } });

        res.status(201).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            orderDetails: orderResult,
        });

    } catch (error: any) {
        console.error(`[Food Ctrl] Food order failed for user ${userId}:`, error.message);
        failureReason = error.message || failureReason;
        if (paymentTransactionId) {
            try {
                await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: 'Failed', failureReason: failureReason, updatedAt: serverTimestamp() });
                 const updatedTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
                 if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: { id: updatedTxDoc.id, ...updatedTxDoc.data(), date: updatedTxDoc.data().date.toDate().toISOString() } });
            } catch (updateError) {
                console.error("Error updating transaction to Failed status:", updateError);
            }
        }
        res.status(400).json({ status: 'Failed', message: failureReason, transactionId: paymentTransactionId });
    }
};

exports.getFoodOrderStatus = async (req, res, next) => {
    const { orderId } = req.params;
    console.log(`[Food Ctrl] Fetching status for food order ID: ${orderId}`);
    try {
        const status = await foodProviderService.fetchOrderStatusFromApi(orderId);
        if (!status) {
            res.status(404);
            return next(new Error("Order status not found."));
        }
        res.status(200).json(status);
    } catch (error) {
        next(error);
    }
};

// Ensure Transaction type matches what's expected by addTransaction and returned by payViaWalletInternal
// No direct type imports here for now, relying on JSDoc or implicit matching.
