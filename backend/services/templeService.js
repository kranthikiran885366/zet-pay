
const { format, addDays } = require('date-fns');

// --- Mock Data Generators ---

const mockDarshanSlots = (templeId, date) => {
    console.log(`Generating mock slots for ${templeId} on ${date}`);
    const baseSlots = [
        { time: '08:00 - 09:00', availability: 'Full', quota: 'Free', ticketsLeft: 0 },
        { time: '09:00 - 10:00', availability: 'Available', quota: 'Special Entry (₹300)', ticketsLeft: Math.floor(Math.random() * 150) + 50 },
        { time: '10:00 - 11:00', availability: 'Filling Fast', quota: 'Special Entry (₹300)', ticketsLeft: Math.floor(Math.random() * 40) + 5 },
        { time: '11:00 - 12:00', availability: 'Available', quota: 'Special Entry (₹300)', ticketsLeft: Math.floor(Math.random() * 200) + 100 },
        { time: '14:00 - 15:00', availability: 'VIP', quota: 'VIP', ticketsLeft: Math.floor(Math.random() * 10) + 1 },
        { time: '16:00 - 17:00', availability: 'Available', quota: 'Free', ticketsLeft: Math.floor(Math.random() * 200) + 100 },
    ];
    // Simulate slightly different availability based on date/temple
    if (date !== format(new Date(), 'yyyy-MM-dd') || templeId === 'shirdi') {
        return baseSlots.map(slot => ({
            ...slot,
            availability: Math.random() > 0.2 ? 'Available' : (Math.random() > 0.5 ? 'Filling Fast' : 'Full'),
            ticketsLeft: Math.floor(Math.random() * 300) + 50
        })).filter(slot => slot.availability !== 'Full' || Math.random() > 0.5); // Randomly remove some full slots
    }
    return baseSlots;
};

const mockVirtualPoojas = (templeId) => {
    const poojas = {
        'tirupati': [
            { id: 'ttd-archana', name: 'Archana Seva (Virtual)', description: 'Recitation of Lord\'s names.', price: 500, duration: '15 mins' },
            { id: 'ttd-kalyanam', name: 'Kalyanotsavam (Virtual)', description: 'Celestial wedding ceremony participation.', price: 1000, duration: '45 mins' },
        ],
        'shirdi': [
            { id: 'shirdi-abhishek', name: 'Abhishek Pooja (Virtual)', description: 'Sacred bathing ritual participation.', price: 750, duration: '30 mins' },
            { id: 'shirdi-satyanarayan', name: 'Satyanarayan Pooja (Virtual)', description: 'Story and worship of Lord Satyanarayan.', price: 1100, duration: '60 mins' },
        ]
        // Add other temples if needed
    };
    return poojas[templeId] || [];
};

const mockPrasadam = (templeId) => {
     const prasadam = {
        'tirupati': [
            { id: 'ttd-laddu', name: 'Tirupati Laddu (Large)', description: 'World-famous besan laddu.', price: 50, imageUrl: '/images/prasadam/tirupati_laddu.jpg', minQuantity: 1, maxQuantity: 10 },
            { id: 'ttd-vada', name: 'Tirupati Vada', description: 'Savory fried lentil snack.', price: 25, imageUrl: '/images/prasadam/tirupati_vada.jpg', minQuantity: 2, maxQuantity: 20 },
        ],
        'shirdi': [
            { id: 'shirdi-packet', name: 'Shirdi Prasadam Packet', description: 'Includes Udi, sweets, and sugar crystals.', price: 100, imageUrl: '/images/prasadam/shirdi_packet.jpg', minQuantity: 1, maxQuantity: 5 },
        ],
        'vaishno-devi': [
            { id: 'vd-prasad', name: 'Vaishno Devi Prasad', description: 'Dry fruits and Mishri.', price: 150, imageUrl: '/images/prasadam/vaishno_devi_prasad.jpg', minQuantity: 1, maxQuantity: 5 },
        ]
        // Add other temples if needed
    };
    return prasadam[templeId] || [];
};


module.exports = {
    getMockDarshanSlots: mockDarshanSlots,
    getMockVirtualPoojas: mockVirtualPoojas,
    getMockPrasadam: mockPrasadam,
    // Add other mock data functions here
};

    