
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Smartphone, Tv, Bolt, RefreshCw, Loader2, Search, Info, BadgePercent, Star, GitCompareArrows, CalendarClock, Wallet, Clock, Users, ShieldCheck, Gift, LifeBuoy, HelpCircle, Pencil, AlertTriangle, X, RadioTower, UserPlus, CalendarDays, Wifi, FileText, MoreHorizontal } from 'lucide-react'; // Added more icons
import Link from 'next/link';
import { getBillers, Biller, RechargePlan, getRechargeHistory, RechargeHistoryEntry, mockRechargePlans, processRecharge, scheduleRecharge, checkActivationStatus } from '@/services/recharge'; // Use service functions and Plan interface
import { getContacts, Payee } from '@/services/contacts'; // For saved contacts
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recommendRechargePlans, RecommendRechargePlansInput } from '@/ai/flows/recharge-plan-recommendation';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, addDays } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // For horizontal scroll
import Image from 'next/image'; // For operator logos
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator'; // Import Separator

// Helper to capitalize first letter
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// Map types to icons and titles
const rechargeTypeDetails: { [key: string]: { icon: React.ElementType; title: string } } = {
  mobile: { icon: Smartphone, title: "Mobile Recharge" },
  dth: { icon: Tv, title: "DTH Recharge" },
  electricity: { icon: Bolt, title: "Electricity Bill" }, // Keep for potential future use?
  fastag: { icon: RadioTower, title: "FASTag Recharge"}, // Updated icon
  // Add more types as needed
};

// Mock user data (replace with actual fetching)
const mockUsageHistory = {
    averageMonthlyDataUsageGB: 50, // GB
    averageMonthlyCallsMinutes: 600, // Minutes
    preferredPlanType: 'balanced' as const,
    budget: 300, // Rupees
};
const mockCurrentPlan = { // Simulate fetching current plan details
    expiryDate: addDays(new Date(), 10), // Expires in 10 days
    planName: "Active Plan: 2GB/Day",
};
const mockAccountBalance = 1500.75; // Simulate fetching user wallet/linked account balance
const mockSavedNumbers: Payee[] = [ // Use Payee interface for consistency
  { id: 'family1', name: 'Mom', identifier: '9876543210', type: 'mobile', avatarSeed: 'mom'},
  { id: 'family2', name: 'Dad', identifier: '9988776655', type: 'mobile', avatarSeed: 'dad'},
  { id: 'friend1', name: 'Alice', identifier: '9123456780', type: 'mobile', avatarSeed: 'alice'},
  { id: 'friend2', name: 'Bob', identifier: '9112233440', type: 'mobile', avatarSeed: 'bob'},
   { id: 'self', name: 'Self', identifier: '9876501234', type: 'mobile', avatarSeed: 'self'},
];

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

