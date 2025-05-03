
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowLeft, Filter, Calendar as CalendarIcon, ArrowUpDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

// Mock Transaction Data (replace with actual API call)
interface Transaction {
  id: string;
  type: 'Sent' | 'Received' | 'Recharge' | 'Bill Payment' | 'Failed';
  name: string; // Payee/Payer/Service name
  description: string; // e.g., Mobile Number, Bill type
  amount: number; // Positive for received/refunds, negative for sent/payments
  date: Date;
  status: 'Completed' | 'Pending' | 'Failed';
  avatarSeed: string; // For generating consistent mock avatars
}

const mockTransactions: Transaction[] = [
  { id: 'tx1', type: 'Sent', name: "Alice Smith", description: "Dinner", amount: -50.00, date: new Date(2024, 6, 21, 19, 30), status: 'Completed', avatarSeed: 'alice' },
  { id: 'tx2', type: 'Received', name: "Bob Johnson", description: "Project Payment", amount: 200.00, date: new Date(2024, 6, 20, 10, 0), status: 'Completed', avatarSeed: 'bob' },
  { id: 'tx3', type: 'Recharge', name: "Mobile Recharge", description: "+919876543210", amount: -99.00, date: new Date(2024, 6, 20, 15, 0), status: 'Completed', avatarSeed: 'recharge' },
  { id: 'tx4', type: 'Bill Payment', name: "Electricity Bill", description: "Consumer #12345", amount: -1250.50, date: new Date(2024, 6, 19, 11, 0), status: 'Completed', avatarSeed: 'electricity' },
  { id: 'tx5', type: 'Sent', name: "Charlie Brown", description: "Coffee", amount: -15.00, date: new Date(2024, 6, 18, 9, 0), status: 'Pending', avatarSeed: 'charlie' },
  { id: 'tx6', type: 'Failed', name: "David Williams", description: "Transfer Failed", amount: -100.00, date: new Date(2024, 6, 17, 14, 0), status: 'Failed', avatarSeed: 'david' },
   { id: 'tx7', type: 'Received', name: "Eve Davis", description: "Refund", amount: 30.00, date: new Date(2024, 6, 16, 16, 0), status: 'Completed', avatarSeed: 'eve' },
   { id: 'tx8', type: 'Bill Payment', name: "Water Bill", description: "Conn #W54321", amount: -350.00, date: new Date(2024, 6, 15, 10, 0), status: 'Completed', avatarSeed: 'water' },
];

const statusIcons = {
  Completed: <CheckCircle className="h-4 w-4 text-green-600" />,
  Pending: <Clock className="h-4 w-4 text-yellow-600" />,
  Failed: <XCircle className="h-4 w-4 text-destructive" />,
};

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(mockTransactions);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Apply filters and sorting whenever dependencies change
  useEffect(() => {
    let result = transactions;

    // Filter by Type
    if (filterType !== 'all') {
      result = result.filter(tx => tx.type.toLowerCase().replace(' ', '') === filterType);
    }

    // Filter by Status
    if (filterStatus !== 'all') {
      result = result.filter(tx => tx.status.toLowerCase() === filterStatus);
    }

    // Filter by Date Range
    if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0); // Start of the day
        result = result.filter(tx => tx.date >= fromDate);
    }
     if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999); // End of the day
        result = result.filter(tx => tx.date <= toDate);
    }


    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.date.getTime() - a.date.getTime();
      } else {
        return a.date.getTime() - b.date.getTime();
      }
    });

    setFilteredTransactions(result);
  }, [transactions, filterType, filterStatus, dateRange, sortOrder]);


  // Group transactions by date (e.g., "Today", "Yesterday", "June 20, 2024")
   const groupTransactionsByDate = (txs: Transaction[]) => {
       const groups: { [key: string]: Transaction[] } = {};
       const today = new Date(); today.setHours(0,0,0,0);
       const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

       txs.forEach(tx => {
           const txDate = new Date(tx.date); txDate.setHours(0,0,0,0);
           let dateKey: string;

           if (txDate.getTime() === today.getTime()) {
               dateKey = "Today";
           } else if (txDate.getTime() === yesterday.getTime()) {
               dateKey = "Yesterday";
           } else {
               dateKey = format(tx.date, "MMMM d, yyyy");
           }

           if (!groups[dateKey]) {
               groups[dateKey] = [];
           }
           groups[dateKey].push(tx);
       });
       return groups;
   };

  const groupedFilteredTransactions = groupTransactionsByDate(filteredTransactions);

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Filter className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Transaction History</h1>
      </header>

      {/* Filter Bar */}
      <div className="p-4 bg-background border-b border-border space-y-2 md:space-y-0 md:flex md:gap-4 md:items-center">
         {/* Type Filter */}
         <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="recharge">Recharge</SelectItem>
                <SelectItem value="billpayment">Bill Payment</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
         </Select>

         {/* Status Filter */}
         <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
         </Select>

          {/* Date Range Picker */}
           <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full md:w-auto justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1} // Show 1 month for simplicity on mobile
              />
            </PopoverContent>
          </Popover>

         {/* Sort Toggle */}
         <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')} className="w-full md:w-auto">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
        </Button>

        {/* Clear Filters Button */}
         <Button variant="ghost" size="sm" onClick={() => { setFilterType('all'); setFilterStatus('all'); setDateRange(undefined); }} className="text-xs">
           Clear Filters
         </Button>
      </div>

      {/* Transaction List */}
      <main className="flex-grow p-4 space-y-4">
        {Object.keys(groupedFilteredTransactions).length === 0 && (
            <Card className="shadow-md text-center">
                <CardContent className="p-6">
                    <p className="text-muted-foreground">No transactions found matching your filters.</p>
                </CardContent>
            </Card>
        )}

         {Object.entries(groupedFilteredTransactions).map(([dateKey, txs]) => (
            <div key={dateKey}>
                 <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">{dateKey}</h2>
                 <Card className="shadow-md">
                    <CardContent className="p-0">
                        {txs.map((tx, index) => (
                         <div key={tx.id} className={`flex items-center justify-between p-3 ${index < txs.length - 1 ? 'border-b border-border' : ''}`}>
                           <div className="flex items-center gap-3">
                             <Avatar className="h-9 w-9">
                               <AvatarImage src={`https://picsum.photos/seed/${tx.avatarSeed}/40/40`} alt={tx.name} data-ai-hint="transaction related avatar"/>
                               <AvatarFallback>{tx.name.charAt(0)}</AvatarFallback>
                             </Avatar>
                             <div>
                               <p className="text-sm font-medium text-foreground">{tx.name}</p>
                               <p className="text-xs text-muted-foreground">{tx.description} <span className="text-xs">· {format(tx.date, "p")}</span></p>

                             </div>
                           </div>
                            <div className="text-right">
                               <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                 {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                               </p>
                                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                   {statusIcons[tx.status]}
                                   <span>{tx.status}</span>
                                </div>
                           </div>
                         </div>
                        ))}
                    </CardContent>
                 </Card>
            </div>
         ))}
      </main>
    </div>
  );
}
