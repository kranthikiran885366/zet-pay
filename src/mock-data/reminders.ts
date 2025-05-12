
import { addDays } from 'date-fns';

export interface BillReminder {
    id: string;
    billerName: string;
    dueDate: string; // ISO string format
    amount?: number;
    notes?: string;
    category: string;
    isPaid?: boolean;
}

export const REMINDER_CATEGORIES = ["Utilities", "Finance", "Subscription", "Rent", "Insurance", "Loan", "Other"];

export const mockRemindersData: BillReminder[] = [
    { id: 'rem1', billerName: 'Airtel Postpaid', dueDate: addDays(new Date(), 5).toISOString(), amount: 799, category: 'Utilities', isPaid: false },
    { id: 'rem2', billerName: 'HDFC Credit Card', dueDate: addDays(new Date(), 12).toISOString(), category: 'Finance', isPaid: false },
    { id: 'rem3', billerName: 'Netflix Subscription', dueDate: addDays(new Date(), -2).toISOString(), amount: 499, category: 'Subscription', isPaid: true },
];

export interface SipReminder {
    id: string;
    fundName: string;
    sipAmount: number;
    sipDate: number; // Day of the month (1-28)
    frequency: 'Monthly' | 'Quarterly';
    nextDueDate?: Date; // Calculated
}

export const mockSipRemindersData: SipReminder[] = [
    { id: 'sip1', fundName: 'Axis Bluechip Fund', sipAmount: 5000, sipDate: 5, frequency: 'Monthly' },
    { id: 'sip2', fundName: 'Parag Parikh Flexi Cap', sipAmount: 10000, sipDate: 15, frequency: 'Monthly' },
];
