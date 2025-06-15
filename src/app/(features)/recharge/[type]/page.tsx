'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Smartphone, Tv, Bolt, RefreshCw, Loader2, Search, Info, BadgePercent, Star, GitCompareArrows, CalendarClock, Wallet, Clock, Users, ShieldCheck, Gift, LifeBuoy, HelpCircle, Pencil, AlertTriangle, X, RadioTower, UserPlus, CalendarDays, Wifi, FileText, MoreHorizontal, Ban, HardDrive, Ticket, TramFront, Play, AlarmClockOff } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller, RechargePlan, processRecharge, scheduleRecharge, checkActivationStatus, cancelRechargeService, getRechargePlans } from '@/services/recharge';
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, addDays, differenceInMinutes, differenceInDays, isValid, isBefore } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';
import { mockBillersData, mockRechargePlansData, mockDthPlansData, mockDataCardPlansData, mockMobileQuickActions } from '@/mock-data';
import type { Transaction } from '@/services/types';
import { auth } from '@/lib/firebase';

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const rechargeTypeDetails: { [key: string]: { icon: React.ElementType; title: string; identifierLabel: string; searchPlaceholder: string; recentLabel: string, billerTypeForAPI: string } } = {
  mobile: { icon: Smartphone, title: "Mobile Recharge", identifierLabel: "Mobile Number", searchPlaceholder: "Enter mobile number or name", recentLabel: "Recents & Contacts", billerTypeForAPI: "Mobile"},
  dth: { icon: Tv, title: "DTH Recharge", identifierLabel: "DTH Subscriber ID", searchPlaceholder: "Enter Customer ID or Mobile No.", recentLabel: "Recent DTH Providers", billerTypeForAPI: "Dth"},
  electricity: { icon: Bolt, title: "Electricity Bill", identifierLabel: "Consumer Number", searchPlaceholder: "Enter Consumer Number", recentLabel: "Recent Billers", billerTypeForAPI: "Electricity" },
  fastag: { icon: RadioTower, title: "FASTag Recharge", identifierLabel: "Vehicle Number", searchPlaceholder: "Enter Vehicle Number (e.g. KA01AB1234)", recentLabel: "Recent FASTag Providers", billerTypeForAPI: "Fastag"},
  datacard: { icon: HardDrive, title: "Data Card Recharge", identifierLabel: "Data Card Number", searchPlaceholder: "Enter Data Card Number", recentLabel: "Recent Providers", billerTypeForAPI: "Datacard" },
  buspass: { icon: Ticket, title: "Bus Pass", identifierLabel: "Pass ID / Registered Mobile", searchPlaceholder: "Enter Pass ID or Mobile", recentLabel: "Recent Passes", billerTypeForAPI: "Buspass"},
  metro: { icon: TramFront, title: "Metro Recharge", identifierLabel: "Metro Card Number", searchPlaceholder: "Enter Card Number", recentLabel: "Recent Metros", billerTypeForAPI: "Metro"},
};


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

