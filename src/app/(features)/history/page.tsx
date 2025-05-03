
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"; // Import Input for search
import { ArrowLeft, Filter, Calendar as CalendarIcon, ArrowUpDown, CheckCircle, XCircle, Clock, Loader2, Search } from 'lucide-react'; // Added Loader2 and Search
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { getTransactionHistory, Transaction, TransactionFilters } from '@/services/transactions'; // Use the new service
import { useToast } from '@/hooks/use-toast'; // Import useToast

const statusIcons = {
  Completed: <CheckCircle className="h-4 w-4 text-green-600" />,
  Pending: <Clock className="h-4 w-4 text-yellow-600" />,
  Failed: <XCircle className="h-4 w-4 text-destructive" />,
};

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}


export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchTerm, setSearchTerm] = useState<string>(''); // Add search term state
  const { toast } = useToast(); // Initialize useToast


   // Fetch transactions based on filters
   const fetchTransactions = useCallback(async (filters: TransactionFilters, sort: 'newest' | 'oldest') => {
    setIsLoading(true);
    try {
      let fetchedTransactions = await getTransactionHistory(filters);

      // Client-side sorting (API could also handle this)
      fetchedTransactions.sort((a, b) => {
            if (sort === 'newest') {
                return b.date.getTime() - a.date.getTime();
            } else {
                return a.date.getTime() - b.date.getTime();
            }
       });

      setTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Failed to fetch transaction history:", error);
       toast({
            variant: "destructive",
            title: "Error Loading History",
            description: "Could not fetch transaction data. Please try again later.",
       });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Add toast to dependency array

  // Debounced search fetch
  const debouncedFetchTransactions = useCallback(debounce(fetchTransactions, 300), [fetchTransactions]);


  // Apply filters and sorting whenever dependencies change
  useEffect(() => {
     const filters: TransactionFilters = {
         type: filterType !== 'all' ? filterType : undefined,
         status: filterStatus !== 'all' ? filterStatus : undefined,
         dateRange: dateRange,
         searchTerm: searchTerm || undefined,
     };
     // Use debounced fetch only for search term changes
     if (searchTerm) {
        debouncedFetchTransactions(filters, sortOrder);
     } else {
        fetchTransactions(filters, sortOrder);
     }
  }, [filterType, filterStatus, dateRange, sortOrder, searchTerm, fetchTransactions, debouncedFetchTransactions]);


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

  const groupedTransactions = groupTransactionsByDate(transactions);

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
                className="pl-8 w-full h-9" // Adjust padding for icon
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
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="recharge">Recharge</SelectItem>
                    <SelectItem value="billpayment">Bill Payment</SelectItem>
                     <SelectItem value="refund">Refund</SelectItem>
                     <SelectItem value="cashback">Cashback</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
             </Select>

             {/* Status Filter */}
             <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
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
                    numberOfMonths={1} // Show 1 month for simplicity on mobile
                  />
                </PopoverContent>
              </Popover>

             {/* Sort Toggle */}
             <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')} className="h-9 w-full sm:w-auto">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
            </Button>

            {/* Clear Filters Button */}
             <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs w-full sm:w-auto">
               Clear Filters
             </Button>
        </div>
      </div>

      {/* Transaction List */}
      <main className="flex-grow p-4 space-y-4">
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
                           <div className="flex items-center gap-3 overflow-hidden"> {/* Added overflow-hidden */}
                             <Avatar className="h-9 w-9 flex-shrink-0">
                               <AvatarImage src={`https://picsum.photos/seed/${tx.avatarSeed}/40/40`} alt={tx.name} data-ai-hint="transaction related avatar"/>
                               <AvatarFallback>{tx.name.charAt(0)}</AvatarFallback>
                             </Avatar>
                             <div className="flex-grow overflow-hidden"> {/* Added overflow-hidden */}
                               <p className="text-sm font-medium text-foreground truncate">{tx.name}</p> {/* Added truncate */}
                               <p className="text-xs text-muted-foreground truncate">{tx.description} <span className="text-xs">· {format(tx.date, "p")}</span></p> {/* Added truncate */}

                             </div>
                           </div>
                            <div className="text-right flex-shrink-0 ml-2"> {/* Added flex-shrink-0 and ml-2 */}
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