export default function RechargePage() {
  const params = useParams();
  const router = useRouter();
  const type = typeof params.type === 'string' ? params.type : 'mobile'; // Default to mobile if invalid

  const [billers, setBillers] = useState<Biller[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<string>('');
  const [selectedBillerName, setSelectedBillerName] = useState<string>(''); // Store name for recommendations
  const [identifier, setIdentifier] = useState<string>(''); // Mobile number, DTH ID, etc.
  const [amount, setAmount] = useState<string>('');
  const [detectedOperator, setDetectedOperator] = useState<Biller | null>(null);
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null); // Added state for region
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading for operators/payment
  const [error, setError] = useState<string | null>(null);
  const [isManualOperatorSelect, setIsManualOperatorSelect] = useState(false);
  const [rechargePlans, setRechargePlans] = useState<RechargePlan[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planSearchTerm, setPlanSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [recommendedPlanIds, setRecommendedPlanIds] = useState<string[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [plansToCompare, setPlansToCompare] = useState<RechargePlan[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState<RechargePlan | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduleFrequency, setScheduleFrequency] = useState<'monthly' | 'weekly' | undefined>();
  const [isScheduling, setIsScheduling] = useState(false);
  const [checkingActivationTxnId, setCheckingActivationTxnId] = useState<string | null>(null);

  const { toast } = useToast();

  const details = rechargeTypeDetails[type] || rechargeTypeDetails.mobile; // Fallback to mobile details
  const inputRef = useRef<HTMLInputElement>(null);
  const identifierLabel = type === 'mobile' ? 'Mobile Number' : type === 'dth' ? 'DTH Subscriber ID' : 'Consumer Number';
  const searchPlaceholder = type === 'mobile' ? 'Enter mobile number or name' : `Enter ${identifierLabel}`;


  // Fetch Billers (Operators)
  useEffect(() => {
    async function fetchBillersData() {
      if (!['mobile', 'dth', 'fastag'].includes(type)) return;
      setIsLoading(true);
      setError(null);
      try {
        const fetchedBillers = await getBillers(capitalize(type));
        setBillers(fetchedBillers);
      } catch (err) {
        setError('Failed to load operators. Please try again.');
        console.error(err);
        toast({ variant: "destructive", title: "Could not load operators" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchBillersData();
  }, [type, toast]);

  // Fetch Recharge History when identifier changes (for mobile)
  useEffect(() => {
    if (type === 'mobile' && identifier.match(/^[6-9]\d{9}$/)) {
      fetchHistory(identifier);
    } else {
      setRechargeHistory([]); // Clear history if identifier is invalid or not mobile
      setShowHistory(false);
    }
  }, [identifier, type]);

   // Auto-detect operator when identifier is a valid mobile number
   useEffect(() => {
     if (type === 'mobile' && identifier.match(/^[6-9]\d{9}$/) && !selectedBiller && !isManualOperatorSelect) {
       detectOperator();
     }
     // Reset selection if identifier is cleared or invalid
     if (type === 'mobile' && !identifier.match(/^[6-9]\d{9}$/)) {
        setDetectedOperator(null);
        setDetectedRegion(null);
        setSelectedBiller('');
        setRechargePlans([]);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [identifier, type, isManualOperatorSelect]); // Re-run detection if manual select is turned off

  // Handle Biller Selection Change -> Fetch Plans
  useEffect(() => {
    if (selectedBiller) {
      const biller = billers.find(b => b.billerId === selectedBiller);
      setSelectedBillerName(biller?.billerName || '');
      if (['mobile', 'dth', 'fastag'].includes(type)) {
        fetchRechargePlans();
      } else {
        setRechargePlans([]);
      }
    } else {
      setRechargePlans([]);
      setRecommendedPlanIds([]);
      setSelectedBillerName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBiller, type]);

  const handlePlanSelect = (plan: RechargePlan) => {
      setAmount(plan.price.toString());
      setSelectedPlan(plan);
      toast({ title: `Plan Selected: ₹${plan.price}`, description: plan.description });
      setIsCompareModalOpen(false);
      setShowTariffModal(null); // Close tariff modal if open
      // Scroll to payment section or focus amount field
      const paymentSection = document.getElementById('payment-section');
      paymentSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((type === 'mobile' || type === 'dth' || type === 'fastag') && !selectedBiller) {
      setError("Please select an operator.");
      toast({ variant: "destructive", title: "Operator Missing" });
      return;
    }
    if (!identifier) {
      setError(`Please enter a valid ${identifierLabel}.`);
      toast({ variant: "destructive", title: "Identifier Missing" });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount or select a plan.");
      toast({ variant: "destructive", title: "Invalid Amount" });
      return;
    }
    if (Number(amount) > mockAccountBalance) {
      setError(`Insufficient balance (₹${mockAccountBalance.toFixed(2)}). Please add funds.`);
      toast({ variant: "destructive", title: "Insufficient Balance" });
      return;
    }

    setError(null);
    setIsLoading(true);
    console.log("Processing recharge:", { type, selectedBiller, identifier, amount, couponCode });

    try {
        const result = await processRecharge(type, identifier, Number(amount), selectedBiller, selectedPlan?.planId, couponCode);

        if (result.status === 'Completed' || result.status === 'Processing Activation') {
             toast({
                title: "Recharge Successful",
                description: `Recharge of ₹${amount} for ${identifier} (${selectedBillerName || 'Selected Operator'}) processed. Status: ${result.status}. Transaction ID: ${result.transactionId}`,
                duration: 5000,
             });
             setAmount('');
             setSelectedPlan(null);
             setCouponCode('');
             fetchHistory(identifier); // Refresh history
             if(result.status === 'Processing Activation') {
                // Start polling for activation status
                pollActivationStatus(result.transactionId);
             }
             // Optionally redirect after success
             // router.push('/history');
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
    const interval = 5000; // 5 seconds

    const check = async () => {
      attempts++;
      try {
        const status = await checkActivationStatus(txnId);
        if (status === 'Completed') {
          toast({ title: "Activation Complete", description: `Recharge ${txnId} is now active.` });
          setCheckingActivationTxnId(null);
          fetchHistory(identifier); // Refresh history to show updated status
        } else if (status === 'Failed') {
          toast({ variant: "destructive", title: "Activation Failed", description: `Recharge ${txnId} failed to activate.` });
          setCheckingActivationTxnId(null);
          fetchHistory(identifier); // Refresh history
        } else if (attempts < maxAttempts) {
          // Still processing, check again
          setTimeout(check, interval);
        } else {
          // Max attempts reached, still processing
          toast({ title: "Activation Pending", description: `Activation for ${txnId} is still processing. Please check history later.` });
          setCheckingActivationTxnId(null);
        }
      } catch (error) {
        console.error("Error checking activation status:", error);
        // Stop polling on error, maybe show a different toast
        setCheckingActivationTxnId(null);
      }
    };

    setTimeout(check, interval); // Start first check after interval
  };


  const fetchRechargePlans = async () => {
    if (!selectedBiller) return;
    setIsPlanLoading(true);
    setRechargePlans([]);
    setRecommendedPlanIds([]);
    setIsRecommending(false);
    try {
      // TODO: Replace with actual API call: await getRechargePlans(selectedBiller);
      console.log(`Fetching plans for ${selectedBillerName} (${selectedBiller})`);
      await new Promise(resolve => setTimeout(resolve, 800));
      const fetchedPlans = mockRechargePlans; // Use mock plans from service
      setRechargePlans(fetchedPlans);
      if (type === 'mobile') {
        fetchRecommendations(fetchedPlans);
      }
    } catch (error) {
      console.error("Failed to fetch recharge plans:", error);
      toast({ variant: "destructive", title: "Could not load recharge plans" });
    } finally {
      setIsPlanLoading(false);
    }
  };

  const fetchRecommendations = async (plans: RechargePlan[]) => {
    if (!selectedBillerName || plans.length === 0) return;
    setIsRecommending(true);
    try {
      const input: RecommendRechargePlansInput = {
        userId: 'user123',
        operatorName: selectedBillerName,
        availablePlans: plans,
        usageHistory: mockUsageHistory,
      };
      const result = await recommendRechargePlans(input);
      setRecommendedPlanIds(result.recommendedPlanIds);
      if (result.reasoning && result.recommendedPlanIds.length > 0) {
        toast({ title: "Plan Recommendations Loaded", description: result.reasoning, duration: 5000 });
      }
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      console.log("AI Recommendation service might be unavailable.");
    } finally {
      setIsRecommending(false);
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
         (plan.talktime && `₹${plan.talktime}`.includes(lowerSearch))
       );
     }
     // Define category order, adding Recommended & Offers dynamically if present
      const baseCategories = ['Popular', 'Data', 'Unlimited', 'Talktime', 'SMS', 'Roaming', 'Annual', 'Top-up'];
     let dynamicCategories = [...baseCategories];

     const grouped = plans.reduce((acc, plan) => {
         let category = plan.category || 'Other';
         if (recommendedPlanIds.includes(plan.planId)) category = 'Recommended';
         else if (plan.isOffer) category = 'Offers';

         if (!acc[category]) acc[category] = [];
         acc[category].push(plan);
         return acc;
     }, {} as Record<string, RechargePlan[]>);

     if (grouped['Offers']) dynamicCategories.unshift('Offers');
     if (grouped['Recommended']) dynamicCategories.unshift('Recommended');

     let finalCategories = dynamicCategories.filter(cat => grouped[cat]?.length > 0);
     if (grouped['Other']?.length > 0) finalCategories.push('Other');

     if(planSearchTerm && plans.length > 0) {
         return { filteredPlansByCategory: { "Search Results": plans } , planCategories: ["Search Results"] };
     }
     if (Object.keys(grouped).length === 0 && !isPlanLoading) {
         return { filteredPlansByCategory: {}, planCategories: [] };
     }

     return { filteredPlansByCategory: grouped, planCategories: finalCategories };
   }, [rechargePlans, planSearchTerm, recommendedPlanIds, isPlanLoading]);

  const detectOperator = useCallback(async () => {
     if (type !== 'mobile' || !identifier || !identifier.match(/^[6-9]\d{9}$/)) {
       // Don't toast here, just return if invalid number for auto-detect
       return;
     }
     setIsDetecting(true);
     setDetectedOperator(null);
     setDetectedRegion(null);
     setIsManualOperatorSelect(false); // Reset manual flag on new detection
     try {
       // TODO: Replace with actual API call: await detectMobileOperator(identifier);
       await new Promise(resolve => setTimeout(resolve, 1000));
       // Find mock operator, prefer "Jio" for demo
       let mockOperator = billers.find(b => b.billerName.toLowerCase().includes('jio')) || billers[0];
       if (!mockOperator && billers.length === 0) {
           mockOperator = { billerId: 'mock-jio', billerName: 'Jio (Mock)', billerType: 'Mobile', logoUrl: '/logos/jio.png' };
           setBillers([mockOperator]);
       }
       // Simulate region detection
       const mockRegion = "Karnataka"; // Example

       if (mockOperator) {
         setDetectedOperator(mockOperator);
         setDetectedRegion(mockRegion);
         setSelectedBiller(mockOperator.billerId);
         setSelectedBillerName(mockOperator.billerName);
         toast({ title: "Operator & Region Detected", description: `${mockOperator.billerName} - ${mockRegion}` });
         setIsManualOperatorSelect(false);
       } else {
         throw new Error("Could not determine operator from mock data.");
       }
     } catch (error) {
       console.error("Failed to detect operator/region:", error);
       toast({ variant: "destructive", title: "Detection Failed", description: "Could not detect operator/region. Please select manually." });
       setIsManualOperatorSelect(true);
     } finally {
       setIsDetecting(false);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [identifier, type, billers, toast]); // Dependencies for useCallback

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
    setIsHistoryLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const history = await getRechargeHistory(num);
      setRechargeHistory(history);
      setShowHistory(history.length > 0);
    } catch (error) {
      console.error("Failed to fetch recharge history:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleQuickRecharge = (entry: RechargeHistoryEntry) => {
    if (entry.billerId && entry.amount) {
      setSelectedBiller(entry.billerId);
      setAmount(entry.amount.toString());
      const plan = rechargePlans.find(p => p.price === entry.amount) || null; // Attempt to find matching plan
      setSelectedPlan(plan);
      toast({ title: "Details Filled", description: `Recharging ₹${entry.amount} for ${identifier}` });
      setShowHistory(false);
       // Auto-detect operator based on billerId if needed
        const biller = billers.find(b => b.billerId === entry.billerId);
        if (biller) {
            setDetectedOperator(biller);
            setSelectedBillerName(biller.billerName);
            // Potentially detect region based on history entry if available
            setIsManualOperatorSelect(false);
        } else {
             setIsManualOperatorSelect(true); // Allow manual selection if biller not found
        }
         // Scroll to payment section
        const paymentSection = document.getElementById('payment-section');
        paymentSection?.scrollIntoView({ behavior: 'smooth' });
    } else {
      toast({ variant: "destructive", title: "Missing Details", description: "Cannot perform quick recharge for this entry." });
    }
  };

  const handleSelectSavedNumber = (payee: Payee) => {
    setIdentifier(payee.identifier);
    if (type === 'mobile') {
       // Auto-detect will trigger via useEffect on identifier change
       setIsManualOperatorSelect(false); // Ensure auto-detect runs
       setDetectedOperator(null); // Clear previous detection
       setSelectedBiller(''); // Clear previous selection
       setSelectedPlan(null); // Clear selected plan
       setAmount(''); // Clear amount
    }
};

  const handleManualEditOperator = () => {
     setIsManualOperatorSelect(true);
     // Optionally clear detected operator state if needed
     // setDetectedOperator(null);
     // setDetectedRegion(null);
  }

   const handleScheduleRecharge = async () => {
     if (!identifier || !amount || !selectedBiller || !scheduleFrequency || !scheduledDate) {
       toast({ variant: 'destructive', title: 'Missing Details', description: 'Please fill identifier, amount, operator, date, and frequency to schedule.' });
       return;
     }
     setIsScheduling(true);
     try {
       const result = await scheduleRecharge(identifier, Number(amount), scheduleFrequency, scheduledDate, selectedBiller, selectedPlan?.planId);
       if (result.success) {
         toast({ title: 'Recharge Scheduled', description: `Recharge for ${identifier} scheduled ${scheduleFrequency} starting ${format(scheduledDate, 'PPP')}.` });
         setScheduledDate(undefined);
         setScheduleFrequency(undefined);
       } else {
         throw new Error('Failed to schedule recharge');
       }
     } catch (error: any) {
       console.error('Scheduling failed:', error);
       toast({ variant: 'destructive', title: 'Scheduling Failed', description: error.message || 'Could not schedule recharge.' });
     } finally {
       setIsScheduling(false);
     }
   };

   const handleApplyCoupon = () => {
       if (couponCode) {
         // Simulate applying coupon
         toast({ title: "Coupon Applied", description: `Coupon "${couponCode}" applied successfully!` });
       } else {
         toast({ variant: "destructive", title: "No Coupon Code", description: "Please enter a coupon code to apply." });
       }
   };


  // Determine operator logo URL
  const operatorLogoUrl = useMemo(() => {
      const operator = detectedOperator || billers.find(b => b.billerId === selectedBiller);
       // Example: Use a mapping or naming convention
       if (!operator) return '/logos/default.png'; // Default logo
      const name = operator.billerName.toLowerCase();
      if (name.includes('airtel')) return '/logos/airtel.png';
      if (name.includes('jio')) return '/logos/jio.png';
      if (name.includes('vodafone') || name.includes('vi')) return '/logos/vi.png';
      if (name.includes('bsnl')) return '/logos/bsnl.png';
      return operator.logoUrl || '/logos/default.png'; // Use provided logoUrl or default
  }, [detectedOperator, selectedBiller, billers]);

   // Calculate remaining validity days
  const remainingValidityDays = useMemo(() => {
    if (mockCurrentPlan?.expiryDate) {
        const today = new Date();
        const expiry = new Date(mockCurrentPlan.expiryDate);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }
    return null;
  }, [mockCurrentPlan]);


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">{details.title}</h1>
        <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={() => alert('Help Clicked!')}>
          <HelpCircle className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">

        {/* Select or Search Contact Section */}
        <Card className="shadow-md">
             <CardContent className="p-4 space-y-4">
                <Input
                    id="identifier"
                    type={type === 'mobile' ? 'tel' : 'text'}
                    placeholder={searchPlaceholder}
                    ref={inputRef}
                    pattern={type === 'mobile' ? '[0-9]{10}' : undefined}
                    value={identifier}
                     onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))} // Allow only 10 digits for mobile
                    required
                    className="text-base h-11" // Slightly larger text
                />
                {/* Recent Contacts Carousel */}
                 {type === 'mobile' && mockSavedNumbers.length > 0 && (
                    <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Recents & Contacts</Label>
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex space-x-4 pb-2">
                                {mockSavedNumbers.map((saved) => (
                                    <button key={saved.id} onClick={() => handleSelectSavedNumber(saved)} className="flex flex-col items-center w-16 text-center hover:opacity-80 transition-opacity">
                                        <Avatar className="h-10 w-10 mb-1 border">
                                            <AvatarImage src={`https://picsum.photos/seed/${saved.avatarSeed}/40/40`} alt={saved.name} data-ai-hint="person avatar" />
                                            <AvatarFallback>{saved.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium text-foreground truncate w-full">{saved.name}</span>
                                        <span className="text-xs text-muted-foreground">{saved.identifier.slice(-4)}</span>
                                    </button>
                                ))}
                                {/* Add New Contact Button */}
                                <button className="flex flex-col items-center justify-center w-16 text-center text-muted-foreground hover:text-primary transition-colors" onClick={() => alert("Add New Contact flow")}>
                                    <div className="h-10 w-10 mb-1 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center bg-secondary">
                                        <UserPlus className="h-5 w-5"/>
                                    </div>
                                    <span className="text-xs font-medium">Add New</span>
                                </button>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>

         {/* Recharge History */}
         {showHistory && rechargeHistory.length > 0 && (
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                     <CardTitle className="text-md">Recent Recharges for {identifier}</CardTitle>
                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}><X className="h-4 w-4"/></Button>
                </CardHeader>
                 <CardContent className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {rechargeHistory.map((entry) => (
                        <div key={entry.transactionId} className="flex justify-between items-center p-2 border-b last:border-b-0">
                            <div>
                                <p className="text-sm font-medium">₹{entry.amount}{entry.planDescription ? ` (${entry.planDescription})` : ''}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(entry.date, 'PPp')} - Status: {entry.status}
                                    {checkingActivationTxnId === entry.transactionId && <Loader2 className="inline ml-1 h-3 w-3 animate-spin"/>}
                                </p>
                             </div>
                            <Button size="xs" variant="outline" onClick={() => handleQuickRecharge(entry)} disabled={checkingActivationTxnId === entry.transactionId}>
                                Recharge Again
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}


         {/* Auto-Fetched Operator / Manual Select Section */}
         {(type === 'mobile' && identifier.match(/^[6-9]\d{9}$/)) && (
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
                                    <p className="text-xs text-muted-foreground">{detectedRegion || "Region"} | Prepaid</p>
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
                                     <SelectValue placeholder={isLoading ? "Loading..." : "Select Operator"} />
                                </SelectTrigger>
                                 <SelectContent>
                                     {billers.map((biller) => (
                                        <SelectItem key={biller.billerId} value={biller.billerId}>
                                            {/* Optional: Add logo here */}
                                             {biller.billerName}
                                         </SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                              {/* Optionally add Region Select here if needed for manual selection */}
                         </div>
                     )}
                 </CardContent>
             </Card>
         )}


        {/* Plan Browser Section */}
         {selectedBiller && (
                <Card className="shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                             <div>
                                <CardTitle className="text-md flex items-center gap-1">Browse Plans</CardTitle>
                                 {/* Validity Tracking */}
                                {mockCurrentPlan && remainingValidityDays !== null && (
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
                            placeholder="Search plans (e.g., unlimited, 599, data)"
                            value={planSearchTerm}
                            onChange={(e) => setPlanSearchTerm(e.target.value)}
                            className="mt-2 h-9"
                        />
                    </CardHeader>
                    <CardContent className="pt-2">
                        {isPlanLoading || isRecommending ? (
                           <div className="flex items-center justify-center py-6">
                             <Loader2 className="h-6 w-6 animate-spin text-primary" />
                             <p className="ml-2 text-sm text-muted-foreground">
                                {isRecommending ? 'Finding best plans for you...' : 'Loading plans...'}
                             </p>
                           </div>
                         ) : planCategories.length === 0 && rechargePlans.length > 0 ? (
                           <p className="text-sm text-muted-foreground text-center py-4">No plans found matching your search.</p>
                          ) : rechargePlans.length === 0 ? (
                           <p className="text-sm text-muted-foreground text-center py-4">No plans available for {selectedBillerName}.</p>
                         ) : (
                           <Tabs defaultValue={planCategories[0] || 'Recommended'} className="w-full">
                             <ScrollArea className="w-full pb-3">
                                <TabsList className="flex w-max mb-4">
                                    {planCategories.map(category => (
                                        <TabsTrigger key={category} value={category} className="text-xs px-3 h-8 flex-shrink-0"> {/* Adjusted size */}
                                            {category === 'Recommended' && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}
                                            {category === 'Offers' && <Gift className="h-3 w-3 mr-1 text-red-500" />}
                                            {category}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                <ScrollBar orientation="horizontal" />
                             </ScrollArea>

                             {planCategories.map(category => (
                                <TabsContent key={category} value={category} className="mt-0 space-y-2">
                                    {/* Plan Cards */}
                                    {filteredPlansByCategory[category]?.map(plan => (
                                       <Card key={plan.planId} className={cn(
                                           "p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50",
                                           selectedPlan?.planId === plan.planId ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'
                                        )} onClick={() => handlePlanSelect(plan)}>
                                          <div className="flex justify-between items-start gap-2">
                                              <div>
                                                  <p className="font-bold text-lg">₹{plan.price}</p>
                                                   {plan.isOffer && <Badge variant="destructive" className="text-xs h-5 px-1.5 mr-2 shrink-0 mt-1">Offer</Badge>}
                                                   {category === 'Recommended' && <Badge variant="secondary" className="text-xs h-5 px-1.5 mr-2 shrink-0 mt-1 flex items-center gap-1 bg-yellow-100 text-yellow-800"><Star className="h-3 w-3 text-yellow-500 fill-current"/> Recommended</Badge>}
                                              </div>
                                               {/* Remove explicit select button, selection happens on card click */}
                                               {/* <Button variant={selectedPlan?.planId === plan.planId ? "default" : "outline"} size="sm" className="h-8 px-3" onClick={() => handlePlanSelect(plan)}>
                                                   {selectedPlan?.planId === plan.planId ? "Selected" : "Select"}
                                                </Button> */}
                                          </div>
                                           <p className="text-sm mt-1 text-muted-foreground">{plan.description}</p>
                                          <div className="text-xs mt-2 text-muted-foreground flex items-center justify-between flex-wrap gap-x-4 gap-y-1">
                                                <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Validity: {plan.validity}</div>
                                                <div className="flex items-center gap-1"><Smartphone className="h-3 w-3"/> Data: {plan.data}</div>
                                                <Button variant="link" size="xs" className="p-0 h-auto text-xs" onClick={(e) => { e.stopPropagation(); openTariffModal(plan); }}>View Details</Button>
                                          </div>
                                          <div className="mt-2">
                                               <Checkbox
                                                    id={`compare-${plan.planId}`}
                                                    checked={plansToCompare.some(p => p.planId === plan.planId)}
                                                    onCheckedChange={(checked) => handleCompareCheckbox(plan, checked)}
                                                    disabled={plansToCompare.length >= 3 && !plansToCompare.some(p => p.planId === plan.planId)}
                                                    aria-label={`Compare ${plan.description}`}
                                                     onClick={(e) => e.stopPropagation()} // Prevent card click when interacting with checkbox
                                                /> <Label htmlFor={`compare-${plan.planId}`} className="text-xs ml-1 align-middle text-muted-foreground cursor-pointer" onClick={(e) => e.stopPropagation()}>Compare</Label>
                                          </div>
                                      </Card>
                                    ))}
                                </TabsContent>
                             ))}
                           </Tabs>
                         )}
                    </CardContent>
                </Card>
            )}

          {/* Manual Amount Input */}
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
                          required={!selectedPlan} // Required if no plan is selected
                          min="1"
                          step="0.01"
                          className="pl-7 text-lg font-semibold h-11"
                          disabled={!selectedBiller} // Disable if no operator selected
                        />
                     </div>
                     {type === 'mobile' && !selectedPlan && amount && (
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={() => alert("Show Top-up Vouchers")}>
                          Check Talktime Vouchers
                        </Button>
                    )}
                 </CardContent>
           </Card>

          {/* Schedule Recharge Section */}
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
                                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date < new Date("1900-01-01")} // Disable past dates
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
                                            {/* Add more options like 'bi-weekly', 'quarterly' if needed */}
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                             <Button
                                variant="secondary"
                                className="w-full h-9 text-sm"
                                onClick={handleScheduleRecharge}
                                disabled={!scheduledDate || !scheduleFrequency || isScheduling || !identifier || !amount || Number(amount) <= 0 || !selectedBiller}
                            >
                                {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                                Schedule Recharge
                            </Button>
                             <p className="text-xs text-muted-foreground text-center mt-2">Recharge will occur automatically on the selected date and frequency.</p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
           </Card>


        {/* Payment Section */}
         <Card className="shadow-md" id="payment-section">
             <CardContent className="p-4 space-y-4">
                 <div className="flex justify-between items-center text-sm">
                     <span className="text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4"/> Paying from:</span>
                     <Button variant="link" size="sm" className="p-0 h-auto text-sm">(Wallet / Linked Account)</Button> {/* Make clickable */}
                 </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-muted-foreground">Available Balance:</span>
                     <span className="font-medium text-primary">₹{mockAccountBalance.toFixed(2)}</span>
                 </div>
                  <Separator />
                  <div className="relative">
                     <Input
                         id="coupon"
                         placeholder="Enter Coupon Code (Optional)"
                         value={couponCode}
                         onChange={(e) => setCouponCode(e.target.value)}
                         className="pr-16 h-10" // Space for apply button
                     />
                     <Button variant="link" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-auto px-2 text-xs" onClick={handleApplyCoupon}>Apply</Button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11 text-base" // PhonePe-style purple button
                    disabled={isLoading || !identifier || !amount || Number(amount) <= 0 || !selectedBiller}
                    onClick={handleRecharge} // Trigger form submission
                  >
                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                     Proceed to Pay ₹{amount || '0'}
                  </Button>
             </CardContent>
         </Card>

         {/* Bottom Info */}
         <div className="text-center text-xs text-muted-foreground mt-6 space-y-1">
            <p className="flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3 text-green-600"/> 100% Safe & Secure Payments</p>
             <Link href="/support" className="hover:text-primary">
                PayFriend Customer Care | FAQs
             </Link>
         </div>

         {/* Plan Comparison Modal */}
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
                                <p><strong>Data:</strong> {plan.data || 'N/A'}</p>
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
                    <Button size="sm" onClick={() => setIsCompareModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Tariff Details Modal */}
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
                    <p><strong>Data:</strong> {showTariffModal?.data || 'N/A'}</p>
                    {showTariffModal?.talktime !== undefined && <p><strong>Talktime:</strong> {showTariffModal.talktime === -1 ? 'Unlimited' : `₹${showTariffModal.talktime}`}</p>}
                    {showTariffModal?.sms !== undefined && <p><strong>SMS:</strong> {showTariffModal.sms === -1 ? 'Unlimited' : showTariffModal.sms}</p>}
                     {showTariffModal?.category && <p><strong>Category:</strong> {showTariffModal?.category}</p>}
                     {showTariffModal?.category === 'Roaming' && <Alert variant="default" className="mt-2"><AlertTriangle className="h-4 w-4 text-orange-500" /><AlertDescription className="text-xs ml-6">International Roaming pack. Ensure roaming services are active before travel.</AlertDescription></Alert>}
                     {showTariffModal?.category === 'Top-up' && <Alert variant="default" className="mt-2"><Info className="h-4 w-4 text-blue-500" /><AlertDescription className="text-xs ml-6">Talktime will be added to your main balance. This plan may not extend validity.</AlertDescription></Alert>}
                    <p className="text-xs text-muted-foreground pt-2">Note: Benefits are subject to operator terms and conditions.</p>
                 </div>
                <DialogFooter>
                     <Button variant="secondary" onClick={() => { if (showTariffModal) handlePlanSelect(showTariffModal);}}>Select Plan</Button>
                     <Button onClick={() => setShowTariffModal(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      </main>
    </div>
  );
}
