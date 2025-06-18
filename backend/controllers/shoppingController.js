
// backend/controllers/shoppingController.js
const shoppingProviderService = require('../services/shoppingProviderService');
const { addTransaction } = require('../services/transactionLogger');
const { payViaWalletInternal } = require('../services/wallet');
const { sendToUser } = require('../server');
const { doc, updateDoc, getDoc, serverTimestamp, collection, addDoc, query, where, orderBy, limit, getDocs } = require('firebase/firestore');
const db = require('../config/firebaseAdmin').db;
import type { Transaction, ShoppingOrder } from '../services/types'; // Assuming ShoppingOrder type exists

exports.getCategories = async (req, res, next) => {
    console.log("[Shopping Ctrl] Fetching categories...");
    try {
        const categories = await shoppingProviderService.fetchCategoriesFromApi();
        res.status(200).json(categories);
    } catch (error) {
        next(error);
    }
};

exports.getProducts = async (req, res, next) => {
    const { categoryId, searchTerm } = req.query;
    console.log(`[Shopping Ctrl] Fetching products ${categoryId ? `for category ${categoryId}` : ''} ${searchTerm ? `matching "${searchTerm}"` : ''}...`);
    try {
        const products = await shoppingProviderService.fetchProductsFromApi(categoryId, searchTerm);
        res.status(200).json(products);
    } catch (error) {
        next(error);
    }
};

exports.getProductDetails = async (req, res, next) => {
    const { productId } = req.params;
    console.log(`[Shopping Ctrl] Fetching details for product ${productId}...`);
    try {
        const product = await shoppingProviderService.fetchProductDetailsFromApi(productId);
        if (!product) {
            res.status(404);
            return next(new Error("Product not found."));
        }
        res.status(200).json(product);
    } catch (error) {
        next(error);
    }
};

