// backend/config/redisClient.js
const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
console.log(`[Redis] Attempting to connect to Redis at: ${redisUrl}`);

const redisClient = createClient({
    url: redisUrl,
    // Optional: Add more configurations like password, socket options etc.
    // password: process.env.REDIS_PASSWORD,
    // socket: {
    //   connectTimeout: 5000, // 5 seconds
    //   reconnectStrategy: (retries) => Math.min(retries * 50, 10000) // Exponential backoff
    // }
});

redisClient.on('connect', () => {
    console.log('[Redis] Client connected successfully.');
});

redisClient.on('ready', () => {
    console.log('[Redis] Client ready to use.');
});

redisClient.on('error', (err) => {
    console.error('[Redis] Client Error:', err.message);
    // Note: The client will attempt to reconnect automatically by default with v4.
    // Handle critical errors or log persistently if needed.
});

redisClient.on('end', () => {
    console.log('[Redis] Client connection ended.');
});

// Connect the client.
// It's important to call connect() for redis v4.
// We will call this in server.js after ensuring other initializations are done.
// async function connect() {
//   if (!redisClient.isOpen) {
//     try {
//       await redisClient.connect();
//     } catch (err) {
//       console.error('[Redis] Failed to connect on startup:', err);
//       // Application might need to handle this (e.g., run without cache or exit)
//     }
//   }
// }
// connect(); // Don't connect here, connect in server.js

module.exports = redisClient;
