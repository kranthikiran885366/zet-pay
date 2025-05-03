/**
 * @fileOverview Service functions for managing transaction history.
 */

import type { DateRange } from "react-day-picker";

// Interface matching the one in history page
export interface Transaction {
  id: string;
  type: 'Sent' | 'Received' | 'Recharge' | 'Bill Payment' | 'Failed' | 'Refund' | 'Cashback';
  name: string; // Payee/Payer/Service name
  description: string; // e.g., Mobile Number, Bill type, reason
  amount: number; // Positive for received/refunds/cashback, negative for sent/payments
  date: Date;
  status: 'Completed' | 'Pending' | 'Failed';
  avatarSeed: string; // For generating consistent mock avatars
  upiId?: string; // Optional UPI ID involved
  billerId?: string; // Optional biller ID for recharge/bills
}

// Mock data (can be expanded)
const mockTransactions: Transaction[] = [
    { id: 'tx1', type: 'Sent', name: "Alice Smith", description: "Dinner", amount: -50.00, date: new Date(2024, 6, 21, 19, 30), status: 'Completed', avatarSeed: 'alice', upiId: 'alice@payfriend' },
    { id: 'tx2', type: 'Received', name: "Bob Johnson", description: "Project Payment", amount: 200.00, date: new Date(2024, 6, 20, 10, 0), status: 'Completed', avatarSeed: 'bob', upiId: 'bob@okbank' },
    { id: 'tx3', type: 'Recharge', name: "Mobile Recharge", description: "+919876543210", amount: -99.00, date: new Date(2024, 6, 20, 15, 0), status: 'Completed', avatarSeed: 'recharge', billerId: 'airtel-prepaid' },
    { id: 'tx4', type: 'Bill Payment', name: "Electricity Bill", description: "Consumer #12345", amount: -1250.50, date: new Date(2024, 6, 19, 11, 0), status: 'Completed', avatarSeed: 'electricity', billerId: 'bescom' },
    { id: 'tx5', type: 'Sent', name: "Charlie Brown", description: "Coffee", amount: -15.00, date: new Date(2024, 6, 18, 9, 0), status: 'Pending', avatarSeed: 'charlie', upiId: 'charlie@paytm' },
    { id: 'tx6', type: 'Failed', name: "David Williams", description: "Transfer Failed - Insufficient Funds", amount: -100.00, date: new Date(2024, 6, 17, 14, 0), status: 'Failed', avatarSeed: 'david', upiId: 'david.w@ybl' },
    { id: 'tx7', type: 'Received', name: "Eve Davis", description: "Refund for Order #123", amount: 30.00, date: new Date(2024, 6, 16, 16, 0), status: 'Completed', avatarSeed: 'eve' },
    { id: 'tx8', type: 'Bill Payment', name: "Water Bill", description: "Conn #W54321", amount: -350.00, date: new Date(2024, 6, 15, 10, 0), status: 'Completed', avatarSeed: 'water', billerId: 'bwssb'},
    { id: 'tx9', type: 'Cashback', name: "Offer Cashback", description: "Electricity Bill Offer", amount: 50.00, date: new Date(2024, 6, 19, 11, 5), status: 'Completed', avatarSeed: 'cashback'},
    { id: 'tx10', type: 'Sent', name: "Alice Smith", description: "Movie Tickets", amount: -250.00, date: new Date(2024, 6, 10, 20, 0), status: 'Completed', avatarSeed: 'alice', upiId: 'alice@payfriend' },
].sort((a, b) => b.date.getTime() - a.date.getTime()); // Ensure sorted by date descending initially


export interface TransactionFilters {
    type?: string; // 'all', 'sent', 'received', etc.
    status?: string; // 'all', 'completed', 'pending', 'failed'
    dateRange?: DateRange;
    searchTerm?: string; // Search by name, description, amount, upiId
}

/**
 * Asynchronously retrieves the transaction history, optionally filtered.
 *
 * @param filters Optional filters for transaction type, status, date range, and search term.
 * @returns A promise that resolves to an array of Transaction objects.
 */
export async function getTransactionHistory(filters?: TransactionFilters): Promise<Transaction[]> {
    console.log("Fetching transaction history with filters:", filters);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    let results = mockTransactions;

    if (filters) {
        // Filter by Type
        if (filters.type && filters.type !== 'all') {
          // Handle combined types if needed, e.g., 'payments' = 'recharge' + 'billpayment'
          // Simple matching for now:
          results = results.filter(tx => tx.type.toLowerCase().replace(/ /g, '') === filters.type);
        }

        // Filter by Status
        if (filters.status && filters.status !== 'all') {
          results = results.filter(tx => tx.status.toLowerCase() === filters.status);
        }

        // Filter by Date Range
        if (filters.dateRange?.from) {
            const fromDate = new Date(filters.dateRange.from);
            fromDate.setHours(0, 0, 0, 0); // Start of the day
            results = results.filter(tx => tx.date >= fromDate);
        }
         if (filters.dateRange?.to) {
            const toDate = new Date(filters.dateRange.to);
            toDate.setHours(23, 59, 59, 999); // End of the day
            results = results.filter(tx => tx.date <= toDate);
        }

        // Filter by Search Term
        if (filters.searchTerm) {
            const lowerSearchTerm = filters.searchTerm.toLowerCase();
            results = results.filter(tx =>
                tx.name.toLowerCase().includes(lowerSearchTerm) ||
                tx.description.toLowerCase().includes(lowerSearchTerm) ||
                tx.amount.toString().includes(lowerSearchTerm) ||
                tx.upiId?.toLowerCase().includes(lowerSearchTerm) ||
                tx.billerId?.toLowerCase().includes(lowerSearchTerm) ||
                tx.id.toLowerCase().includes(lowerSearchTerm)
            );
        }
    }

    // Return already sorted mock data (by date descending) after filtering
    return results;
}

/**
 * Adds a new transaction to the mock history.
 * In a real app, this would likely happen server-side after a payment.
 * This is primarily for simulation purposes.
 *
 * @param transaction The transaction details to add.
 */
export function addTransaction(transaction: Omit<Transaction, 'id' | 'date' | 'avatarSeed'>): Transaction {
    console.log("Adding transaction:", transaction);
    const newTransaction: Transaction = {
        ...transaction,
        id: `txn_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        date: new Date(),
        avatarSeed: transaction.name.toLowerCase().replace(/\s+/g, '') || 'default', // Generate seed from name
    };
    mockTransactions.unshift(newTransaction); // Add to beginning (newest)
    return newTransaction;
}