exports.placeOrder = async (req, res, next) => {
    const userId = req.user.uid;
    const { items, totalAmount, shippingAddress, paymentMethod = 'wallet' } = req.body;

    console.log(`[Shopping Ctrl] User ${userId} placing order for ₹${totalAmount}`);

    if (!items || !Array.isArray(items) || items.length === 0 || totalAmount <= 0) {
        res.status(400);
        return next(new Error("Invalid order data: Items and total amount are required."));
    }

    let paymentSuccess = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.' };
    let providerOrderResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Order placement or payment failed.';
    const orderName = `Online Shopping Order`;

    let logData = {
        userId,
        type: 'Shopping',
        name: orderName,
        description: `Order with ${items.length} item(s). Address: ${shippingAddress.line1}`,
        amount: -totalAmount,
        status: 'Pending',
        billerId: 'ZETPAY_ECOMMERCE', // Internal identifier
        paymentMethodUsed: paymentMethod,
    };
    let paymentTransactionId = null;

    try {
        const initialTxLog = await addTransaction(logData);
        paymentTransactionId = initialTxLog.id;

        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `ECOMMERCE_ORDER_${Date.now()}`, totalAmount, orderName, 'Shopping');
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed for order.');
            paymentSuccess = true;
        } else {
            // TODO: Implement UPI/Card payment via paymentGatewayService
            throw new Error(`Payment method ${paymentMethod} not implemented for shopping.`);
        }

        if (!paymentResult.transactionId && paymentSuccess) {
            paymentResult.transactionId = paymentTransactionId;
        }

        console.log(`[Shopping Ctrl] Payment successful (Tx ID: ${paymentTransactionId}). Confirming with shopping provider...`);
        providerOrderResult = await shoppingProviderService.placeOrderWithProviderApi({
            userId, items, totalAmount, shippingAddress, paymentTransactionId
        });

        if ((providerOrderResult as any).success) {
            finalStatus = 'Completed'; // Or 'Processing'
            logData.status = finalStatus;
            logData.ticketId = (providerOrderResult as any).orderId || paymentTransactionId;
            failureReason = '';
            paymentResult.message = (providerOrderResult as any).message || 'Order placed successfully with provider.';

            await updateDoc(doc(db, 'transactions', paymentTransactionId), {
                status: finalStatus,
                description: `${logData.description} - Provider Order ID: ${logData.ticketId}`,
                ticketId: logData.ticketId,
                updatedAt: serverTimestamp()
            });

            const userOrdersRef = collection(db, 'users', userId, 'shoppingOrders');
            await addDoc(userOrdersRef, {
                orderId: (providerOrderResult as any).orderId,
                items: items.map(item => ({ productId: item.productId, quantity: item.quantity, priceAtPurchase: item.price })),
                totalAmount, shippingAddress, paymentMethod,
                orderDate: serverTimestamp(),
                status: finalStatus,
                userId,
                paymentTransactionId,
            });
        } else {
            finalStatus = 'Failed';
            failureReason = (providerOrderResult as any).message || 'Order placement failed at provider after payment.';
            logData.status = 'Failed';
            paymentResult.message = failureReason;

            console.error(`[Shopping Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but shopping order failed. Refunding.`);
            await updateDoc(doc(db, 'transactions', paymentTransactionId), {
                status: 'Failed',
                description: `Order Failed at provider for ${logData.name} - ${failureReason}`,
                failureReason, updatedAt: serverTimestamp()
            });
            if (paymentMethod === 'wallet') {
                await payViaWalletInternal(userId, `REFUND_SHOPPING_${paymentTransactionId}`, -totalAmount, `Refund: Failed Shopping Order ${orderName}`, 'Refund');
                paymentResult.message = failureReason + " Refund to wallet initiated.";
            }
            throw new Error(paymentResult.message);
        }

        const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
        if (finalTxDoc.exists()) {
            const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate().toISOString() };
            sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
        }
        sendToUser(userId, { type: 'shopping_order_update', payload: { orderId: (providerOrderResult as any).orderId, status: finalStatus, ...providerOrderResult } });

        res.status(201).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            orderDetails: providerOrderResult,
        });

    } catch (error: any) {
        console.error(`[Shopping Ctrl] Shopping order failed for user ${userId}:`, error.message);
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

exports.getOrderHistory = async (req, res, next) => {
    const userId = req.user.uid;
    console.log(`[Shopping Ctrl] Fetching order history for user ${userId}`);
    try {
        const ordersColRef = collection(db, 'users', userId, 'shoppingOrders');
        const q = query(ordersColRef, orderBy('orderDate', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id, // Firestore document ID
                ...data,
                orderDate: (data.orderDate as Timestamp).toDate().toISOString(),
            } as ShoppingOrder;
        });
        res.status(200).json(orders);
    } catch (error) {
        next(error);
    }
};

exports.getOrderDetails = async (req, res, next) => {
    const userId = req.user.uid;
    const { orderId } = req.params;
    console.log(`[Shopping Ctrl] Fetching details for order ${orderId}, user ${userId}`);
    try {
        const orderDocRef = doc(db, 'users', userId, 'shoppingOrders', orderId); // Path to user's specific order
        const orderSnap = await getDoc(orderDocRef);
        if (!orderSnap.exists()) {
            // Fallback: Check top-level orders collection if schema changed
            const topLevelOrderRef = doc(db, 'shoppingOrders', orderId);
            const topLevelSnap = await getDoc(topLevelOrderRef);
            if (topLevelSnap.exists() && topLevelSnap.data()?.userId === userId) {
                 const data = topLevelSnap.data();
                 return res.status(200).json({id: topLevelSnap.id, ...data, orderDate: (data.orderDate as Timestamp).toDate().toISOString()} as ShoppingOrder);
            }
            res.status(404);
            return next(new Error("Order not found or access denied."));
        }
        const data = orderSnap.data();
         res.status(200).json({id: orderSnap.id, ...data, orderDate: (data.orderDate as Timestamp).toDate().toISOString()} as ShoppingOrder);
    } catch (error) {
        next(error);
    }
};
