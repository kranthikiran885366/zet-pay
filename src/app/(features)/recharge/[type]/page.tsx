'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Smartphone, Tv, Bolt, RefreshCw, Loader2, Search, Info, BadgePercent, Star, GitCompareArrows, CalendarClock, Wallet, Clock, Users, ShieldCheck, Gift, LifeBuoy, HelpCircle, Pencil, AlertTriangle, X, RadioTower, UserPlus, CalendarDays, Wifi, FileText, MoreHorizontal, Tv2, Lock, AlarmClockOff, Ban, HardDrive, Ticket, TramFront, Play } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller, RechargePlan, processRecharge, scheduleRecharge, checkActivationStatus, cancelRechargeService, getRechargePlans } from '@/services/recharge';
import { getContacts, Payee } from '@/services/contacts';
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, addDays, differenceInMinutes, differenceInDays, isValid, isBefore } from "date-fns"; // Added isBefore
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';
import { getWalletBalance } from '@/services/wallet';
import { getBankStatus } from '@/services/upi';
import { getTransactionHistory, Transaction, TransactionFilters } from '@/services/transactions';
import { auth } from '@/lib/firebase';
import { mockBillersData, mockRechargePlansData, mockDthPlansData, mockDataCardPlansData } from '@/mock-data';

// Helper to capitalize first letter
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// Map types to icons and titles
const rechargeTypeDetails: { [key: string]: { icon: React.ElementType; title: string; identifierLabel: string; searchPlaceholder: string; recentLabel: string, billerTypeForAPI: string } } = {
  mobile: { icon: Smartphone, title: "Mobile Recharge", identifierLabel: "Mobile Number", searchPlaceholder: "Enter mobile number or name", recentLabel: "Recents & Contacts", billerTypeForAPI: "Mobile"},
  dth: { icon: Tv, title: "DTH Recharge", identifierLabel: "DTH Subscriber ID", searchPlaceholder: "Enter Customer ID or Mobile No.", recentLabel: "Recent DTH Providers", billerTypeForAPI: "Dth"},
  electricity: { icon: Bolt, title: "Electricity Bill", identifierLabel: "Consumer Number", searchPlaceholder: "Enter Consumer Number", recentLabel: "Recent Billers", billerTypeForAPI: "Electricity" }, // Used for prepaid
  fastag: { icon: RadioTower, title: "FASTag Recharge", identifierLabel: "Vehicle Number", searchPlaceholder: "Enter Vehicle Number (e.g. KA01AB1234)", recentLabel: "Recent FASTag Providers", billerTypeForAPI: "Fastag"},
  datacard: { icon: HardDrive, title: "Data Card Recharge", identifierLabel: "Data Card Number", searchPlaceholder: "Enter Data Card Number", recentLabel: "Recent Providers", billerTypeForAPI: "Datacard" },
  buspass: { icon: Ticket, title: "Bus Pass", identifierLabel: "Pass ID / Registered Mobile", searchPlaceholder: "Enter Pass ID or Mobile", recentLabel: "Recent Passes", billerTypeForAPI: "Buspass"},
  metro: { icon: TramFront, title: "Metro Recharge", identifierLabel: "Metro Card Number", searchPlaceholder: "Enter Card Number", recentLabel: "Recent Metros", billerTypeForAPI: "Metro"},
};


