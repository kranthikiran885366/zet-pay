
// SIMULATED BANK STATUS SERVICE
// In a real app, this might query a status API, monitor NPCI feeds, or use crowdsourced data.

const getBankStatus = async (bankHandle) => {
     console.log(`[Bank Status Sim] Checking status for: ${bankHandle}`);
     await new Promise(resolve => setTimeout(resolve, 50)); // Very quick check

     // Mock specific bank statuses based on handle
     const handle = bankHandle?.toLowerCase();
     if (handle?.includes('icici')) return 'Down';
     if (handle?.includes('hdfc')) return 'Slow';

     // Default/Random for others
     const random = Math.random();
     if (random < 0.03) return 'Down'; // 3% chance down
     if (random < 0.15) return 'Slow'; // 12% chance slow
     return 'Active'; // 85% chance active
 };

module.exports = {
    getBankStatus,
};
