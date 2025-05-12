
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Briefcase, TrendingUp, PlusCircle, Search, Loader2, Info, MinusCircle } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { mockFundsData, mockFundDetailsData, mockPortfolioData, mockPortfolioSummaryData, Fund, FundDetails, PortfolioSummary, Holding } from '@/mock-data'; // Import centralized mock data

export default function MutualFundsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Fund[]>([]);
    const [selectedFund, setSelectedFund] = useState<FundDetails | null>(null);
    const [investmentType, setInvestmentType] = useState<'Lumpsum' | 'SIP'>('Lumpsum');
    const [amount, setAmount] = useState('');
    const [sipFrequency, setSipFrequency] = useState<'Monthly' | 'Quarterly'>('Monthly');
    const [sipDate, setSipDate] = useState<number>(5);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFundDetails, setShowFundDetails] = useState(false);
    const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

    const { toast } = useToast();

    useEffect(() => {
        const fetchPortfolio = async () => {
            setIsLoadingPortfolio(true);
            try {
                 await new Promise(resolve => setTimeout(resolve, 1200));
                 setPortfolioSummary(mockPortfolioSummaryData);
                 setHoldings(mockPortfolioData);
            } catch (error) {
                 console.error("Failed to fetch portfolio:", error);
                 toast({ variant: "destructive", title: "Error fetching portfolio" });
            } finally {
                 setIsLoadingPortfolio(false);
            }
        };
        fetchPortfolio();
    }, [toast]);

    useEffect(() => {
        if (searchQuery.length > 2) {
            setIsLoading(true);
            setTimeout(() => {
                setSearchResults(mockFundsData.filter(fund => fund.name.toLowerCase().includes(searchQuery.toLowerCase())));
                setIsLoading(false);
            }, 500);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleSelectFund = async (fund: Fund) => {
        setIsLoading(true);
        setShowFundDetails(true);
        setSelectedFund(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            const details = mockFundDetailsData[fund.fundId];
            if (details) {
                setSelectedFund({ ...fund, ...details });
            } else {
                toast({ variant: "destructive", title: "Could not load fund details" });
                 setShowFundDetails(false);
            }
        } catch (error) {
            console.error("Failed to fetch fund details:", error);
            toast({ variant: "destructive", title: "Could not load fund details" });
             setShowFundDetails(false);
        } finally {
            setIsLoading(false);
             setSearchResults([]);
             setSearchQuery(fund.name);
        }
    };

    const handleInvest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFund || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Please select a fund and enter a valid amount." });
            return;
        }
        if (investmentType === 'Lumpsum' && Number(amount) < selectedFund.minInvestment) {
             toast({ variant: "destructive", title: "Amount Too Low", description: `Minimum lumpsum investment is ₹${selectedFund.minInvestment}.` });
            return;
        }
         if (investmentType === 'SIP' && Number(amount) < selectedFund.minSip) {
             toast({ variant: "destructive", title: "Amount Too Low", description: `Minimum SIP amount is ₹${selectedFund.minSip}.` });
            return;
        }

        setIsProcessing(true);
        const investmentData = {
            fundId: selectedFund.fundId,
            amount: Number(amount),
            investmentType,
            sipFrequency: investmentType === 'SIP' ? sipFrequency : undefined,
            sipDate: investmentType === 'SIP' ? sipDate : undefined,
            paymentMethod: 'wallet'
        };
        console.log("Submitting Investment:", investmentData);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Investment Successful!", description: `${investmentType} order placed for ₹${amount} in ${selectedFund.name}.` });
            setAmount('');
            setSelectedFund(null);
            setShowFundDetails(false);
            setSearchQuery('');
             setIsLoadingPortfolio(true);
             setTimeout(() => {
                setPortfolioSummary(prev => prev ? ({ ...prev, totalInvestment: prev.totalInvestment + Number(amount)}) : null);
                setIsLoadingPortfolio(false);
            }, 1000);
        } catch (error: any) {
            console.error("Investment failed:", error);
            toast({ variant: "destructive", title: "Investment Failed", description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (value: number | undefined): string => {
        if (value === undefined || value === null) return '₹ -';
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const formatPercentage = (value: number | undefined): string => {
        if (value === undefined || value === null) return '- %';
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    }

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Briefcase className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Mutual Funds</h1>
                <Link href="/investments/portfolio" passHref className="ml-auto">
                  <Button variant="secondary" size="sm" className="bg-primary/80 text-xs h-8">My Portfolio</Button>
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">

                <Card className="shadow-md">
                     <CardHeader>
                         <CardTitle className="text-base">Portfolio Summary</CardTitle>
                     </CardHeader>
                     <CardContent>
                         {isLoadingPortfolio ? (
                             <div className="grid grid-cols-3 gap-4 text-center">
                                 <Skeleton className="h-12 w-full" />
                                 <Skeleton className="h-12 w-full" />
                                 <Skeleton className="h-12 w-full" />
                             </div>
                         ) : portfolioSummary ? (
                             <div className="grid grid-cols-3 gap-2 text-center">
                                 <div>
                                     <p className="text-xs text-muted-foreground">Invested</p>
                                     <p className="font-semibold">{formatCurrency(portfolioSummary.totalInvestment)}</p>
                                 </div>
                                 <div>
                                     <p className="text-xs text-muted-foreground">Current Value</p>
                                     <p className="font-semibold">{formatCurrency(portfolioSummary.currentValue)}</p>
                                 </div>
                                 <div>
                                     <p className="text-xs text-muted-foreground">P&L</p>
                                     <p className={`font-semibold ${portfolioSummary.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(portfolioSummary.profitLoss)} ({formatPercentage(portfolioSummary.profitLossPercentage)})
                                     </p>
                                 </div>
                             </div>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center">No portfolio data available.</p>
                         )}
                     </CardContent>
                 </Card>

                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Explore & Invest</CardTitle>
                        <CardDescription>Search for funds or start investing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative mb-4">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search mutual funds (e.g., Axis Bluechip, Small Cap)"
                                value={searchQuery}
                                onChange={(e) => {setSearchQuery(e.target.value); setShowFundDetails(false);}}
                                className="pl-8"
                            />
                        </div>

                        {isLoading && searchQuery && <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>}
                        {searchResults.length > 0 && !showFundDetails && (
                            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                                {searchResults.map(fund => (
                                    <div key={fund.fundId} className="p-2 hover:bg-accent rounded cursor-pointer flex justify-between items-center" onClick={() => handleSelectFund(fund)}>
                                        <div>
                                            <p className="text-sm font-medium">{fund.name}</p>
                                            <p className="text-xs text-muted-foreground">{fund.category} • {fund.risk} Risk • {fund.rating}★</p>
                                        </div>
                                        <PlusCircle className="h-5 w-5 text-primary"/>
                                    </div>
                                ))}
                            </div>
                        )}

                         {showFundDetails && (
                             isLoading ? (
                                <div className="mt-4 space-y-3">
                                    <Skeleton className="h-6 w-3/4"/>
                                    <Skeleton className="h-4 w-1/2"/>
                                    <Skeleton className="h-20 w-full"/>
                                </div>
                             ) : selectedFund ? (
                                <form onSubmit={handleInvest} className="mt-4 pt-4 border-t space-y-4">
                                     <h3 className="font-semibold">{selectedFund.name}</h3>
                                     <div className="grid grid-cols-2 gap-4 text-xs">
                                         <div><span className="text-muted-foreground">Category:</span> {selectedFund.category}</div>
                                         <div><span className="text-muted-foreground">Risk:</span> {selectedFund.risk}</div>
                                         <div><span className="text-muted-foreground">NAV:</span> ₹{selectedFund.nav}</div>
                                         <div><span className="text-muted-foreground">1Y Return:</span> {selectedFund.returns['1Y']}%</div>
                                         <div><span className="text-muted-foreground">Min Lumpsum:</span> ₹{selectedFund.minInvestment}</div>
                                          <div><span className="text-muted-foreground">Min SIP:</span> ₹{selectedFund.minSip}</div>
                                     </div>
                                     <Separator/>
                                     <div className="flex gap-2">
                                         <Button type="button" variant={investmentType === 'Lumpsum' ? 'default' : 'outline'} onClick={() => setInvestmentType('Lumpsum')} className="flex-1">Lumpsum</Button>
                                         <Button type="button" variant={investmentType === 'SIP' ? 'default' : 'outline'} onClick={() => setInvestmentType('SIP')} className="flex-1">SIP</Button>
                                     </div>

                                     <div className="space-y-1">
                                         <Label htmlFor="amount">Amount (₹)</Label>
                                          <Input id="amount" type="number" placeholder={`Min ₹${investmentType === 'SIP' ? selectedFund.minSip : selectedFund.minInvestment}`} value={amount} onChange={e => setAmount(e.target.value)} required min={investmentType === 'SIP' ? selectedFund.minSip : selectedFund.minInvestment} />
                                     </div>

                                     {investmentType === 'SIP' && (
                                         <div className="grid grid-cols-2 gap-4">
                                             <div className="space-y-1">
                                                  <Label htmlFor="sipFrequency">Frequency</Label>
                                                 <Select value={sipFrequency} onValueChange={(v) => setSipFrequency(v as 'Monthly' | 'Quarterly')} required>
                                                     <SelectTrigger id="sipFrequency"><SelectValue /></SelectTrigger>
                                                     <SelectContent>
                                                         <SelectItem value="Monthly">Monthly</SelectItem>
                                                         <SelectItem value="Quarterly">Quarterly</SelectItem>
                                                     </SelectContent>
                                                 </Select>
                                             </div>
                                             <div className="space-y-1">
                                                  <Label htmlFor="sipDate">SIP Date</Label>
                                                  <Select value={String(sipDate)} onValueChange={(v) => setSipDate(Number(v))} required>
                                                     <SelectTrigger id="sipDate"><SelectValue /></SelectTrigger>
                                                      <SelectContent>
                                                        {[1, 5, 10, 15, 20, 25].map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                                                     </SelectContent>
                                                 </Select>
                                             </div>
                                         </div>
                                     )}

                                      <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                        {isProcessing ? 'Processing...' : `Invest ${investmentType}`}
                                    </Button>
                                      <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => {setShowFundDetails(false); setSelectedFund(null); setSearchQuery('')}}>Cancel</Button>
                                </form>
                             ) : null
                         )}
                    </CardContent>
                </Card>

                 <Card className="shadow-md">
                     <CardHeader>
                         <CardTitle className="text-base">Your Investments</CardTitle>
                     </CardHeader>
                     <CardContent>
                         {isLoadingPortfolio ? (
                            <div className="space-y-2">
                                 <Skeleton className="h-10 w-full"/>
                                 <Skeleton className="h-10 w-full"/>
                            </div>
                         ) : holdings.length === 0 ? (
                             <p className="text-sm text-muted-foreground text-center">You haven't invested in any funds yet.</p>
                         ) : (
                            <div className="space-y-3">
                                {holdings.map(holding => (
                                     <Card key={holding.fundId} className="p-3 border shadow-none">
                                         <p className="text-sm font-medium">{holding.fundName}</p>
                                         <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1">
                                             <div><span className="text-muted-foreground">Invested:</span> {formatCurrency(holding.investedAmount)}</div>
                                             <div><span className="text-muted-foreground">Current:</span> {formatCurrency(holding.currentValue)}</div>
                                             <div><span className="text-muted-foreground">Units:</span> {holding.units.toFixed(4)}</div>
                                              <div className={`font-medium ${holding.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                 <span className="text-muted-foreground">P&L:</span> {formatCurrency(holding.profitLoss)}
                                             </div>
                                         </div>
                                         <div className="flex gap-2 mt-2">
                                             <Button size="xs" variant="outline">Invest More</Button>
                                             <Button size="xs" variant="destructiveOutline">Redeem / Sell</Button>
                                         </div>
                                     </Card>
                                ))}
                            </div>
                         )}
                     </CardContent>
                 </Card>
            </main>
        </div>
    );
}
