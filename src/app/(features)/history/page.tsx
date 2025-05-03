'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input";
import { ArrowLeft, Filter, Calendar as CalendarIcon, ArrowUpDown, CheckCircle, XCircle, Clock, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { subscribeToTransactionHistory, Transaction, TransactionFilters } from '@/services/transactions'; // Use the Firestore service with subscription
import { useToast } from '@/hooks/use-toast';
import type { Unsubscribe } from 'firebase/firestore'; // Import Unsubscribe type

const statusIcons = {
  Completed: <CheckCircle className="h-4 w-4 text-green-600" />,
  Pending: <Clock className="h-4 w-4 text-yellow-600" />,
  Failed: <XCircle className="h-4 w-4 text-destructive" />,
  'Processing Activation': <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />,
};

export default function HistoryPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // Holds data from subscription
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { toast } = useToast();

  // Subscribe to real-time transaction updates
  useEffect(() => {
    setIsLoading(true);

    // Prepare filters (excluding search term for subscription)
    const filters: TransactionFilters = {
        type: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        dateRange: dateRange,
        // Search term will be applied client-side after receiving updates
    };

    const unsubscribe = subscribeToTransactionHistory(
      (transactions) => {
        // Apply client-side search filtering here before setting state
        let filteredTransactions = transactions;
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredTransactions = transactions.filter(tx =>
                tx.name.toLowerCase().includes(lowerSearchTerm) ||
                tx.description.toLowerCase().includes(lowerSearchTerm) ||
                tx.amount.toString().includes(lowerSearchTerm) ||
                tx.upiId?.toLowerCase().includes(lowerSearchTerm) ||
                tx.billerId?.toLowerCase().includes(lowerSearchTerm) ||
                tx.id.toLowerCase().includes(lowerSearchTerm)
            );
        }
        setAllTransactions(filteredTransactions);
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to subscribe to transaction history:", error);
        toast({
          variant: "destructive",
          title: "Error Loading History",
          description: "Could not load real-time transaction data. Please try again later.",
        });
        setIsLoading(false);
        setAllTransactions([]); // Clear data on error
      },
      filters // Pass filters (without search term) to subscription
      // Limit is handled by the subscription function if needed, or apply client-side
    );

    // Cleanup subscription on component unmount or when filters change
    return () => {
      if (unsubscribe) {
        console.log("Unsubscribing from transaction history");
        unsubscribe();
      }
    };
  }, [filterType, filterStatus, dateRange, toast, searchTerm]); // Re-subscribe if filters change (except sortOrder, handled client-side)


  // Apply client-side sorting
  const sortedTransactions = useMemo(() => {
    return [...allTransactions].sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.date.getTime() - a.date.getTime();
      } else {
        return a.date.getTime() - b.date.getTime();
      }
    });
  }, [allTransactions, sortOrder]);


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

  const groupedTransactions = groupTransactionsByDate(sortedTransactions);

   const clearFilters = () => {
        setFilterType('all');
        setFilterStatus('all');
        setDateRange(undefined);
        setSearchTerm('');
        setSortOrder('newest');
   }

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
      <div className="p-4 bg-background border-b border-border space-y-3 md:space-y-0 md:flex md:flex-wrap md:gap-3 md:items-center">
         {/* Search Input */}
         <div className="relative w-full md:w-auto md:flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search by name, amount, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full h-9"
            />
         </div>

         <div className="flex flex-wrap gap-2">
             {/* Type Filter */}
             <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Recharge">Recharge</SelectItem>
                    <SelectItem value="Bill Payment">Bill Payment</SelectItem>
                     <SelectItem value="Refund">Refund</SelectItem>
                     <SelectItem value="Cashback">Cashback</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
             </Select>

             {/* Status Filter */}
             <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                     <SelectItem value="Processing Activation">Processing Activation</SelectItem>
                </SelectContent>
             </Select>

              {/* Date Range Picker */}
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "h-9 w-full sm:w-auto justify-start text-left font-normal",
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
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>

             {/* Sort Toggle */}
             <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')} className="h-9 w-full sm:w-auto">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
            </Button>

             <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs w-full sm:w-auto">
               Clear Filters
             </Button>
        </div>
      </div>

      {/* Transaction List */}
      <main className="flex-grow p-4 space-y-4 pb-20"> {/* Added pb-20 */}
         {isLoading && (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
         )}

        {!isLoading && Object.keys(groupedTransactions).length === 0 && (
            <Card className="shadow-md text-center">
                <CardContent className="p-6">
                    <p className="text-muted-foreground">No transactions found matching your criteria.</p>
                     { (filterType !== 'all' || filterStatus !== 'all' || dateRange || searchTerm) && (
                        <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">Clear Filters</Button>
                     )}
                </CardContent>
            </Card>
        )}

         {!isLoading && Object.entries(groupedTransactions).map(([dateKey, txs]) => (
            <div key={dateKey}>
                 <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">{dateKey}</h2>
                 <Card className="shadow-md overflow-hidden">
                    <CardContent className="p-0 divide-y divide-border">
                        {txs.map((tx) => (
                         <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                           <div className="flex items-center gap-3 overflow-hidden">
                             <Avatar className="h-9 w-9 flex-shrink-0">
                               <AvatarImage src={`https://picsum.photos/seed/${tx.avatarSeed || tx.id}/40/40`} alt={tx.name} data-ai-hint="transaction related avatar"/>
                               <AvatarFallback>{tx.name?.charAt(0) || '?'}</AvatarFallback>
                             </Avatar>
                             <div className="flex-grow overflow-hidden">
                               <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                               <p className="text-xs text-muted-foreground truncate">{tx.description} <span className="text-xs">· {format(tx.date, "p")}</span></p>
                             </div>
                           </div>
                            <div className="text-right flex-shrink-0 ml-2">
                               <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                 {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                               </p>
                                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                   {statusIcons[tx.status as keyof typeof statusIcons] || <Clock className="h-4 w-4 text-muted-foreground" />}
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