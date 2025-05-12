
import type { DarshanSlot } from '@/app/(features)/temple/darshan/page';
import type { PoojaDetails } from '@/app/(features)/temple/pooja/page.tsx';
import type { PrasadamItem } from '@/app/(features)/temple/prasadam/page.tsx';
import type { TempleEvent } from '@/app/(features)/temple/events/page.tsx';
import type { Accommodation } from '@/app/(features)/temple/accommodation/page.tsx';
import type { AudioTrack } from '@/app/(features)/temple/audio/page.tsx';
import type { TempleInfo } from '@/app/(features)/temple/info/page.tsx';
import { addDays } from 'date-fns';


export const mockTemplesData = [
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)', requiresApproval: true, bookingFee: 500 },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust', requiresApproval: true, bookingFee: 200 },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board', requiresApproval: false, bookingFee: 0 },
    { id: 'sabarimala', name: 'Sabarimala Temple' },
    { id: 'ram-mandir', name: 'Shri Ram Janmabhoomi Teerth Kshetra (Ayodhya)'},
];

export const mockDarshanSlotsPageData: { [key: string]: DarshanSlot[] } = {
    'tirupati-2024-08-15': [ // Example specific date
        { time: '09:00 - 10:00', availability: 'Available', quota: 'Special Entry (₹300)', ticketsLeft: 150 },
        { time: '10:00 - 11:00', availability: 'Filling Fast', quota: 'Special Entry (₹300)', ticketsLeft: 30 },
    ],
     'shirdi-2024-08-16': [
        { time: '08:00 - 09:00', availability: 'Available', quota: 'General Queue', ticketsLeft: 200 },
    ],
};

export const mockPoojasData: { [templeId: string]: PoojaDetails[] } = {
    'tirupati': [
        { id: 'ttd-archana', name: 'Archana Seva (Virtual)', description: 'Recitation of Lord\'s names.', price: 500, duration: '15 mins' },
        { id: 'ttd-kalyanam', name: 'Kalyanotsavam (Virtual)', description: 'Celestial wedding ceremony participation.', price: 1000, duration: '45 mins' },
    ],
    'shirdi': [
        { id: 'shirdi-abhishek', name: 'Abhishek Pooja (Virtual)', description: 'Sacred bathing ritual participation.', price: 750, duration: '30 mins' },
        { id: 'shirdi-satyanarayan', name: 'Satyanarayan Pooja (Virtual)', description: 'Story and worship of Lord Satyanarayan.', price: 1100, duration: '60 mins' },
    ]
};

export const mockPrasadamDataPage: { [templeId: string]: PrasadamItem[] } = {
    'tirupati': [
        { id: 'ttd-laddu', name: 'Tirupati Laddu (Large)', description: 'World-famous besan laddu.', price: 50, imageUrl: '/images/prasadam/tirupati_laddu.jpg', minQuantity: 1, maxQuantity: 10 },
        { id: 'ttd-vada', name: 'Tirupati Vada', description: 'Savory fried lentil snack.', price: 25, imageUrl: '/images/prasadam/tirupati_vada.jpg', minQuantity: 2, maxQuantity: 20 },
    ],
    'shirdi': [
        { id: 'shirdi-packet', name: 'Shirdi Prasadam Packet', description: 'Includes Udi, sweets, and sugar crystals.', price: 100, imageUrl: '/images/prasadam/shirdi_packet.jpg', minQuantity: 1, maxQuantity: 5 },
    ],
};

export const mockTempleEventsData: TempleEvent[] = [
    {
        id: 'event1', name: 'Vaishno Devi Yatra Package', description: 'Guided pilgrimage tour including travel and accommodation.', location: 'Jammu & Kashmir', startDate: new Date(2024, 8, 10), endDate: new Date(2024, 8, 15), pricePerPerson: 15000, imageUrl: '/images/events/vaishno_devi_yatra.jpg', category: 'Yatra', bookingRequired: true, slotsAvailable: 50
    },
    {
        id: 'event2', name: 'Diwali Special Lakshmi Pooja at Tirupati', description: 'Participate in the grand Lakshmi Pooja during Diwali.', location: 'Tirupati', startDate: new Date(2024, 10, 1), endDate: new Date(2024, 10, 1), pricePerPerson: 1500, imageUrl: '/images/events/diwali_pooja.jpg', category: 'Special Pooja', bookingRequired: true, slotsAvailable: 100
    },
];

export const mockAccommodationsData: { [templeId: string]: Accommodation[] } = {
    'tirupati': [
        { id: 'ttd-accom1', name: 'Srinivasam Complex', type: 'Trust Accommodation', distance: '1km from Tirupati Rly Stn', priceRange: '₹200 - ₹1000', imageUrl: '/images/accom/tirupati_srinivasam.jpg', bookingLink: 'https://tirupatibalaji.ap.gov.in/', contact: 'TTD Call Center' },
        { id: 'ttd-accom2', name: 'Madhavam Guest House', type: 'Trust Accommodation', distance: 'Near Bus Stand', priceRange: '₹800 - ₹1500', imageUrl: '/images/accom/tirupati_madhavam.jpg', bookingLink: 'https://tirupatibalaji.ap.gov.in/' },
    ],
    'shirdi': [
        { id: 'shirdi-accom1', name: 'Sai Ashram Bhaktiniwas', type: 'Trust Accommodation', distance: '1km from Temple', priceRange: '₹100 - ₹500 (Dorm/Room)', imageUrl: '/images/accom/shirdi_sai_ashram.jpg', bookingLink: 'https://online.sai.org.in/' },
    ],
};

export const mockAudioTracksData: AudioTrack[] = [
    { id: 'aarti1', title: 'Om Jai Jagdish Hare', artist: 'Various Artists', duration: 300, audioUrl: '/audio/om_jai_jagdish.mp3', category: 'Aarti', imageUrl: '/images/audio/aarti.jpg' },
    { id: 'mantra1', title: 'Gayatri Mantra (108 times)', artist: 'Traditional Chanting', duration: 900, audioUrl: '/audio/gayatri_mantra.mp3', category: 'Mantra', imageUrl: '/images/audio/mantra.jpg' },
];

export const mockTempleInfoData: { [templeId: string]: TempleInfo } = {
    'tirupati': {
        timings: [
            { day: 'Daily', darshan: '03:00 AM - 11:30 PM (Varies)', general: 'Open 24 hours (Queue Complex)' },
        ],
        queueStatus: {
            compartmentsFull: 18,
            estimatedWaitTime: 'Approx. 8-10 hours',
            lastUpdated: '11:15 AM IST',
        },
        specialNotes: [
            'Special entry darshan (₹300) queue has shorter wait times.',
            'Ensure you follow the dress code.',
        ]
    },
    'shirdi': {
         timings: [
            { day: 'Daily', darshan: '04:00 AM - 11:00 PM', general: 'Open 24 hours' },
        ],
        queueStatus: {
            compartmentsFull: 0,
            estimatedWaitTime: 'Approx. 1-2 hours (General Queue)',
            lastUpdated: '11:00 AM IST',
        },
    }
};
