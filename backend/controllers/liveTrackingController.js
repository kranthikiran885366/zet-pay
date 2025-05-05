// backend/controllers/liveTrackingController.js
const liveTrackingProviderService = require('../services/liveTrackingProviderService'); // Assume a dedicated service

// Get Live Status for Bus
exports.getBusStatus = async (req, res, next) => {
    const { identifier } = req.params; // Bus number or service ID
    console.log(`Fetching live status for bus: ${identifier}`);
    try {
        const status = await liveTrackingProviderService.fetchBusLiveStatus(identifier);
        if (!status) {
            return res.status(404).json({ message: 'Live status not found for this bus.' });
        }
        res.status(200).json(status);
    } catch (error) {
        next(error);
    }
};

// Get Live Status for Train
exports.getTrainStatus = async (req, res, next) => {
    const { identifier } = req.params; // Train number or name
     console.log(`Fetching live status for train: ${identifier}`);
    try {
        const status = await liveTrackingProviderService.fetchTrainLiveStatus(identifier);
         if (!status) {
            return res.status(404).json({ message: 'Live status not found for this train.' });
        }
        res.status(200).json(status);
    } catch (error) {
        next(error);
    }
};

// Add more tracking types if needed (e.g., flights - often requires PNR)
