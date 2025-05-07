// backend/controllers/shoppingController.js
const shoppingProviderService = require('../services/shoppingProviderService'); // To interact with mock data source
const { addTransaction } = require('../services/transactionLogger'); // For logging order transaction
const { payViaWalletInternal } = require('../services/wallet'); // For payment if using wallet

// --- Categories ---
exports.getCategories = async (req, res, next) => {
    console.log("[Shopping Ctrl] Fetching categories...");
    const categories = await shoppingProviderService.fetchCategories();
    res.status(200).json(categories);
};

// --- Products ---
exports.getProducts = async (req, res, next) => {
    const { categoryId } = req.query;
    console.log(`[Shopping Ctrl] Fetching products ${categoryId ? `for category ${categoryId}` : 'all'}...`);
    const products = await shoppingProviderService.fetchProducts(categoryId);
    res.status(200).json(products);
};

exports.getProductDetails = async (req, res, next) => {
    const { productId } = req.params;
    console.log(`[Shopping Ctrl] Fetching details for product ${productId}...`);
    const product = await shoppingProviderService.fetchProductById(productId);
    if (!product) {
        res.status(404);
        throw new Error("Product not found.");
    }
    res.status(200).json(product);
};

// --- Mock Order Placement ---
exports.placeMockOrder = async (req, res, next) => {
    const userId = req.user.uid; // From authMiddleware
    const { items, totalAmount /*, shippingAddress, paymentMethod */ } = req.body;

    console.log(`[Shopping Ctrl] User ${userId} placing mock order for ₹${totalAmount}`);

    // 1. Validate items and totalAmount (partially done by router validation)
    // Further validation: check if product prices match, stock available (if implementing inventory)

    // 2. Simulate Payment Processing (e.g., using wallet)
    // In a real scenario, integrate with payment gateway or UPI
    let paymentSuccessful = false;
    let paymentTransactionId = null;
    const paymentNote = `Online Shopping Order - ${items.length} item(s)`;

    try {
        // Assuming payment via wallet for this mock
        const walletPaymentResult = await payViaWalletInternal(userId, 'ZETPAY_ECOMMERCE', totalAmount, paymentNote, 'Shopping');
        if (!walletPaymentResult.success) {
            throw new Error(walletPaymentResult.message || 'Wallet payment failed for order.');
        }
        paymentSuccessful = true;
        paymentTransactionId = walletPaymentResult.transactionId;
        console.log(`[Shopping Ctrl] Mock order payment successful via wallet. Transaction ID: ${paymentTransactionId}`);
    } catch (paymentError) {
        console.error("[Shopping Ctrl] Order payment processing error:", paymentError);
        // Don't re-throw immediately, let the transaction log reflect the payment failure
        paymentSuccessful = false;
    }

    // 3. Log the Order Transaction (whether payment succeeded or failed initially)
    const orderId = `ORD_${Date.now()}_${userId.substring(0, 5)}`;
    const transactionStatus = paymentSuccessful ? 'Completed' : 'Failed';
    const transactionDescription = paymentSuccessful ?
        `Order ${orderId} for ${items.length} items.` :
        `Failed Order Attempt ${orderId}. Reason: ${paymentSuccessful ? '' : 'Payment Failed'}`;

    // Use the main transaction logger
    const loggedTransaction = await addTransaction({
        userId,
        type: 'Shopping', // Or a more specific type if needed
        name: `Online Order - ${orderId}`,
        description: transactionDescription,
        amount: -totalAmount, // Debit from user
        status: transactionStatus,
        billerId: 'ZETPAY_ECOMMERCE_MOCK', // Internal identifier for mock e-commerce
        ticketId: orderId, // Use orderId as ticketId for reference
        paymentMethodUsed: 'Wallet', // Assuming wallet for this mock
    });

    if (!paymentSuccessful) {
        // If payment failed, throw an error now that it's logged
        res.status(400); // Bad Request if payment itself failed
        throw new Error("Order placement failed due to payment issue.");
    }

    // 4. (Optional) Save order details to a separate 'orders' collection if needed
    // await shoppingProviderService.saveOrder({ userId, orderId, items, totalAmount, shippingAddress, status: 'Processing' });

    // 5. Respond to client
    // Return the logged transaction which includes status and transaction ID (which is now the primary ID)
    // Also include the e-commerce specific orderId
    res.status(201).json({
        ...loggedTransaction, // Spread the transaction details (id, status, date, etc.)
        orderId: orderId, // Add the specific e-commerce order ID
        message: 'Order placed successfully (mock). Payment processed.',
    });
};
