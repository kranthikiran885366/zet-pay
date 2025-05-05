// backend/controllers/pocketMoneyController.js
const pocketMoneyService = require('../services/pocket-money'); // Assuming service location
const { getWalletBalance } = require('../services/wallet'); // To check parent balance
const { addTransaction } = require('../services/transactionLogger'); // To log top-up from parent view

// Get Pocket Money Configuration
exports.getPocketMoneyConfig = async (req, res, next) => {
    const userId = req.user.uid;
    const config = await pocketMoneyService.getPocketMoneyConfig(userId);
    res.status(200).json(config);
};

// Update Pocket Money Configuration
exports.updatePocketMoneyConfig = async (req, res, next) => {
    const userId = req.user.uid;
    const configData = req.body; // Assuming body contains the full PocketMoneyConfig structure

    // Ensure the userId in the body matches the authenticated user
    if (configData.userId !== userId) {
        res.status(403);
        throw new Error("Permission denied to update this configuration.");
    }

    await pocketMoneyService.updatePocketMoneyConfig(userId, configData);
    res.status(200).json({ success: true, message: 'Configuration updated successfully.' });
};

// Add Funds to Child's Wallet
exports.addFundsToChild = async (req, res, next) => {
    const parentUserId = req.user.uid;
    const { childId, amount } = req.body;

    // 1. Check parent's wallet balance
    const parentBalance = await getWalletBalance(parentUserId);
    if (parentBalance < amount) {
        res.status(400);
        throw new Error(`Insufficient parent wallet balance (Available: ₹${parentBalance.toFixed(2)}).`);
    }

    // 2. Simulate Deducting from Parent Wallet & Adding to Child
    // In a real system, this needs to be a secure, atomic transaction.
    // Using the service function directly can handle the Firestore update.
    // We'll simulate the parent deduction and then update the child's balance.
    console.log(`Simulating deduction of ₹${amount} from parent ${parentUserId}`);
    // TODO: Implement actual deduction (e.g., call payViaWallet internally)

    // 3. Update Child's balance via the config service
    // This might be better handled by a dedicated function `addChildBalance(userId, childId, amount)`
    // For now, we fetch the config, update it, and save it back (less efficient but works)
    const config = await pocketMoneyService.getPocketMoneyConfig(parentUserId);
    if (!config) throw new Error("Could not find pocket money configuration.");

    const childExists = config.children.some(c => c.id === childId);
    if (!childExists) throw new Error("Child account not found in configuration.");

    const updatedChildren = config.children.map(c =>
        c.id === childId ? { ...c, balance: c.balance + amount } : c
    );
    await pocketMoneyService.updatePocketMoneyConfig(parentUserId, { ...config, children: updatedChildren });

     // 4. Log transaction from parent's perspective
     await addTransaction({
        userId: parentUserId,
        type: 'Sent', // Money sent from parent
        name: `Pocket Money Top-up`,
        description: `Added ₹${amount} to child account ${childId}`,
        amount: -amount, // Debit from parent
        status: 'Completed',
        // paymentMethodUsed: 'Wallet', // Indicate source
     });

      // 5. Log transaction from child's perspective (using the child transaction service)
      await pocketMoneyService.addPocketMoneyTransaction({
          userId: parentUserId, // Still link to parent for overall view
          childId: childId,
          description: 'Funds Added by Parent',
          amount: amount, // Credit to child
      });


    res.status(200).json({ success: true, message: `₹${amount} added successfully.` });
};

// Get Child's Transactions
exports.getChildTransactions = async (req, res, next) => {
    const userId = req.user.uid; // Parent ID
    const { childId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10; // Default limit
    const transactions = await pocketMoneyService.getPocketMoneyTransactions(userId, childId, limit);
    res.status(200).json(transactions);
};