export default function RechargePage() {
  const params = useParams();
  const router = useRouter();
  let rechargePageType = 'mobile';
  if (typeof params.type === 'string' && rechargeTypeDetails[params.type]) {
    rechargePageType = params.type;
  } else if (Array.isArray(params.type) && rechargeTypeDetails[params.type[0]]) {
    rechargePageType = params.type[0];
  }

  const [billers, setBillers] = useState<Biller[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<string>('');
  const [selectedBillerName, setSelectedBillerName] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [detectedOperator, setDetectedOperator] = useState<Biller | null>(null);
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingBillers, setIsLoadingBillers] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isManualOperatorSelect, setIsManualOperatorSelect] = useState(false);
  const [rechargePlans, setRechargePlans] = useState<RechargePlan[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planSearchTerm, setPlanSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [plansToCompare, setPlansToCompare] = useState<RechargePlan[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState<RechargePlan | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduleFrequency, setScheduleFrequency] = useState<'monthly' | 'weekly' | undefined>();
  const [isScheduling, setIsScheduling] = useState(false);
  const [checkingActivationTxnId, setCheckingActivationTxnId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'upi' | 'card'>('wallet');

  const { toast } = useToast();
  const details = rechargeTypeDetails[rechargePageType] || rechargeTypeDetails.mobile;
  const inputRef = useRef<HTMLInputElement>(null);

  const detectMobileOperator = useCallback(async () => {
    if (!identifier || !identifier.match(/^[6-9]\d{9}$/)) return;
    setIsDetecting(true);
    setDetectedOperator(null);
    setDetectedRegion(null);
    setIsManualOperatorSelect(false);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      let mockOperator: Biller | undefined;
      if (identifier.startsWith('98') || identifier.startsWith('99')) mockOperator = billers.find(b => b.billerName.toLowerCase().includes('airtel'));
      else if (identifier.startsWith('70') || identifier.startsWith('80')) mockOperator = billers.find(b => b.billerName.toLowerCase().includes('jio'));
      else if (identifier.startsWith('91') || identifier.startsWith('92')) mockOperator = billers.find(b => b.billerName.toLowerCase().includes('vi'));
      else mockOperator = billers[0];
      const mockRegion = "Karnataka";
      if (mockOperator) {
        setDetectedOperator(mockOperator);
        setDetectedRegion(mockRegion);
        setSelectedBiller(mockOperator.billerId);
        toast({ title: "Operator & Region Detected", description: `${mockOperator.billerName} - ${mockRegion}` });
      } else {
        throw new Error("Could not determine operator from current biller list.");
      }
    } catch (error) {
      console.error("Failed to detect mobile operator/region:", error);
      toast({ variant: "destructive", title: "Detection Failed", description: "Could not detect operator/region. Please select manually." });
      setIsManualOperatorSelect(true);
    } finally {
      setIsDetecting(false);
    }
  }, [identifier, billers, toast]);

  useEffect(() => {
    async function fetchBillersData() {
      if (!details.billerTypeForAPI) {
        setIsLoadingBillers(false);
        setBillers(mockBillersData[details.billerTypeForAPI] || []);
        return;
      }
      setIsLoadingBillers(true);
      setError(null);
      try {
        const fetchedBillers = await getBillers(details.billerTypeForAPI);
        setBillers(fetchedBillers.length > 0 ? fetchedBillers : (mockBillersData[details.billerTypeForAPI] || []));
      } catch (err: any) {
        setError('Failed to load operators. Please try again.');
        setBillers(mockBillersData[details.billerTypeForAPI] || []);
        toast({ variant: "destructive", title: "Could not load operators" });
        console.error(err);
      } finally {
        setIsLoadingBillers(false);
      }
    }
    fetchBillersData();
  }, [details.billerTypeForAPI, toast]);

  useEffect(() => {
     if (rechargePageType === 'mobile' && identifier.match(/^[6-9]\d{9}$/) && !selectedBiller && !isManualOperatorSelect) {
       detectMobileOperator();
     }
     const isMobileInvalid = rechargePageType === 'mobile' && identifier && !identifier.match(/^[6-9]\d{9}$/);
     if (isMobileInvalid || !identifier) {
        setDetectedOperator(null);
        setDetectedRegion(null);
        setRechargePlans([]);
     }
   }, [identifier, rechargePageType, isManualOperatorSelect, billers, detectMobileOperator, selectedBiller]);

  const fetchRechargePlans = useCallback(async () => {
    const billerToFetch = selectedBiller || detectedOperator?.billerId;
    if (!billerToFetch) return;
    setIsPlanLoading(true);
    setRechargePlans([]);
    try {
      const fetchedPlans = await getRechargePlans(billerToFetch, rechargePageType, identifier);
      setRechargePlans(fetchedPlans.length > 0 ? fetchedPlans : (rechargePageType === 'mobile' ? mockRechargePlansData : rechargePageType === 'dth' ? mockDthPlansData : rechargePageType === 'datacard' ? mockDataCardPlansData : []));
      if (fetchedPlans.length === 0) toast({description: "No plans found from provider, showing common plans."})
    } catch (error) {
      console.error("Failed to fetch recharge plans:", error);
      toast({ variant: "destructive", title: "Could not load recharge plans" });
      setRechargePlans(rechargePageType === 'mobile' ? mockRechargePlansData : rechargePageType === 'dth' ? mockDthPlansData : rechargePageType === 'datacard' ? mockDataCardPlansData : []);
    } finally {
      setIsPlanLoading(false);
    }
  }, [selectedBiller, detectedOperator?.billerId, rechargePageType, identifier, toast]);

  useEffect(() => {
    if (selectedBiller || detectedOperator) {
      const biller = billers.find(b => b.billerId === selectedBiller) || detectedOperator;
      setSelectedBillerName(biller?.billerName || '');
      if (['mobile', 'dth', 'datacard'].includes(rechargePageType)) {
        fetchRechargePlans();
      } else {
        setRechargePlans([]);
      }
    } else {
      setRechargePlans([]);
      setSelectedBillerName('');
    }
  }, [selectedBiller, rechargePageType, billers, detectedOperator, fetchRechargePlans]);

  const handlePlanSelect = (plan: RechargePlan) => {
      setAmount(plan.price.toString());
      setSelectedPlan(plan);
      toast({ title: `Plan Selected: ${plan.category ? `(${plan.category}) ` : ''}₹${plan.price}`, description: plan.description });
      setIsCompareModalOpen(false);
      setShowTariffModal(null);
      document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiller && !detectedOperator) {
      toast({ variant: "destructive", title: "Operator Missing" }); return;
    }
    if (!identifier) {
      toast({ variant: "destructive", title: "Identifier Missing" }); return;
    }
    if (!amount || Number(amount) <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount" }); return;
    }
    setError(null);
    setIsLoading(true);
    const finalBillerId = selectedBiller || detectedOperator?.billerId;
    if (!finalBillerId) {
        toast({ variant: "destructive", title: "Operator Error", description: "Operator could not be determined."});
        setIsLoading(false);
        return;
    }
    try {
        const result = await processRecharge(rechargePageType, identifier, Number(amount), finalBillerId, selectedPlan?.planId, couponCode, paymentMethod);
        toast({ title: `Recharge ${result.status}`, description: `Recharge for ${identifier} of ₹${amount} is ${result.status.toLowerCase()}. Txn ID: ${result.id}` });
        if (result.status === 'Completed' || result.status === 'Processing Activation') {
             setAmount(''); setSelectedPlan(null); setCouponCode('');
             if(result.status === 'Processing Activation' && result.id) pollActivationStatus(result.id);
        } else {
             throw new Error(result.description || `Recharge ${result.status || 'Failed'}`);
        }
    } catch (err: any) {
         console.error("Recharge failed:", err);
         setError(err.message || "Recharge failed. Please try again.");
         toast({ variant: "destructive", title: "Recharge Failed", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const pollActivationStatus = async (txnId: string) => {
    setCheckingActivationTxnId(txnId);
    let attempts = 0; const maxAttempts = 5; const intervalTime = 5000;
    const check = async () => {
      attempts++;
      try {
        const statusResult = await checkActivationStatus(txnId);
        toast({ description: `Activation status for ${txnId}: ${statusResult}` });
        if (statusResult === 'Completed') {
          toast({ title: "Activation Complete", description: `Recharge ${txnId} is now active.` });
          setCheckingActivationTxnId(null);
        } else if (statusResult === 'Failed') {
          toast({ variant: "destructive", title: "Activation Failed", description: `Recharge ${txnId} failed to activate.` });
          setCheckingActivationTxnId(null);
        } else if (attempts < maxAttempts) {
          setTimeout(check, intervalTime);
        } else {
          toast({ title: "Activation Pending", description: `Activation for ${txnId} is still processing. Please check history later for final status.` });
          setCheckingActivationTxnId(null);
        }
      } catch (error) {
        console.error("Error checking activation status:", error);
        toast({ variant: "destructive", title: "Status Check Error", description: "Could not verify activation status." });
        setCheckingActivationTxnId(null);
      }
    };
    setTimeout(check, intervalTime);
  };

   const { filteredPlansByCategory, planCategories } = useMemo(() => {
     let plans = rechargePlans;
     if (planSearchTerm) {
       const lowerSearch = planSearchTerm.toLowerCase();
       plans = plans.filter(plan =>
         plan.description.toLowerCase().includes(lowerSearch) ||
         plan.price.toString().includes(lowerSearch) ||
         plan.category?.toLowerCase().includes(lowerSearch) ||
         plan.validity?.toLowerCase().includes(lowerSearch) ||
         plan.data?.toLowerCase().includes(lowerSearch) ||
         (plan.talktime && `₹${plan.talktime}`.includes(lowerSearch)) ||
         (typeof plan.channels === 'string' && plan.channels.toLowerCase().includes(lowerSearch)) ||
         (typeof plan.channels === 'number' && plan.channels.toString().includes(lowerSearch))
       );
     }
     const baseCategories = rechargePageType === 'mobile'
         ? ['Popular', 'Data', 'Unlimited', 'Talktime', 'SMS', 'Roaming', 'Annual', 'Top-up']
         : rechargePageType === 'dth'
         ? ['Recommended', 'Basic Packs', 'HD Packs', 'Premium Packs', 'Add-Ons', 'Top-Up Packs']
         : rechargePageType === 'datacard'
         ? ['Monthly', 'Work From Home', 'Add-On', 'Annual']
         : [];
     let dynamicCategories = [...baseCategories];
     const grouped = plans.reduce((acc, plan) => {
         let category = plan.category || 'Other';
          if (rechargePageType === 'mobile' && plan.isOffer) category = 'Offers';
         if (!acc[category]) acc[category] = [];
         acc[category].push(plan);
         return acc;
     }, {} as Record<string, RechargePlan[]>);
      if (rechargePageType === 'mobile' && grouped['Offers'] && !dynamicCategories.includes('Offers')) dynamicCategories.unshift('Offers');
     let finalCategories = dynamicCategories.filter(cat => grouped[cat]?.length > 0);
     if (grouped['Other']?.length > 0 && !finalCategories.includes('Other')) finalCategories.push('Other');
     if(planSearchTerm && plans.length > 0) return { filteredPlansByCategory: { "Search Results": plans } , planCategories: ["Search Results"] };
     if (finalCategories.length === 0 && Object.keys(grouped).length > 0 && !planSearchTerm) {
         finalCategories = ["All Plans"];
         grouped["All Plans"] = rechargePlans;
     }
     if (Object.keys(grouped).length === 0 && !isPlanLoading && !planSearchTerm) return { filteredPlansByCategory: {}, planCategories: [] };
     return { filteredPlansByCategory: grouped, planCategories: finalCategories };
   }, [rechargePlans, planSearchTerm, isPlanLoading, rechargePageType]);

  const handleCompareCheckbox = (plan: RechargePlan, checked: boolean | 'indeterminate') => {
    if (checked === true) {
      if (plansToCompare.length < 3) setPlansToCompare([...plansToCompare, plan]);
      else toast({ variant: "destructive", title: "Limit Reached", description: "You can compare up to 3 plans." });
    } else {
      setPlansToCompare(plansToCompare.filter(p => p.planId !== plan.planId));
    }
  };

  const openCompareModal = () => {
    if (plansToCompare.length < 2) { toast({ description: "Select at least 2 plans to compare." }); return; }
    setIsCompareModalOpen(true);
  };

  const openTariffModal = (plan: RechargePlan) => setShowTariffModal(plan);

   const handleScheduleRecharge = async () => {
     if (!identifier || !amount || (!selectedBiller && !detectedOperator) || !scheduleFrequency || !scheduledDate) {
       toast({ variant: 'destructive', title: 'Missing Details', description: 'Please fill identifier, amount, operator, date, and frequency to schedule.' }); return;
     }
     const finalBillerId = selectedBiller || detectedOperator?.billerId;
     if (!finalBillerId) { toast({ variant: 'destructive', title: 'Operator Error', description: 'Operator could not be determined.'}); return; }
     setIsScheduling(true);
     try {
       const result = await scheduleRecharge(rechargePageType, identifier, Number(amount), scheduleFrequency, scheduledDate, finalBillerId, selectedPlan?.planId);
       if (result.success) {
         toast({ title: 'Recharge Scheduled', description: `Recharge for ${identifier} scheduled ${scheduleFrequency} starting ${format(scheduledDate, 'PPP')}. Schedule ID: ${result.scheduleId}` });
         setScheduledDate(undefined); setScheduleFrequency(undefined);
       } else {
         throw new Error(result.message || 'Failed to schedule recharge');
       }
     } catch (error: any) {
       console.error('Scheduling failed:', error);
       toast({ variant: 'destructive', title: 'Scheduling Failed', description: error.message || 'Could not schedule recharge.' });
     } finally {
       setIsScheduling(false);
     }
   };

   const handleApplyCoupon = () => {
       if (couponCode.trim()) toast({ title: "Coupon Applied (Simulated)", description: `Coupon "${couponCode}" applied. Discount will reflect at payment if valid.` });
       else toast({ variant: "destructive", title: "No Coupon Code", description: "Please enter a coupon code to apply." });
   };

    const handleCancelRecharge = async (transactionId: string) => {
        setIsCancelling(transactionId);
        try {
            const result = await cancelRechargeService(transactionId);
            if (result.success) toast({ title: "Cancellation Requested", description: result.message || "Your recharge cancellation request is being processed." });
            else throw new Error(result.message || "Cancellation not possible.");
        } catch (error: any) {
            console.error("Cancellation failed:", error);
            toast({ variant: "destructive", title: "Cancellation Failed", description: error.message });
        } finally {
            setIsCancelling(null);
        }
    }

  const operatorLogoUrl = useMemo(() => {
      const operator = detectedOperator || billers.find(b => b.billerId === selectedBiller);
       if (!operator || !operator.billerName) return '/logos/default-operator.png';
       return operator.logoUrl || `/logos/${operator.billerName.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/gi, '')}.png`;
  }, [detectedOperator, selectedBiller, billers]);

  const handleManualEditOperator = () => {
     setIsManualOperatorSelect(true); setDetectedOperator(null); setDetectedRegion(null);
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <details.icon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">{details.title}</h1>
        <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={ isManualOperatorSelect ? undefined : (rechargePageType === 'mobile' ? detectMobileOperator : undefined )} disabled={isDetecting || isManualOperatorSelect || !identifier}>
             {isDetecting ? <Loader2 className="h-5 w-5 animate-spin"/> : <RefreshCw className="h-5 w-5"/>}
        </Button>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => alert('Help Clicked!')}>
          <HelpCircle className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-grow p-4 space-y-4 pb-20">
            <Card className="shadow-md">
                <CardContent className="p-4 space-y-4">
                    <Input
                        id="identifier"
                        type={rechargePageType === 'mobile' ? 'tel' : 'text'}
                        placeholder={details.searchPlaceholder}
                        ref={inputRef}
                        pattern={rechargePageType === 'mobile' ? '[0-9]{10}' : undefined}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        className="text-base h-11"
                    />
                </CardContent>
            </Card>

            {identifier && (
                <Card className="shadow-md">
                    <CardContent className="p-4">
                        {isDetecting ? (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Detecting operator...
                            </div>
                        ) : detectedOperator && !isManualOperatorSelect ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Image src={operatorLogoUrl} alt={detectedOperator.billerName} width={32} height={32} className="h-8 w-8 rounded-full object-contain border bg-white p-0.5" data-ai-hint="operator logo small"/>
                                    <div>
                                        <p className="text-sm font-medium">{detectedOperator.billerName}</p>
                                        {rechargePageType === 'mobile' && <p className="text-xs text-muted-foreground">{detectedRegion || "Region"} | Prepaid</p>}
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={handleManualEditOperator}>
                                    <Pencil className="h-3 w-3 mr-1" /> Edit
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="biller-manual">Select Operator</Label>
                                <Select value={selectedBiller} onValueChange={setSelectedBiller} required>
                                    <SelectTrigger id="biller-manual">
                                        <SelectValue placeholder={isLoadingBillers ? "Loading..." : (billers.length === 0 ? "No operators" : "Select Operator")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {billers.map((biller) => (
                                            <SelectItem key={biller.billerId} value={biller.billerId}>
                                                {biller.logoUrl && <Image src={biller.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain" data-ai-hint="operator logo small"/>}
                                                {biller.billerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {error && error.includes("operators") && <p className="text-xs text-destructive">{error}</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {(selectedBiller || detectedOperator) && ['mobile', 'dth', 'datacard'].includes(rechargePageType) && (
                    <Card className="shadow-md">
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between flex-wrap gap-2">
                                <div>
                                    <CardTitle className="text-md flex items-center gap-1">Browse Plans</CardTitle>
                                </div>
                                {plansToCompare.length >= 2 && (
                                    <Button variant="secondary" size="sm" onClick={openCompareModal} className="h-7 px-2 text-xs">
                                        <GitCompareArrows className="mr-1 h-3 w-3"/> Compare ({plansToCompare.length})
                                    </Button>
                                )}
                            </div>
                            <Input
                                type="search"
                                placeholder="Search plans (e.g., unlimited, 599, data, HD)"
                                value={planSearchTerm}
                                onChange={(e) => setPlanSearchTerm(e.target.value)}
                                className="mt-2 h-9"
                            />
                        </CardHeader>
                        <CardContent className="pt-2">
                            {isPlanLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <p className="ml-2 text-sm text-muted-foreground">
                                    Loading plans for {selectedBillerName || detectedOperator?.billerName}...
                                </p>
                            </div>
                            ) : planCategories.length === 0 && rechargePlans.length > 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No plans found matching your search in these categories.</p>
                            ) : rechargePlans.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No plans available for {selectedBillerName || detectedOperator?.billerName}.</p>
                            ) : (
                            <Tabs defaultValue={planCategories[0]} className="w-full">
                                <ScrollArea className="w-full pb-3">
                                    <TabsList className="flex w-max mb-4">
                                        {planCategories.map(category => (
                                            <TabsTrigger key={category} value={category} className="text-xs px-3 h-8 flex-shrink-0">
                                                {category}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                                {planCategories.map(category => (
                                    <TabsContent key={category} value={category} className="mt-0 space-y-2">
                                        {filteredPlansByCategory[category]?.map(plan => (
                                        <Card key={plan.planId} className={cn("p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50", selectedPlan?.planId === plan.planId ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border')} onClick={() => handlePlanSelect(plan)}>
                                            <div className="flex justify-between items-start gap-2">
                                                <div><p className="font-bold text-lg">₹{plan.price}</p></div>
                                            </div>
                                            <p className="text-sm mt-1 text-muted-foreground">{plan.description}</p>
                                            <div className="text-xs mt-2 text-muted-foreground flex items-start justify-between flex-wrap gap-x-4 gap-y-1">
                                                    <div>
                                                        <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Validity: {plan.validity}</div>
                                                        {plan.data && <div className="flex items-center gap-1"><Smartphone className="h-3 w-3"/> Data: {plan.data}</div>}
                                                    </div>
                                                    <Button variant="link" size="xs" className="p-0 h-auto text-xs" onClick={(e) => { e.stopPropagation(); openTariffModal(plan); }}>View Details</Button>
                                            </div>
                                            <div className="mt-2">
                                                <Checkbox id={`compare-${plan.planId}`} checked={plansToCompare.some(p => p.planId === plan.planId)} onCheckedChange={(checked) => handleCompareCheckbox(plan, checked as boolean)} disabled={plansToCompare.length >= 3 && !plansToCompare.some(p => p.planId === plan.planId)} aria-label={`Compare ${plan.description}`} onClick={(e) => e.stopPropagation()}/>
                                                <Label htmlFor={`compare-${plan.planId}`} className="text-xs ml-1 align-middle text-muted-foreground cursor-pointer" onClick={(e) => e.stopPropagation()}>Compare</Label>
                                            </div>
                                        </Card>
                                        ))}
                                        {filteredPlansByCategory[category]?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No plans in this category.</p>}
                                    </TabsContent>
                                ))}
                            </Tabs>
                            )}
                        </CardContent>
                    </Card>
                )}

            <Card className="shadow-md">
                    <CardContent className="p-4">
                        <Label htmlFor="amount" className="text-sm font-medium text-muted-foreground">Or Enter Recharge Amount</Label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-lg">₹</span>
                            <Input id="amount" type="number" placeholder="Amount" value={amount} onChange={(e) => {setAmount(e.target.value); setSelectedPlan(null);}} required={!selectedPlan} min="1" step="0.01" className="pl-7 text-lg font-semibold h-11" disabled={(!selectedBiller && !detectedOperator) && !identifier}/>
                        </div>
                    </CardContent>
            </Card>

            <Card className="shadow-md">
                    <Accordion type="single" collapsible>
                        <AccordionItem value="schedule">
                            <AccordionTrigger className="px-4 py-3 text-sm font-medium">Schedule Recharge (Optional)</AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <Label htmlFor="schedule-date" className="text-xs">Start Date</Label>
                                        <Popover><PopoverTrigger asChild><Button id="schedule-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 mt-1 text-xs",!scheduledDate && "text-muted-foreground")}><CalendarDays className="mr-2 h-4 w-4" />{scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date < new Date("1900-01-01")}/></PopoverContent></Popover>
                                    </div>
                                    <div>
                                        <Label htmlFor="schedule-frequency" className="text-xs">Frequency</Label>
                                        <Select value={scheduleFrequency} onValueChange={(value) => setScheduleFrequency(value as 'monthly' | 'weekly')}><SelectTrigger id="schedule-frequency" className="h-9 mt-1 text-xs"><SelectValue placeholder="Select Frequency" /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent></Select>
                                    </div>
                                </div>
                                <Button variant="secondary" className="w-full h-9 text-sm" onClick={handleScheduleRecharge} disabled={!scheduledDate || !scheduleFrequency || isScheduling || !identifier || !amount || Number(amount) <= 0 || (!selectedBiller && !detectedOperator)}>
                                    {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />} Schedule Recharge
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
            </Card>

            <Card className="shadow-md" id="payment-section">
                <CardContent className="p-4 space-y-4">
                    <div className="relative">
                        <Input id="coupon" placeholder="Enter Coupon Code (Optional)" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="pr-16 h-10"/>
                        <Button variant="link" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-auto px-2 text-xs" onClick={handleApplyCoupon}>Apply</Button>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="paymentMethod" className="text-xs">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="wallet">Wallet</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="card">Card (Coming Soon)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="button" className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11 text-base" disabled={isLoading || !identifier || !amount || Number(amount) <= 0 || (!selectedBiller && !detectedOperator)} onClick={handleRecharge}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {`Proceed to Pay ₹${amount || '0'}`}
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
                <DialogContent className="sm:max-w-[90%] md:max-w-[600px]"><DialogHeader><DialogTitle>Compare Plans ({plansToCompare.length})</DialogTitle><DialogDescription>Compare selected plans.</DialogDescription></DialogHeader>
                    <div className={`grid gap-2 py-4 grid-cols-${plansToCompare.length === 2 ? '2' : '3'}`}>
                        {plansToCompare.map(plan => (<Card key={plan.planId} className="flex flex-col text-xs shadow-none border"><CardHeader className="p-2 bg-muted/50"><CardTitle className="text-sm font-semibold">₹{plan.price}</CardTitle><CardDescription className="text-xs h-8 overflow-hidden">{plan.description}</CardDescription>{plan.isOffer && <Badge variant="destructive" className="mt-1 w-fit">Offer</Badge>}</CardHeader><CardContent className="p-2 space-y-1 flex-grow"><p><strong>Validity:</strong> {plan.validity || 'N/A'}</p>{plan.data && <p><strong>Data:</strong> {plan.data || 'N/A'}</p>}{typeof plan.channels === 'string' && <p><strong>Channels:</strong> {plan.channels || 'N/A'}</p>}{typeof plan.channels === 'number' && <p><strong>Channels:</strong> {plan.channels}</p>}{plan.talktime !== undefined && <p><strong>Talktime:</strong> {plan.talktime === -1 ? 'UL' : `₹${plan.talktime}`}</p>}{plan.sms !== undefined && <p><strong>SMS:</strong> {plan.sms === -1 ? 'UL' : plan.sms}</p>}{plan.category && <p><strong>Category:</strong> {plan.category}</p>}</CardContent><Button variant="default" size="sm" className="m-2 mt-auto h-7 text-xs" onClick={() => handlePlanSelect(plan)}>Select Plan</Button></Card>))}
                    </div><DialogFooter className="sm:justify-between"><Button variant="ghost" size="sm" onClick={() => { setPlansToCompare([]); setIsCompareModalOpen(false);}}>Clear</Button><DialogClose asChild><Button size="sm">Close</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!showTariffModal} onOpenChange={() => setShowTariffModal(null)}>
                <DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Tariff: ₹{showTariffModal?.price}</DialogTitle><DialogDescription>{showTariffModal?.description}</DialogDescription>{showTariffModal?.isOffer && <Badge variant="destructive" className="mt-1 w-fit">Offer!</Badge>}</DialogHeader>
                    <div className="py-4 text-sm space-y-2"><p><strong>Price:</strong> ₹{showTariffModal?.price}</p><p><strong>Validity:</strong> {showTariffModal?.validity || 'N/A'}</p>{showTariffModal?.data && <p><strong>Data:</strong> {showTariffModal?.data || 'N/A'}</p>}{typeof showTariffModal?.channels === 'string' && <p><strong>Channels:</strong> {showTariffModal.channels || 'N/A'}</p>}{typeof showTariffModal?.channels === 'number' && <p><strong>Channels:</strong> {showTariffModal.channels}</p>}{showTariffModal?.talktime !== undefined && <p><strong>Talktime:</strong> {showTariffModal.talktime === -1 ? 'Unlimited' : `₹${showTariffModal.talktime}`}</p>}{showTariffModal?.sms !== undefined && <p><strong>SMS:</strong> {showTariffModal.sms === -1 ? 'Unlimited' : showTariffModal.sms}</p>}{showTariffModal?.category && <p><strong>Category:</strong> {showTariffModal?.category}</p>}{showTariffModal?.category === 'Roaming' && <Alert variant="default" className="mt-2"><AlertTriangle className="h-4 w-4 text-orange-500" /><AlertDescription className="text-xs ml-6">International Roaming pack.</AlertDescription></Alert>}{showTariffModal?.category === 'Top-up' && <Alert variant="default" className="mt-2"><Info className="h-4 w-4 text-blue-500" /><AlertDescription className="text-xs ml-6">Talktime will be added to your main balance.</AlertDescription></Alert>}<p className="text-xs text-muted-foreground pt-2">Note: Benefits are subject to operator terms.</p></div>
                    <DialogFooter><Button variant="secondary" onClick={() => { if (showTariffModal) handlePlanSelect(showTariffModal);}}>Select Plan</Button><DialogClose asChild><Button>Close</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>
      </main>
    </div>
  );
}