const mockUsageHistory = {
    averageMonthlyDataUsageGB: 50,
    averageMonthlyCallsMinutes: 600,
    preferredPlanType: 'balanced' as const,
    budget: 300,
};
const mockCurrentPlan = {
    expiryDate: addDays(new Date(), 10),
    planName: "Active Plan: 2GB/Day",
};
const mockSavedNumbers: Payee[] = [
  { id: 'family1', name: 'Mom', identifier: '9876543210', type: 'mobile', avatarSeed: 'mom'},
  { id: 'family2', name: 'Dad', identifier: '9988776655', type: 'mobile', avatarSeed: 'dad'},
  { id: 'friend1', name: 'Alice', identifier: '9123456780', type: 'mobile', avatarSeed: 'alice'},
  { id: 'friend2', name: 'Bob', identifier: '9112233440', type: 'mobile', avatarSeed: 'bob'},
   { id: 'self', name: 'Self', identifier: '9876501234', type: 'mobile', avatarSeed: 'self'},
];
const mockRecentDthProviders: Biller[] = mockBillersData.Dth || [];


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
  const [isLoadingBillers, setIsLoadingBillers] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isManualOperatorSelect, setIsManualOperatorSelect] = useState(false);
  const [rechargePlans, setRechargePlans] = useState<RechargePlan[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planSearchTerm, setPlanSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [plansToCompare, setPlansToCompare] = useState<RechargePlan[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState<RechargePlan | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<Transaction[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduleFrequency, setScheduleFrequency] = useState<'monthly' | 'weekly' | undefined>();
  const [isScheduling, setIsScheduling] = useState(false);
  const [checkingActivationTxnId, setCheckingActivationTxnId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [bankStatus, setBankStatus] = useState<'Active' | 'Slow' | 'Down' | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const { toast } = useToast();

  const details = rechargeTypeDetails[rechargePageType] || rechargeTypeDetails.mobile;
  const inputRef = useRef<HTMLInputElement>(null);

  // Check login status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsLoggedIn(!!user);
      if (!user) {
        setIsLoadingBillers(false); 
        setIsBalanceLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

   useEffect(() => {
    if (isLoggedIn === null) return; 

    const fetchBalance = async () => {
      if (!isLoggedIn) {
        setAccountBalance(0);
        setIsBalanceLoading(false);
        return;
      }
      setIsBalanceLoading(true);
      try {
         const balance = await getWalletBalance();
         setAccountBalance(balance);
      } catch (err) {
        console.error("Failed to fetch wallet balance:", err);
        setAccountBalance(0); 
      } finally {
        setIsBalanceLoading(false);
      }
    };
    fetchBalance();
  }, [isLoggedIn]);


  useEffect(() => {
    if (isLoggedIn === null) return; 

    async function fetchBillersData() {
      if (!isLoggedIn || !details.billerTypeForAPI) {
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
        if (err.message === "User not authenticated.") {
            setError("Please log in to load operators.");
            setBillers(mockBillersData[details.billerTypeForAPI] || []);
        } else {
            setError('Failed to load operators. Please try again.');
            setBillers(mockBillersData[details.billerTypeForAPI] || []); 
            toast({ variant: "destructive", title: "Could not load operators" });
        }
        console.error(err);
      } finally {
        setIsLoadingBillers(false);
      }
    }
    fetchBillersData();
  }, [isLoggedIn, details.billerTypeForAPI, toast]);

   useEffect(() => {
     let shouldFetch = false;
     if (rechargePageType === 'mobile' && identifier.match(/^[6-9]\d{9}$/)) {
       shouldFetch = true;
     } else if (rechargePageType === 'dth' && identifier.length > 5) {
       shouldFetch = true;
     } else if (rechargePageType === 'fastag' && identifier.length > 10) {
        shouldFetch = true;
     } else if (rechargePageType === 'datacard' && identifier.length > 5) {
        shouldFetch = true;
     }

     if (shouldFetch && isLoggedIn) { 
       fetchHistory(identifier);
     } else {
       setRechargeHistory([]);
       setShowHistory(false);
     }
   }, [identifier, rechargePageType, isLoggedIn]);

   useEffect(() => {
     if (rechargePageType === 'mobile' && identifier.match(/^[6-9]\d{9}$/) && !selectedBiller && !isManualOperatorSelect) {
       detectMobileOperator();
     } else if (rechargePageType === 'dth' && identifier.length > 5 && !selectedBiller && !isManualOperatorSelect) {
        detectDthOperator();
     } else if (rechargePageType === 'fastag' && identifier.length > 10 && !selectedBiller && !isManualOperatorSelect) {
        detectFastagOperator();
     }

     const isMobileInvalid = rechargePageType === 'mobile' && identifier && !identifier.match(/^[6-9]\d{9}$/);
     const isDthInvalid = rechargePageType === 'dth' && identifier && identifier.length <= 5;
     const isFastagInvalid = rechargePageType === 'fastag' && identifier && identifier.length <= 10;

     if (isMobileInvalid || isDthInvalid || isFastagInvalid || !identifier) {
        setDetectedOperator(null);
        setDetectedRegion(null);
        setSelectedBiller('');
        setRechargePlans([]);
     }
   }, [identifier, rechargePageType, isManualOperatorSelect, billers, detectMobileOperator, detectDthOperator, detectFastagOperator]);

  useEffect(() => {
    if (selectedBiller) {
      const biller = billers.find(b => b.billerId === selectedBiller) || detectedOperator;
      setSelectedBillerName(biller?.billerName || '');
      if (['mobile', 'dth', 'fastag', 'datacard'].includes(rechargePageType)) {
        fetchRechargePlans();
      } else {
        setRechargePlans([]);
      }
       fetchBankStatusForBiller(selectedBiller); 
    } else {
      setRechargePlans([]);
      setSelectedBillerName('');
      setBankStatus(null);
    }
  }, [selectedBiller, rechargePageType, billers, detectedOperator]); 

    const fetchBankStatusForBiller = async (billerId: string) => {
      const mockBankIdentifierForBiller = billerId.includes('airtel') ? 'airtelbank' : billerId.includes('jio') ? 'jiopaymentsbank' : 'genericupi';
      try {
        const status = await getBankStatus(mockBankIdentifierForBiller);
        setBankStatus(status);
      } catch (error) {
        console.error("Failed to fetch bank status for biller:", error);
        setBankStatus(null); 
      }
    };

  const handlePlanSelect = (plan: RechargePlan) => {
      setAmount(plan.price.toString());
      setSelectedPlan(plan);
      toast({ title: `Plan Selected: ${plan.category ? `(${plan.category}) ` : ''}₹${plan.price}`, description: plan.description });
      setIsCompareModalOpen(false);
      setShowTariffModal(null);
      const paymentSection = document.getElementById('payment-section');
      paymentSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
        toast({ variant: "destructive", title: "Login Required", description: "Please log in to proceed." });
        return;
    }
    if (!selectedBiller && !detectedOperator) {
      setError("Please select an operator/provider or let it auto-detect.");
      toast({ variant: "destructive", title: "Operator Missing" });
      return;
    }
    if (!identifier) {
      setError(`Please enter a valid ${details.identifierLabel}.`);
      toast({ variant: "destructive", title: "Identifier Missing" });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount or select a plan.");
      toast({ variant: "destructive", title: "Invalid Amount" });
      return;
    }
     if (accountBalance !== null && Number(amount) > accountBalance) {
        setError(`Insufficient wallet balance (Available: ₹${accountBalance.toFixed(2)}). Please add funds or choose another payment method.`);
        toast({ variant: "destructive", title: "Insufficient Balance" });
        return;
    }
    if (bankStatus === 'Down') {
        setError(`The operator's payment system seems to be down. Please try again later or contact support.`);
        toast({ variant: "destructive", title: "Operator Server Down" });
        return;
    }


    setError(null);
    setIsLoading(true);
    const finalBillerId = selectedBiller || detectedOperator?.billerId;
    console.log("Processing recharge:", { type: rechargePageType, billerId: finalBillerId, identifier, amount, couponCode });

    try {
        if (!finalBillerId) {
            throw new Error("Operator/Biller ID is undefined. Cannot proceed.");
        }
        const result = await processRecharge(rechargePageType, identifier, Number(amount), finalBillerId, selectedPlan?.planId, couponCode);
        toast({ title: `Recharge ${result.status}`, description: `Recharge for ${identifier} of ₹${amount} is ${result.status.toLowerCase()}. Txn ID: ${result.id}` });
        if (result.status === 'Completed' || result.status === 'Processing Activation') {
             setAmount('');
             setSelectedPlan(null);
             setCouponCode('');
             fetchHistory(identifier);
             if(result.status === 'Processing Activation' && result.id) {
                pollActivationStatus(result.id);
             }
        } else {
             throw new Error(`Recharge ${result.status || 'Failed'}`);
        }
    } catch (err: any) {
         console.error("Recharge failed:", err);
         setError(err.message || "Recharge failed. Please try again.");
         toast({ variant: "destructive", title: "Recharge Failed", description: err.message || "Please check details and try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const pollActivationStatus = async (txnId: string) => {
    setCheckingActivationTxnId(txnId);
    let attempts = 0;
    const maxAttempts = 5; 
    const intervalTime = 5000; 

    const check = async () => {
      attempts++;
      try {
        const status = await checkActivationStatus(txnId);
        toast({ description: `Activation status for ${txnId}: ${status}` });
        if (status === 'Completed') {
          toast({ title: "Activation Complete", description: `Recharge ${txnId} is now active.` });
          setCheckingActivationTxnId(null);
          fetchHistory(identifier); 
        } else if (status === 'Failed') {
          toast({ variant: "destructive", title: "Activation Failed", description: `Recharge ${txnId} failed to activate.` });
          setCheckingActivationTxnId(null);
          fetchHistory(identifier);
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


  const fetchRechargePlans = async () => {
    const billerToFetch = selectedBiller || detectedOperator?.billerId;
    if (!billerToFetch) return;

    setIsPlanLoading(true);
    setRechargePlans([]); 
    try {
      console.log(`Fetching plans for ${selectedBillerName || detectedOperator?.billerName} (${billerToFetch}) - Type: ${rechargePageType}`);
      const fetchedPlans = await getRechargePlans(billerToFetch, rechargePageType, identifier);
      if (fetchedPlans && fetchedPlans.length > 0) {
        setRechargePlans(fetchedPlans);
      } else {
         if (rechargePageType === 'mobile') setRechargePlans(mockRechargePlansData);
         else if (rechargePageType === 'dth') setRechargePlans(mockDthPlansData);
         else if (rechargePageType === 'datacard') setRechargePlans(mockDataCardPlansData);
         else setRechargePlans([]); 
         if (fetchedPlans.length === 0) toast({description: "No plans found from provider, showing common plans."})
      }
    } catch (error) {
      console.error("Failed to fetch recharge plans:", error);
      toast({ variant: "destructive", title: "Could not load recharge plans" });
      if (rechargePageType === 'mobile') setRechargePlans(mockRechargePlansData);
      else if (rechargePageType === 'dth') setRechargePlans(mockDthPlansData);
      else if (rechargePageType === 'datacard') setRechargePlans(mockDataCardPlansData);
      else setRechargePlans([]);
    } finally {
      setIsPlanLoading(false);
    }
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
          if (rechargePageType === 'mobile') {
            if (plan.isOffer) category = 'Offers'; 
          }
         if (!acc[category]) acc[category] = [];
         acc[category].push(plan);
         return acc;
     }, {} as Record<string, RechargePlan[]>);

      if (rechargePageType === 'mobile') {
         if (grouped['Offers'] && !dynamicCategories.includes('Offers')) {
            dynamicCategories.unshift('Offers');
         }
      }

     let finalCategories = dynamicCategories.filter(cat => grouped[cat]?.length > 0);
     if (grouped['Other']?.length > 0 && !finalCategories.includes('Other')) {
        finalCategories.push('Other');
     }

     if(planSearchTerm && plans.length > 0) {
         return { filteredPlansByCategory: { "Search Results": plans } , planCategories: ["Search Results"] };
     }
     if (finalCategories.length === 0 && Object.keys(grouped).length > 0 && !planSearchTerm) {
         finalCategories = ["All Plans"];
         grouped["All Plans"] = rechargePlans;
     }

     if (Object.keys(grouped).length === 0 && !isPlanLoading && !planSearchTerm) { 
         return { filteredPlansByCategory: {}, planCategories: [] };
     }

     return { filteredPlansByCategory: grouped, planCategories: finalCategories };
   }, [rechargePlans, planSearchTerm, isPlanLoading, rechargePageType]);

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

  const detectDthOperator = useCallback(async () => {
     if (!identifier || identifier.length <= 5) return;
     setIsDetecting(true);
     setDetectedOperator(null);
     setDetectedRegion(null);
     setIsManualOperatorSelect(false);
     try {
       await new Promise(resolve => setTimeout(resolve, 800));
       let mockOperator: Biller | undefined;
       if (identifier.startsWith('1')) mockOperator = billers.find(b => b.billerId === 'tata-play');
       else if (identifier.startsWith('2')) mockOperator = billers.find(b => b.billerId === 'dish-tv');
       else if (identifier.startsWith('3')) mockOperator = billers.find(b => b.billerId === 'airtel-dth');
       else mockOperator = billers.find(b => b.billerId === 'd2h');

       if (mockOperator) {
         setDetectedOperator(mockOperator);
         setSelectedBiller(mockOperator.billerId);
         toast({ title: "DTH Operator Detected", description: `${mockOperator.billerName}` });
       } else {
         throw new Error("Could not determine DTH operator from current biller list.");
       }
     } catch (error) {
       console.error("Failed to detect DTH operator:", error);
       toast({ variant: "destructive", title: "Detection Failed", description: "Could not detect DTH operator. Please select manually." });
       setIsManualOperatorSelect(true);
     } finally {
       setIsDetecting(false);
     }
   }, [identifier, billers, toast]);

   const detectFastagOperator = useCallback(async () => {
      if (!identifier || identifier.length <= 10) return;
      setIsDetecting(true);
      setDetectedOperator(null);
      setIsManualOperatorSelect(false);
      try {
        await new Promise(resolve => setTimeout(resolve, 900));
        let mockOperator: Biller | undefined;
        if (identifier.toUpperCase().startsWith('KA')) {
             mockOperator = billers.find(b => b.billerId === 'icici-fastag') || billers.find(b => b.billerId === 'axis-fastag');
        } else if (identifier.toUpperCase().startsWith('MH')) {
             mockOperator = billers.find(b => b.billerId === 'hdfc-fastag');
        } else {
             mockOperator = billers.find(b => b.billerId === 'paytm-fastag');
        }
         if (!mockOperator && billers.length > 0) mockOperator = billers[0];

        if (mockOperator) {
            setDetectedOperator(mockOperator);
            setSelectedBiller(mockOperator.billerId);
            toast({ title: "FASTag Issuer Detected", description: `${mockOperator.billerName}` });
        } else {
            throw new Error("Could not determine FASTag issuer bank from current biller list.");
        }
      } catch (error) {
          console.error("Failed to detect FASTag issuer:", error);
          toast({ variant: "destructive", title: "Detection Failed", description: "Could not detect FASTag issuer. Please select manually." });
          setIsManualOperatorSelect(true);
      } finally {
          setIsDetecting(false);
      }
  }, [identifier, billers, toast]);


  const handleCompareCheckbox = (plan: RechargePlan, checked: boolean | 'indeterminate') => {
    if (checked === true) {
      if (plansToCompare.length < 3) {
        setPlansToCompare([...plansToCompare, plan]);
      } else {
        toast({ variant: "destructive", title: "Limit Reached", description: "You can compare up to 3 plans." });
      }
    } else {
      setPlansToCompare(plansToCompare.filter(p => p.planId !== plan.planId));
    }
  };

  const openCompareModal = () => {
    if (plansToCompare.length < 2) {
      toast({ description: "Select at least 2 plans to compare." });
      return;
    }
    setIsCompareModalOpen(true);
  };

  const openTariffModal = (plan: RechargePlan) => {
    setShowTariffModal(plan);
  };

   const fetchHistory = async (num: string) => {
        if (!num || !isLoggedIn) return; 
        setIsHistoryLoading(true);
        try {
            console.log(`Fetching history for ${rechargePageType}: ${num}`);
            const filters: TransactionFilters = {
                 type: 'Recharge',
                 searchTerm: num,
                 limit: 5
            };
            const history = await getTransactionHistory(filters);
            setRechargeHistory(history);
            setShowHistory(history.length > 0);
        } catch (error) {
            console.error("Failed to fetch recharge history:", error);
            setShowHistory(false);
        } finally {
            setIsHistoryLoading(false);
        }
    };

  const handleQuickRecharge = (entry: Transaction) => {
    const rechargeAmount = Math.abs(entry.amount);
    if (entry.billerId && rechargeAmount > 0) {
      setIdentifier(entry.identifier || entry.upiId || '');
      setSelectedBiller(entry.billerId);
      setAmount(rechargeAmount.toString());
      const plan = rechargePlans.find(p => p.price === rechargeAmount && (!entry.description || p.description.toLowerCase().includes(entry.description.split('-')[0].trim().toLowerCase()))) || null;
      setSelectedPlan(plan);
      toast({ title: "Details Filled", description: `Recharging ₹${rechargeAmount} for ${entry.identifier || entry.upiId}` });
      setShowHistory(false);
        const biller = billers.find(b => b.billerId === entry.billerId);
        if (biller) {
            setDetectedOperator(biller);
            setSelectedBillerName(biller.billerName);
            setIsManualOperatorSelect(false);
        } else {
             setIsManualOperatorSelect(true);
        }
        const paymentSection = document.getElementById('payment-section');
        paymentSection?.scrollIntoView({ behavior: 'smooth' });
    } else {
      toast({ variant: "destructive", title: "Missing Details", description: "Cannot perform quick recharge for this entry. Amount or Biller ID missing." });
    }
  };

  const handleSelectSavedNumber = (payee: Payee) => {
    if ((payee.type === 'mobile' && rechargePageType === 'mobile') ||
        (payee.type === 'dth' && rechargePageType === 'dth') ||
        (payee.type === 'fastag' && rechargePageType === 'fastag') ) { 
        setIdentifier(payee.identifier);
        setIsManualOperatorSelect(false); 
        setDetectedOperator(null); 
        setSelectedBiller(''); 
        setSelectedPlan(null);
        setAmount('');
        if (inputRef.current) inputRef.current.focus();
    } else {
        toast({description: `Selected contact type (${payee.type}) doesn't match recharge type (${rechargePageType}). Please select a relevant contact or enter the number manually.`})
    }
};

  const handleManualEditOperator = () => {
     setIsManualOperatorSelect(true);
      setDetectedOperator(null); 
      setDetectedRegion(null); 
  }

   const handleScheduleRecharge = async () => {
     if (!isLoggedIn) {
         toast({ variant: "destructive", title: "Login Required", description: "Please log in to schedule." });
         return;
     }
     if (!identifier || !amount || (!selectedBiller && !detectedOperator) || !scheduleFrequency || !scheduledDate) {
       toast({ variant: 'destructive', title: 'Missing Details', description: 'Please fill identifier, amount, operator, date, and frequency to schedule.' });
       return;
     }
     const finalBillerId = selectedBiller || detectedOperator?.billerId;
     if (!finalBillerId) {
         toast({ variant: 'destructive', title: 'Operator Error', description: 'Operator could not be determined.'});
         return;
     }
     setIsScheduling(true);
     try {
       const result = await scheduleRecharge(identifier, Number(amount), scheduleFrequency, scheduledDate, finalBillerId, selectedPlan?.planId);
       if (result.success) {
         toast({ title: 'Recharge Scheduled', description: `Recharge for ${identifier} scheduled ${scheduleFrequency} starting ${format(scheduledDate, 'PPP')}. Schedule ID: ${result.scheduleId}` });
         setScheduledDate(undefined);
         setScheduleFrequency(undefined);
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
       if (couponCode.trim()) {
         toast({ title: "Coupon Applied (Simulated)", description: `Coupon "${couponCode}" applied. Discount will reflect at payment if valid.` });
       } else {
         toast({ variant: "destructive", title: "No Coupon Code", description: "Please enter a coupon code to apply." });
       }
   };

    const handleCancelRecharge = async (transactionId: string) => {
        if (!isLoggedIn) {
            toast({ variant: "destructive", title: "Login Required", description: "Please log in to cancel." });
            return;
        }
        setIsCancelling(transactionId);
        try {
            const result = await cancelRechargeService(transactionId);
            if (result.success) {
                 toast({ title: "Cancellation Requested", description: result.message || "Your recharge cancellation request is being processed." });
                 fetchHistory(identifier); 
            } else {
                 throw new Error(result.message || "Cancellation not possible at this time.");
            }
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

  const remainingValidityDays = useMemo(() => {
    if (rechargePageType === 'mobile' && mockCurrentPlan?.expiryDate) {
        const today = new Date();
        const expiry = new Date(mockCurrentPlan.expiryDate);
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);

        if (!isValid(expiry) || isBefore(expiry, today)) {
            return 0; 
        }
        const diffDays = differenceInDays(expiry, today);
        return diffDays; 
    }
    return null;
  }, [mockCurrentPlan, rechargePageType]);

  const handleSelectRecentProvider = (provider: Biller) => {
      setSelectedBiller(provider.billerId);
      setDetectedOperator(provider); 
      setIsManualOperatorSelect(false); 
      setIdentifier(''); 
      if (inputRef.current) inputRef.current.focus();
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
        <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={() => alert('Help Clicked!')}>
          <HelpCircle className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-grow p-4 space-y-4 pb-20">
        {!isLoggedIn && (
            <Card className="shadow-md text-center">
                 <CardContent className="p-6">
                    <p className="text-muted-foreground">Please log in to use this feature.</p>
                    <Link href="/login">
                        <Button variant="link" className="mt-2">Login Now</Button>
                    </Link>
                 </CardContent>
            </Card>
        )}

        {isLoggedIn && (
            <>
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
                        {(rechargePageType === 'mobile' && mockSavedNumbers.length > 0) || (rechargePageType === 'dth' && mockRecentDthProviders.length > 0) ? (
                            <div>
                                <Label className="text-xs text-muted-foreground mb-2 block">{details.recentLabel}</Label>
                                <ScrollArea className="w-full whitespace-nowrap">
                                    <div className="flex space-x-4 pb-2">
                                        {rechargePageType === 'mobile' && mockSavedNumbers.map((saved) => (
                                            <button key={saved.id} onClick={() => handleSelectSavedNumber(saved)} className="flex flex-col items-center w-16 text-center hover:opacity-80 transition-opacity">
                                                <Avatar className="h-10 w-10 mb-1 border">
                                                    <AvatarImage src={`https://picsum.photos/seed/${saved.avatarSeed}/40/40`} alt={saved.name} data-ai-hint="person avatar"/>
                                                    <AvatarFallback>{saved.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium text-foreground truncate w-full">{saved.name}</span>
                                                <span className="text-xs text-muted-foreground">{saved.identifier.slice(-4)}</span>
                                            </button>
                                        ))}
                                        {rechargePageType === 'dth' && mockRecentDthProviders.map((provider) => (
                                            <button key={provider.billerId} onClick={() => handleSelectRecentProvider(provider)} className="flex flex-col items-center w-16 text-center hover:opacity-80 transition-opacity">
                                                <Image src={provider.logoUrl || '/logos/default.png'} alt={provider.billerName} width={40} height={40} className="h-10 w-10 mb-1 rounded-full border object-contain p-0.5 bg-white" data-ai-hint="operator logo small"/>
                                                <span className="text-xs font-medium text-foreground truncate w-full">{provider.billerName}</span>
                                            </button>
                                        ))}
                                        <button className="flex flex-col items-center justify-center w-16 text-center text-muted-foreground hover:text-primary transition-colors" onClick={() => alert(rechargePageType === 'mobile' ? "Add New Contact flow" : "Add New Provider flow")}>
                                            <div className="h-10 w-10 mb-1 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center bg-secondary">
                                                {rechargePageType === 'mobile' ? <UserPlus className="h-5 w-5"/> : <Tv2 className="h-5 w-5"/>}
                                            </div>
                                            <span className="text-xs font-medium">Add New</span>
                                        </button>
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                        ) : null }
                    </CardContent>
                </Card>

                {showHistory && rechargeHistory.length > 0 && (
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-md">Recent Recharges for {identifier}</CardTitle>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}><X className="h-4 w-4"/></Button>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {rechargeHistory.map((entry) => {
                                const canCancelEntry = (entry.status === 'Completed' || entry.status === 'Processing Activation') && differenceInMinutes(new Date(), new Date(entry.date)) < 30;
                                return (
                                    <div key={entry.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                        <div>
                                            <p className="text-sm font-medium">₹{Math.abs(entry.amount)}{entry.description ? ` (${entry.description.split('-')[0].trim()})` : ''}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(entry.date), 'PPp')} - Status: {entry.status}
                                                {checkingActivationTxnId === entry.id && <Loader2 className="inline ml-1 h-3 w-3 animate-spin"/>}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="xs" variant="outline" onClick={() => handleQuickRecharge(entry)} disabled={checkingActivationTxnId === entry.id}>
                                                Recharge Again
                                            </Button>
                                            {canCancelEntry && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="xs" variant="destructive" disabled={isCancelling === entry.id}>
                                                            {isCancelling === entry.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <Ban className="h-3 w-3"/>}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Cancel Recharge?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Attempt to cancel recharge of ₹{Math.abs(entry.amount)} from {format(new Date(entry.date), 'PPp')}? Cancellation is not guaranteed and only possible within 30 minutes.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Close</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleCancelRecharge(entry.id)} className="bg-destructive hover:bg-destructive/90">Request Cancellation</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}


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


                {selectedBiller && (
                        <Card className="shadow-md">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between flex-wrap gap-2">
                                    <div>
                                        <CardTitle className="text-md flex items-center gap-1">Browse Plans</CardTitle>
                                        {rechargePageType === 'mobile' && mockCurrentPlan && remainingValidityDays !== null && (
                                            <Badge variant={remainingValidityDays <= 3 ? "destructive" : "secondary"} className="mt-1 text-xs">
                                                <CalendarDays className="h-3 w-3 mr-1"/>
                                                Current plan expires in {remainingValidityDays} day{remainingValidityDays !== 1 ? 's' : ''} ({format(mockCurrentPlan.expiryDate, 'MMM d')})
                                            </Badge>
                                        )}
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
                                        Loading plans...
                                    </p>
                                </div>
                                ) : planCategories.length === 0 && rechargePlans.length > 0 ? ( 
                                <p className="text-sm text-muted-foreground text-center py-4">No plans found matching your search in these categories.</p>
                                ) : rechargePlans.length === 0 ? ( 
                                <p className="text-sm text-muted-foreground text-center py-4">No plans available for {selectedBillerName}.</p>
                                ) : (
                                <Tabs defaultValue={planCategories[0]} className="w-full">
                                    <ScrollArea className="w-full pb-3">
                                        <TabsList className="flex w-max mb-4">
                                            {planCategories.map(category => (
                                                <TabsTrigger key={category} value={category} className="text-xs px-3 h-8 flex-shrink-0">
                                                    {category === 'Recommended' && rechargePageType === 'mobile' && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}
                                                    {category === 'Offers' && rechargePageType === 'mobile' && <Gift className="h-3 w-3 mr-1 text-red-500" />}
                                                    {category}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>

                                    {planCategories.map(category => (
                                        <TabsContent key={category} value={category} className="mt-0 space-y-2">
                                            {filteredPlansByCategory[category]?.map(plan => (
                                            <Card key={plan.planId} className={cn(
                                                "p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50",
                                                selectedPlan?.planId === plan.planId ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'
                                                )} onClick={() => handlePlanSelect(plan)}>
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <p className="font-bold text-lg">₹{plan.price}</p>
                                                        {plan.isOffer && <Badge variant="destructive" className="text-xs h-5 px-1.5 mr-2 shrink-0 mt-1">Offer</Badge>}
                                                    </div>
                                                </div>
                                                <p className="text-sm mt-1 text-muted-foreground">{plan.description}</p>
                                                <div className="text-xs mt-2 text-muted-foreground flex items-start justify-between flex-wrap gap-x-4 gap-y-1">
                                                        <div>
                                                            <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Validity: {plan.validity}</div>
                                                            {rechargePageType === 'mobile' && plan.data && <div className="flex items-center gap-1"><Smartphone className="h-3 w-3"/> Data: {plan.data}</div>}
                                                            {rechargePageType === 'dth' && plan.channels && <div className="flex items-center gap-1"><Tv2 className="h-3 w-3"/> Channels: {plan.channels}</div>}
                                                        </div>
                                                        <Button variant="link" size="xs" className="p-0 h-auto text-xs" onClick={(e) => { e.stopPropagation(); openTariffModal(plan); }}>View Details</Button>
                                                </div>
                                                <div className="mt-2">
                                                    <Checkbox
                                                            id={`compare-${plan.planId}`}
                                                            checked={plansToCompare.some(p => p.planId === plan.planId)}
                                                            onCheckedChange={(checked) => handleCompareCheckbox(plan, checked as boolean)}
                                                            disabled={plansToCompare.length >= 3 && !plansToCompare.some(p => p.planId === plan.planId)}
                                                            aria-label={`Compare ${plan.description}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        /> <Label htmlFor={`compare-${plan.planId}`} className="text-xs ml-1 align-middle text-muted-foreground cursor-pointer" onClick={(e) => e.stopPropagation()}>Compare</Label>
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
                                <Input
                                id="amount"
                                type="number"
                                placeholder="Amount"
                                value={amount}
                                onChange={(e) => {setAmount(e.target.value); setSelectedPlan(null);}}
                                required={!selectedPlan}
                                min="1"
                                step="0.01"
                                className="pl-7 text-lg font-semibold h-11"
                                disabled={(!selectedBiller && !detectedOperator) && !identifier} 
                                />
                            </div>
                            {rechargePageType === 'mobile' && !selectedPlan && amount && (
                                <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={() => alert("Show Top-up Vouchers for this amount")}>
                                Check Talktime Vouchers
                                </Button>
                            )}
                        </CardContent>
                </Card>

                <Card className="shadow-md">
                        <Accordion type="single" collapsible>
                            <AccordionItem value="schedule">
                                <AccordionTrigger className="px-4 py-3 text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground"/>
                                        Schedule Recharge (Optional)
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <Label htmlFor="schedule-date" className="text-xs">Start Date</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button
                                                    id="schedule-date"
                                                    variant={"outline"}
                                                    className={cn(
                                                    "w-full justify-start text-left font-normal h-9 mt-1 text-xs",
                                                    !scheduledDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarDays className="mr-2 h-4 w-4" />
                                                    {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={scheduledDate}
                                                    onSelect={setScheduledDate}
                                                    initialFocus
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date < new Date("1900-01-01")}
                                                />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div>
                                            <Label htmlFor="schedule-frequency" className="text-xs">Frequency</Label>
                                            <Select value={scheduleFrequency} onValueChange={(value) => setScheduleFrequency(value as 'monthly' | 'weekly')}>
                                                <SelectTrigger id="schedule-frequency" className="h-9 mt-1 text-xs">
                                                    <SelectValue placeholder="Select Frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">Monthly</SelectItem>
                                                    <SelectItem value="weekly">Weekly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        className="w-full h-9 text-sm"
                                        onClick={handleScheduleRecharge}
                                        disabled={!scheduledDate || !scheduleFrequency || isScheduling || !identifier || !amount || Number(amount) <= 0 || (!selectedBiller && !detectedOperator)}
                                    >
                                        {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                                        Schedule Recharge
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center mt-2">Recharge will occur automatically on the selected date and frequency.</p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                </Card>


                <Card className="shadow-md" id="payment-section">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4"/> Paying from:</span>
                            <Button variant="link" size="sm" className="p-0 h-auto text-sm">Zet Pay Wallet (Default)</Button>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Available Balance:</span>
                            {isBalanceLoading ? (
                                <Skeleton className="h-5 w-20" />
                            ) : (
                                <span className="font-medium text-primary">₹{accountBalance !== null ? accountBalance.toFixed(2) : 'N/A'}</span>
                            )}
                        </div>
                        {bankStatus && bankStatus !== 'Active' && (
                            <Alert variant={bankStatus === 'Down' ? "destructive" : "default"} className={`${bankStatus === 'Slow' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : ''}`}>
                                <AlertTriangle className="h-4 w-4"/>
                                <AlertTitle className="text-xs">{bankStatus === 'Down' ? 'Operator Server Down' : 'Operator Server Slow'}</AlertTitle>
                                <AlertDescription className="text-xs">Payments via this operator may fail or be delayed.</AlertDescription>
                            </Alert>
                        )}
                        <Separator />
                        <div className="relative">
                            <Input
                                id="coupon"
                                placeholder="Enter Coupon Code (Optional)"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                className="pr-16 h-10"
                            />
                            <Button variant="link" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-auto px-2 text-xs" onClick={handleApplyCoupon}>Apply</Button>
                        </div>
                        <Button
                            type="button"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11 text-base"
                            disabled={isLoading || !identifier || !amount || Number(amount) <= 0 || (!selectedBiller && !detectedOperator) || bankStatus === 'Down'}
                            onClick={handleRecharge}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {bankStatus === 'Down' ? 'Operator Unavailable' : `Proceed to Pay ₹${amount || '0'}`}
                        </Button>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => alert("Temporary Freeze: Coming Soon!")}>
                            <AlarmClockOff className="mr-2 h-4 w-4"/> Freeze Payments (e.g., 1 hour)
                        </Button>

                    </CardContent>
                </Card>

                <div className="text-center text-xs text-muted-foreground mt-6 space-y-1">
                    <p className="flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3 text-green-600"/> 100% Safe & Secure Payments</p>
                    <Link href="/support" className="hover:text-primary">
                        PayFriend Customer Care | FAQs
                    </Link>
                </div>

                <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
                    <DialogContent className="sm:max-w-[90%] md:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Compare Plans ({plansToCompare.length})</DialogTitle>
                            <DialogDescription>Compare the selected recharge plans side-by-side.</DialogDescription>
                        </DialogHeader>
                        <div className={`grid gap-2 py-4 grid-cols-${plansToCompare.length === 2 ? '2' : '3'}`}>
                            {plansToCompare.map(plan => (
                                <Card key={plan.planId} className="flex flex-col text-xs shadow-none border">
                                    <CardHeader className="p-2 bg-muted/50">
                                        <CardTitle className="text-sm font-semibold">₹{plan.price}</CardTitle>
                                        <CardDescription className="text-xs h-8 overflow-hidden">{plan.description}</CardDescription>
                                        {plan.isOffer && <Badge variant="destructive" className="mt-1 w-fit">Offer</Badge>}
                                    </CardHeader>
                                    <CardContent className="p-2 space-y-1 flex-grow">
                                        <p><strong>Validity:</strong> {plan.validity || 'N/A'}</p>
                                        {plan.data && <p><strong>Data:</strong> {plan.data || 'N/A'}</p>}
                                        {typeof plan.channels === 'string' && <p><strong>Channels:</strong> {plan.channels || 'N/A'}</p>}
                                        {typeof plan.channels === 'number' && <p><strong>Channels:</strong> {plan.channels}</p>}
                                        {plan.talktime !== undefined && <p><strong>Talktime:</strong> {plan.talktime === -1 ? 'UL' : `₹${plan.talktime}`}</p>}
                                        {plan.sms !== undefined && <p><strong>SMS:</strong> {plan.sms === -1 ? 'UL' : plan.sms}</p>}
                                        {plan.category && <p><strong>Category:</strong> {plan.category}</p>}
                                    </CardContent>
                                    <Button variant="default" size="sm" className="m-2 mt-auto h-7 text-xs" onClick={() => handlePlanSelect(plan)}>
                                        Select Plan
                                    </Button>
                                </Card>
                            ))}
                        </div>
                        <DialogFooter className="sm:justify-between">
                            <Button variant="ghost" size="sm" onClick={() => { setPlansToCompare([]); setIsCompareModalOpen(false);}}>Clear Selection</Button>
                            <DialogClose asChild>
                            <Button size="sm">Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!showTariffModal} onOpenChange={() => setShowTariffModal(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Tariff Details: ₹{showTariffModal?.price}</DialogTitle>
                            <DialogDescription>{showTariffModal?.description}</DialogDescription>
                            {showTariffModal?.isOffer && <Badge variant="destructive" className="mt-1 w-fit">Special Offer!</Badge>}
                        </DialogHeader>
                        <div className="py-4 text-sm space-y-2">
                            <p><strong>Price:</strong> ₹{showTariffModal?.price}</p>
                            <p><strong>Validity:</strong> {showTariffModal?.validity || 'N/A'}</p>
                            {showTariffModal?.data && <p><strong>Data:</strong> {showTariffModal?.data || 'N/A'}</p>}
                            {typeof showTariffModal?.channels === 'string' && <p><strong>Channels:</strong> {showTariffModal.channels || 'N/A'}</p>}
                            {typeof showTariffModal?.channels === 'number' && <p><strong>Channels:</strong> {showTariffModal.channels}</p>}
                            {showTariffModal?.talktime !== undefined && <p><strong>Talktime:</strong> {showTariffModal.talktime === -1 ? 'Unlimited' : `₹${showTariffModal.talktime}`}</p>}
                            {showTariffModal?.sms !== undefined && <p><strong>SMS:</strong> {showTariffModal.sms === -1 ? 'Unlimited' : showTariffModal.sms}</p>}
                            {showTariffModal?.category && <p><strong>Category:</strong> {showTariffModal?.category}</p>}
                            {showTariffModal?.category === 'Roaming' && <Alert variant="default" className="mt-2"><AlertTriangle className="h-4 w-4 text-orange-500" /><AlertDescription className="text-xs ml-6">International Roaming pack. Ensure roaming services are active before travel.</AlertDescription></Alert>}
                            {showTariffModal?.category === 'Top-up' && rechargePageType === 'mobile' && <Alert variant="default" className="mt-2"><Info className="h-4 w-4 text-blue-500" /><AlertDescription className="text-xs ml-6">Talktime will be added to your main balance. This plan may not extend validity.</AlertDescription></Alert>}
                            <p className="text-xs text-muted-foreground pt-2">Note: Benefits are subject to operator terms and conditions.</p>
                        </div>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => { if (showTariffModal) handlePlanSelect(showTariffModal);}}>Select Plan</Button>
                            <DialogClose asChild>
                                <Button>Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </>
        )}
      </main>
    </div>
  );
}
