// backend/controllers/cashWithdrawalController.js
const cashWithdrawalService = require('../services/cash-withdrawal'); // Assuming service location

// Get Nearby Agents
exports.getNearbyAgents = async (req, res, next) => {
    // Location should ideally come from request query or verified user profile
    const { lat, lon } = req.query;
    const agents = await cashWithdrawalService.getNearbyAgents(Number(lat), Number(lon));
    res.status(200).json(agents);
};

// Initiate Withdrawal
exports.initiateWithdrawal = async (req, res, next) => {
    const userId = req.user.uid;
    const { agentId, agentName, amount } = req.body; // Get agentName if provided by client

    const withdrawalDetails = await cashWithdrawalService.initiateWithdrawal(userId, agentId, agentName || 'Zet Agent', amount); // Pass userId

    res.status(201).json(withdrawalDetails); // Return details including OTP/QR data
};

// Check Withdrawal Status
exports.checkWithdrawalStatus = async (req, res, next) => {
    const userId = req.user.uid; // Optional: verify user owns this withdrawal if needed
    const { withdrawalId } = req.params;
    const status = await cashWithdrawalService.checkWithdrawalStatus(withdrawalId); // Service handles expiry check
    res.status(200).json({ status });
};

// Cancel Withdrawal
exports.cancelWithdrawal = async (req, res, next) => {
    const userId = req.user.uid;
    const { withdrawalId } = req.params;
    await cashWithdrawalService.cancelWithdrawal(userId, withdrawalId); // Service handles checks & updates
    res.status(200).json({ success: true, message: 'Withdrawal request cancelled.' });
};

// Confirm Dispense (Agent Action - Requires separate Agent Auth Middleware)
// exports.confirmDispense = async (req, res, next) => {
//     // const agentId = req.agent.id; // Assuming agent auth middleware provides agent info
//     const { withdrawalId, otpEntered } = req.body;
//     // const success = await cashWithdrawalService.confirmDispenseByAgent(withdrawalId, otpEntered);
//     // res.status(200).json({ success });
// };

