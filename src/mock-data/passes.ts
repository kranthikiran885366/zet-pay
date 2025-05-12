
import type { BusPass, PurchasedPass } from '@/app/(features)/passes/bus/page'; // Assuming types are defined here
import { addDays } from 'date-fns';

export const mockCitiesBusPass: string[] = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai'];
export const mockOperatorsBusPass: { [city: string]: string[] } = {
    'Bangalore': ['BMTC', 'KSRTC City'],
    'Mumbai': ['BEST', 'NMMT'],
    'Delhi': ['DTC'],
    'Chennai': ['MTC'],
};

export const mockPassTypesData: { [operator: string]: BusPass[] } = {
    'BMTC': [
        { id: 'bmtc-daily', name: 'Daily Pass', price: 70, duration: '1 Day', description: 'Unlimited travel on non-AC buses for one day.', category: 'General' },
        { id: 'bmtc-monthly-nonac', name: 'Monthly Pass (Non-AC)', price: 1050, duration: '1 Month', description: 'Unlimited travel on non-AC buses for one month.', category: 'General' },
        { id: 'bmtc-student-monthly', name: 'Student Monthly Pass', price: 200, duration: '1 Month', description: 'Concessional travel for students (Non-AC). Requires validation.', category: 'Student' },
    ],
    'BEST': [
        { id: 'best-daily', name: 'Daily Pass', price: 50, duration: '1 Day', description: 'Unlimited travel within city limits.', category: 'General' },
        { id: 'best-student-quarterly', name: 'Student Quarterly Pass', price: 300, duration: '3 Months', description: 'Concessional travel for students. Requires validation.', category: 'Student' },
    ],
};

export const mockPurchasedPassesData: PurchasedPass[] = [
    {
        passId: 'bmtc-monthly-nonac',
        purchaseId: 'pur123',
        operatorName: 'BMTC',
        operatorLogo: '/logos/bmtc.png',
        passName: 'Monthly Pass (Non-AC)',
        passengerName: 'Chandra Sekhar',
        passengerPhotoUrl: 'https://picsum.photos/seed/user/100/100',
        validFrom: new Date(2024, 6, 1),
        validUntil: new Date(2024, 6, 31),
        status: 'Active',
        qrCodeData: 'BMTC_PASS_1234567890_ACTIVE',
        downloadUrl: '/api/download/pass/pur123'
    },
    {
        passId: 'best-student-quarterly',
        purchaseId: 'pur456',
        operatorName: 'BEST',
        operatorLogo: '/logos/best.png',
        passName: 'Student Quarterly Pass',
        passengerName: 'Test Student',
        passengerPhotoUrl: 'https://picsum.photos/seed/student/100/100',
        validFrom: new Date(2024, 5, 15),
        validUntil: new Date(2024, 8, 14),
        status: 'Pending Verification',
    },
];
