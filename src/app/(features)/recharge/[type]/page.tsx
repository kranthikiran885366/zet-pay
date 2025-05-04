
      
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Smartphone, Tv, Bolt, RefreshCw, Loader2, Search, Info, BadgePercent, Star, GitCompareArrows, CalendarClock, Wallet, Clock, Users, ShieldCheck, Gift, LifeBuoy, HelpCircle, Pencil, AlertTriangle, X, RadioTower, UserPlus, CalendarDays, Wifi, FileText, MoreHorizontal, Tv2, Lock, AlarmClockOff, Ban } from 'lucide-react'; // Added Lock, AlarmClockOff, Ban
import Link from 'next/link';
import { getBillers, Biller, RechargePlan, getRechargeHistory, RechargeHistoryEntry, mockRechargePlans, processRecharge, scheduleRecharge, checkActivationStatus, mockDthPlans, cancelRechargeService } from '@/services/recharge'; // Use service functions and Plan interface, import cancelRechargeService
import { getContacts, Payee } from '@/services/contacts'; // For saved contacts
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recommendRechargePlans, RecommendRechargePlansInput } from '@/ai/flows/recharge-plan-recommendation';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog"; // Added DialogTrigger, DialogClose
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Added AlertDialog components
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, addDays, isBefore } from "date-fns"; // Added isBefore
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // For horizontal scroll
import Image from 'next/image'; // For operator logos
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator'; // Import Separator
import { getWalletBalance } from '@/services/wallet'; // Import wallet balance service
import { getBankStatus } from '@/services/upi'; // Import bank status service
import { Transaction } from '@/services/transactions'; // Import Transaction for history type check

// Helper to capitalize first letter
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// Map types to icons and titles
const rechargeTypeDetails: { [key: string]: { icon: React.ElementType; title: string; identifierLabel: string; searchPlaceholder: string; recentLabel: string } } = {
  mobile: { icon: Smartphone, title: "Mobile Recharge", identifierLabel: "Mobile Number", searchPlaceholder: "Enter mobile number or name", recentLabel: "Recents & Contacts"},
  dth: { icon: Tv, title: "DTH Recharge", identifierLabel: "DTH Subscriber ID", searchPlaceholder: "Enter Customer ID or Mobile No.", recentLabel: "Recent DTH Providers"},
  electricity: { icon: Bolt, title: "Electricity Bill", identifierLabel: "Consumer Number", searchPlaceholder: "Enter Consumer Number", recentLabel: "Recent Billers" }, // Keep for potential future use?
  fastag: { icon: RadioTower, title: "FASTag Recharge", identifierLabel: "Vehicle Number", searchPlaceholder: "Enter Vehicle Number (e.g. KA01AB1234)", recentLabel: "Recent FASTag Providers"}, // Updated icon
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
const mockSavedNumbers: Payee[] = [ // Use Payee interface for consistency
  { id: 'family1', name: 'Mom', identifier: '9876543210', type: 'mobile', avatarSeed: 'mom'},
  { id: 'family2', name: 'Dad', identifier: '9988776655', type: 'mobile', avatarSeed: 'dad'},
  { id: 'friend1', name: 'Alice', identifier: '9123456780', type: 'mobile', avatarSeed: 'alice'},
  { id: 'friend2', name: 'Bob', identifier: '9112233440', type: 'mobile', avatarSeed: 'bob'},
   { id: 'self', name: 'Self', identifier: '9876501234', type: 'mobile', avatarSeed: 'self'},
];
const mockRecentDthProviders: Biller[] = [ // Mock recent DTH providers
    { billerId: 'tata-play', billerName: 'Tata Play', billerType: 'DTH', logoUrl: '/logos/tataplay.png' },
    { billerId: 'airtel-dth', billerName: 'Airtel Digital TV', billerType: 'DTH', logoUrl: '/logos/airtel.png' },
    { billerId: 'dish-tv', billerName: 'Dish TV', billerType: 'DTH', logoUrl: '/logos/dishtv.png' },
    { billerId: 'd2h', billerName: 'd2h', billerType: 'DTH', logoUrl: '/logos/d2h.png' },
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
  const [rechargeHistory, setRechargeHistory] = useState<Transaction[]>([]); // Use Transaction interface
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduleFrequency, setScheduleFrequency] = useState<'monthly' | 'weekly' | undefined>();
  const [isScheduling, setIsScheduling] = useState(false);
  const [checkingActivationTxnId, setCheckingActivationTxnId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null); // State for cancellation loading
  const [accountBalance, setAccountBalance] = useState<number | null>(null); // State for wallet balance
  const [isBalanceLoading, setIsBalanceLoading] = useState(false); // State for balance loading
  const [bankStatus, setBankStatus] = useState<'Active' | 'Slow' | 'Down' | null>(null); // Bank status

  const { toast } = useToast();

  const details = rechargeTypeDetails[type] || rechargeTypeDetails.mobile; // Fallback to mobile details
  const inputRef = useRef<HTMLInputElement>(null);

   // Fetch Wallet Balance
  useEffect(() => {
    const fetchBalance = async () => {
      setIsBalanceLoading(true);
      try {
        const balance = await getWalletBalance("user123"); // Replace with actual user ID
        setAccountBalance(balance);
      } catch (err) {
        console.error("Failed to fetch wallet balance:", err);
        // Optionally show a toast, but balance might not be critical for all flows
      } finally {
        setIsBalanceLoading(false);
      }
    };
    fetchBalance();
  }, []);


  // Fetch Billers (Operators)
  useEffect(() => {
    async function fetchBillersData() {
      // Fetch only relevant billers
      if (!['mobile', 'dth', 'fastag', 'electricity'].includes(type)) return;
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

  // Fetch Recharge History when identifier changes (if relevant for type)
  useEffect(() => {
    if (type === 'mobile' && identifier.match(/^[6-9]\d{9}$/)) {
      fetchHistory(identifier);
    } else if (type === 'dth' && identifier.length > 5) { // Example condition for DTH ID
        fetchHistory(identifier);
    }
    else {
      setRechargeHistory([]); // Clear history if identifier is invalid or not relevant
      setShowHistory(false);
    }
  }, [identifier, type]);

   // Auto-detect operator based on type and identifier
   useEffect(() => {
     if (type === 'mobile' && identifier.match(/^[6-9]\d{9}$/) && !selectedBiller && !isManualOperatorSelect) {
       detectMobileOperator();
     } else if (type === 'dth' && identifier.length > 5 && !selectedBiller && !isManualOperatorSelect) { // Example DTH ID check
        detectDthOperator();
     }

     // Reset selection if identifier is cleared or invalid based on type
     const isMobileInvalid = type === 'mobile' && !identifier.match(/^[6-9]\d{9}$/);
     const isDthInvalid = type === 'dth' && identifier.length <= 5; // Example invalid DTH ID check

     if (isMobileInvalid || isDthInvalid || !identifier) {
        setDetectedOperator(null);
        setDetectedRegion(null);
        setSelectedBiller('');
        setRechargePlans([]);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [identifier, type, isManualOperatorSelect]); // Re-run detection if manual select is turned off

  // Handle Biller Selection Change -> Fetch Plans & Bank Status
  useEffect(() => {
    if (selectedBiller) {
      const biller = billers.find(b => b.billerId === selectedBiller) || detectedOperator;
      setSelectedBillerName(biller?.billerName || '');
      if (['mobile', 'dth', 'fastag'].includes(type)) {
        fetchRechargePlans();
      } else {
        setRechargePlans([]); // Clear plans for non-plan types like electricity
      }
       // Fetch bank status for the selected operator (assuming billerId relates to a bank for payment)
       fetchBankStatus(selectedBiller); // You might need a mapping from billerId to bank identifier
    } else {
      setRechargePlans([]);
      setRecommendedPlanIds([]);
      setSelectedBillerName('');
      setBankStatus(null); // Clear bank status
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBiller, type]);

    // Function to fetch bank status
    const fetchBankStatus = async (billerId: string) => {
      // TODO: Map billerId to a relevant bank identifier if needed
      // Example: const bankIdentifier = mapBillerToBank[billerId] || 'defaultBank';
      const bankIdentifier = 'mockBank'; // Placeholder
      try {
        const status = await getBankStatus(bankIdentifier);
        setBankStatus(status);
      } catch (error) {
        console.error("Failed to fetch bank status:", error);
        setBankStatus(null); // Reset on error
      }
    };

  const handlePlanSelect = (plan: RechargePlan) => {
      setAmount(plan.price.toString());
      setSelectedPlan(plan);
      toast({ title: `Plan Selected: ${plan.category ? `(${plan.category}) ` : ''}₹${plan.price}`, description: plan.description });
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
      setError(`Please enter a valid ${details.identifierLabel}.`);
      toast({ variant: "destructive", title: "Identifier Missing" });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount or select a plan.");
      toast({ variant: "destructive", title: "Invalid Amount" });
      return;
    }
     // Check balance before proceeding (ensure accountBalance is not null)
     if (accountBalance !== null && Number(amount) > accountBalance) {
        setError(`Insufficient balance (₹${accountBalance.toFixed(2)}). Please add funds.`);
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
                description: `Recharge of ₹${amount} for ${identifier} (${selectedBillerName || 'Selected Operator'}) processed. Status: ${result.status}. Transaction ID: ${result.id}`,
                duration: 5000,
             });
             setAmount('');
             setSelectedPlan(null);
             setCouponCode('');
             fetchHistory(identifier); // Refresh history
             if(result.status === 'Processing Activation') {
                // Start polling for activation status
                pollActivationStatus(result.id);
             }
             // Optionally redirect after success
             // router.push('/history');
        } else if (result.status === 'Pending') {
             toast({
                title: "Recharge Pending",
                description: `Recharge of ₹${amount} for ${identifier} is pending confirmation. Transaction ID: ${result.id}`,
                duration: 5000,
             });
             // Keep form state, maybe show pending status near the button
        } else { // Failed status
            // The error message from processRecharge will be used
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
      console.log(`Fetching plans for ${selectedBillerName} (${selectedBiller}) - Type: ${type}`);
      await new Promise(resolve => setTimeout(resolve, 800));
      // Use different mock data based on type
      const fetchedPlans = type === 'mobile' ? mockRechargePlans : type === 'dth' ? mockDthPlans : [];
      setRechargePlans(fetchedPlans);
      if (type === 'mobile' && fetchedPlans.length > 0) {
        fetchRecommendations(fetchedPlans);
      } else {
         setRecommendedPlanIds([]); // Clear recommendations for non-mobile or if no plans
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
        userId: 'user123', // Replace with actual user ID
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
       setRecommendedPlanIds([]); // Clear on error
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
         (plan.talktime && `₹${plan.talktime}`.includes(lowerSearch)) ||
         (plan.channels && plan.channels.toString().includes(lowerSearch)) // Add channel search for DTH
       );
     }
     // Define category order based on type
     const baseCategories = type === 'mobile'
         ? ['Popular', 'Data', 'Unlimited', 'Talktime', 'SMS', 'Roaming', 'Annual', 'Top-up']
         : type === 'dth'
         ? ['Recommended', 'Basic Packs', 'HD Packs', 'Premium Packs', 'Add-Ons', 'Top-Up Packs']
         : []; // Add categories for other types if needed

     let dynamicCategories = [...baseCategories];

     const grouped = plans.reduce((acc, plan) => {
         let category = plan.category || 'Other';
          // Override category for mobile specific logic
          if (type === 'mobile') {
            if (recommendedPlanIds.includes(plan.planId)) category = 'Recommended';
            else if (plan.isOffer) category = 'Offers';
          }

         if (!acc[category]) acc[category] = [];
         acc[category].push(plan);
         return acc;
     }, {} as Record<string, RechargePlan[]>);

      // Dynamically add Offer/Recommended tabs for mobile
      if (type === 'mobile') {
         if (grouped['Offers']) dynamicCategories.unshift('Offers');
         if (grouped['Recommended']) dynamicCategories.unshift('Recommended');
      }

     let finalCategories = dynamicCategories.filter(cat => grouped[cat]?.length > 0);
     if (grouped['Other']?.length > 0 && !finalCategories.includes('Other')) finalCategories.push('Other');

     if(planSearchTerm && plans.length > 0) {
         return { filteredPlansByCategory: { "Search Results": plans } , planCategories: ["Search Results"] };
     }
     if (Object.keys(grouped).length === 0 && !isPlanLoading) {
         return { filteredPlansByCategory: {}, planCategories: [] };
     }

     return { filteredPlansByCategory: grouped, planCategories: finalCategories };
   }, [rechargePlans, planSearchTerm, recommendedPlanIds, isPlanLoading, type]);

  // Separate detection logic for better clarity
  const detectMobileOperator = useCallback(async () => {
     setIsDetecting(true);
     setDetectedOperator(null);
     setDetectedRegion(null);
     setIsManualOperatorSelect(false); // Reset manual flag
     try {
       // TODO: Replace with actual API call: await detectMobileOperator(identifier);
       await new Promise(resolve => setTimeout(resolve, 1000));
       let mockOperator = billers.find(b => b.billerName.toLowerCase().includes('jio')) || billers[0];
        if (!mockOperator && billers.length > 0) mockOperator = billers[0]; // Fallback to first if Jio not found
       const mockRegion = "Karnataka"; // Example

       if (mockOperator) {
         setDetectedOperator(mockOperator);
         setDetectedRegion(mockRegion);
         setSelectedBiller(mockOperator.billerId);
         toast({ title: "Operator & Region Detected", description: `${mockOperator.billerName} - ${mockRegion}` });
       } else {
         throw new Error("Could not determine operator from mock data.");
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
     setIsDetecting(true);
     setDetectedOperator(null);
     setDetectedRegion(null); // Region might not apply to DTH
     setIsManualOperatorSelect(false); // Reset manual flag
     try {
       // TODO: Replace with actual DTH operator detection API call based on ID structure
       await new Promise(resolve => setTimeout(resolve, 800));
       // Example mock detection based on ID prefix (highly simplified)
       let mockOperator: Biller | undefined;
       if (identifier.startsWith('1')) mockOperator = billers.find(b => b.billerId === 'tata-play');
       else if (identifier.startsWith('2')) mockOperator = billers.find(b => b.billerId === 'dish-tv');
       else if (identifier.startsWith('3')) mockOperator = billers.find(b => b.billerId === 'airtel-dth');
       else mockOperator = billers.find(b => b.billerId === 'd2h'); // Fallback example

       if (mockOperator) {
         setDetectedOperator(mockOperator);
         setSelectedBiller(mockOperator.billerId);
         toast({ title: "DTH Operator Detected", description: `${mockOperator.billerName}` });
       } else {
         throw new Error("Could not determine DTH operator from mock data.");
       }
     } catch (error) {
       console.error("Failed to detect DTH operator:", error);
       toast({ variant: "destructive", title: "Detection Failed", description: "Could not detect DTH operator. Please select manually." });
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
    if (!num) return;
    setIsHistoryLoading(true);
    try {
      console.log(`Fetching history for ${type}: ${num}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      const history = await getRechargeHistory(num, type); // Pass type to history function
      setRechargeHistory(history);
      setShowHistory(history.length > 0);
    } catch (error) {
      console.error("Failed to fetch recharge history:", error);
       setShowHistory(false); // Hide on error
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleQuickRecharge = (entry: Transaction) => { // Changed type to Transaction
    if (entry.billerId && entry.amount) {
      setIdentifier(entry.upiId || ''); // Use upiId as identifier
      setSelectedBiller(entry.billerId);
      setAmount(Math.abs(entry.amount).toString()); // Use absolute value
      // Attempt to find matching plan based on amount and potentially description
       const plan = rechargePlans.find(p => p.price === Math.abs(entry.amount) && (!entry.description || p.description.includes(entry.description))) || null;
      setSelectedPlan(plan);
      toast({ title: "Details Filled", description: `Recharging ₹${Math.abs(entry.amount)} for ${entry.upiId}` });
      setShowHistory(false);
       // Auto-detect operator based on billerId if needed
        const biller = billers.find(b => b.billerId === entry.billerId);
        if (biller) {
            setDetectedOperator(biller);
            setSelectedBillerName(biller.billerName);
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
    if (payee.type === 'mobile' && type === 'mobile') {
        setIdentifier(payee.identifier);
        setIsManualOperatorSelect(false);
        setDetectedOperator(null);
        setSelectedBiller('');
        setSelectedPlan(null);
        setAmount('');
    } else if (payee.type === 'dth' && type === 'dth'){
        setIdentifier(payee.identifier); // Assuming identifier holds DTH ID
        setIsManualOperatorSelect(false);
        setDetectedOperator(null);
        setSelectedBiller('');
        setSelectedPlan(null);
        setAmount('');
    } else {
        toast({description: `Selected contact type (${payee.type}) doesn't match recharge type (${type}).`})
    }
};

  const handleManualEditOperator = () => {
     setIsManualOperatorSelect(true);
     // Clear detected operator when switching to manual
      setDetectedOperator(null);
      setDetectedRegion(null);
      // Keep selectedBiller if user already selected manually, otherwise clear it
      // setSelectedBiller(''); // Decide if you want to clear manual selection too
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

    const handleCancelRecharge = async (transactionId: string) => {
        setIsCancelling(transactionId);
        try {
            const result = await cancelRechargeService(transactionId);
            if (result.success) {
                 toast({ title: "Cancellation Requested", description: result.message || "Your recharge cancellation request is being processed." });
                 // Refresh history to show potential status change
                 fetchHistory(identifier);
            } else {
                 throw new Error(result.message || "Cancellation not possible.");
            }
        } catch (error: any) {
             console.error("Cancellation failed:", error);
             toast({ variant: "destructive", title: "Cancellation Failed", description: error.message });
        } finally {
            setIsCancelling(null);
        }
    }


  // Determine operator logo URL
  const operatorLogoUrl = useMemo(() => {
      const operator = detectedOperator || billers.find(b => b.billerId === selectedBiller);
       if (!operator) return '/logos/default.png'; // Default logo
       // Use provided logoUrl or fallback based on name matching
      return operator.logoUrl || `/logos/${operator.billerName.toLowerCase().split(' ')[0]}.png` || '/logos/default.png';
  }, [detectedOperator, selectedBiller, billers]);

   // Calculate remaining validity days (for mobile only in this mock)
  const remainingValidityDays = useMemo(() => {
    if (type === 'mobile' && mockCurrentPlan?.expiryDate) {
        const today = new Date();
        const expiry = new Date(mockCurrentPlan.expiryDate);
        // Reset time part for accurate day difference calculation
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);

        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }
    return null;
  }, [mockCurrentPlan, type]);

  const handleSelectRecentProvider = (provider: Biller) => {
      setSelectedBiller(provider.billerId);
      setDetectedOperator(provider); // Treat as detected
      setIsManualOperatorSelect(false); // Act as if detected
      // Optionally set a known identifier if available, or focus input
      setIdentifier(''); // Clear identifier, user needs to enter it
      if (inputRef.current) inputRef.current.focus();
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
        <details.icon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">{details.title}</h1>
        <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={() => alert('Help Clicked!')}>
          <HelpCircle className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">

        {/* Select or Search Contact/ID Section */}
        <Card className="shadow-md">
             <CardContent className="p-4 space-y-4">
                <Input
                    id="identifier"
                    type={type === 'mobile' ? 'tel' : 'text'}
                    placeholder={details.searchPlaceholder}
                    ref={inputRef}
                    pattern={type === 'mobile' ? '[0-9]{10}' : undefined}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="text-base h-11" // Slightly larger text
                />
                {/* Recent Contacts/Providers Carousel */}
                 {(type === 'mobile' && mockSavedNumbers.length > 0) || (type === 'dth' && mockRecentDthProviders.length > 0) ? (
                    <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">{details.recentLabel}</Label>
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex space-x-4 pb-2">
                                {/* Mobile Recents */}
                                {type === 'mobile' && mockSavedNumbers.map((saved) => (
                                    <button key={saved.id} onClick={() => handleSelectSavedNumber(saved)} className="flex flex-col items-center w-16 text-center hover:opacity-80 transition-opacity">
                                        <Avatar className="h-10 w-10 mb-1 border">
                                            <AvatarImage src={`https://picsum.photos/seed/${saved.avatarSeed}/40/40`} alt={saved.name} data-ai-hint="person avatar" />
                                            <AvatarFallback>{saved.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium text-foreground truncate w-full">{saved.name}</span>
                                        <span className="text-xs text-muted-foreground">{saved.identifier.slice(-4)}</span>
                                    </button>
                                ))}
                                {/* DTH Recents */}
                                 {type === 'dth' && mockRecentDthProviders.map((provider) => (
                                    <button key={provider.billerId} onClick={() => handleSelectRecentProvider(provider)} className="flex flex-col items-center w-16 text-center hover:opacity-80 transition-opacity">
                                        <Image src={provider.logoUrl || '/logos/default.png'} alt={provider.billerName} width={40} height={40} className="h-10 w-10 mb-1 rounded-full border object-contain p-0.5 bg-white" data-ai-hint="operator logo small"/>
                                        <span className="text-xs font-medium text-foreground truncate w-full">{provider.billerName}</span>
                                    </button>
                                ))}
                                {/* Add New Button */}
                                <button className="flex flex-col items-center justify-center w-16 text-center text-muted-foreground hover:text-primary transition-colors" onClick={() => alert(type === 'mobile' ? "Add New Contact flow" : "Add New Provider flow")}>
                                    <div className="h-10 w-10 mb-1 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center bg-secondary">
                                        {type === 'mobile' ? <UserPlus className="h-5 w-5"/> : <Tv2 className="h-5 w-5"/>}
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

         {/* Recharge History */}
         {showHistory && rechargeHistory.length > 0 && (
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                     <CardTitle className="text-md">Recent Recharges for {identifier}</CardTitle>
                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}><X className="h-4 w-4"/></Button>
                </CardHeader>
                 <CardContent className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {rechargeHistory.map((entry) => {
                         const canCancelEntry = entry.status === 'Completed' || entry.status === 'Processing Activation'; // Add other cancellable statuses if needed
                        return (
                            <div key={entry.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                <div>
                                    <p className="text-sm font-medium">₹{Math.abs(entry.amount)}{entry.description ? ` (${entry.description.split('-')[0].trim()})` : ''}</p> {/* Simplified description */}
                                    <p className="text-xs text-muted-foreground">
                                        {format(entry.date, 'PPp')} - Status: {entry.status}
                                        {checkingActivationTxnId === entry.id && <Loader2 className="inline ml-1 h-3 w-3 animate-spin"/>}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="xs" variant="outline" onClick={() => handleQuickRecharge(entry)} disabled={checkingActivationTxnId === entry.id}>
                                        Recharge Again
                                    </Button>
                                     {/* Cancel Button */}
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
                                                         Attempt to cancel recharge of ₹{Math.abs(entry.amount)} from {format(entry.date, 'PPp')}? Cancellation is not guaranteed.
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


         {/* Auto-Fetched Operator / Manual Select Section */}
         {identifier && ( // Show this section only when identifier is entered
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
                                     {type === 'mobile' && <p className="text-xs text-muted-foreground">{detectedRegion || "Region"} | Prepaid</p>}
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
                                             {biller.logoUrl && <Image src={biller.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain" data-ai-hint="operator logo small"/>}
                                             {biller.billerName}
                                         </SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                              {/* Optionally add Region Select here if needed for manual mobile selection */}
                         </div>
                     )}
                 </CardContent>
             </Card>
         )}


        {/* Plan Browser Section */}
         {selectedBiller && ( // Show only if an operator is selected (auto or manual)
                <Card className="shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                             <div>
                                <CardTitle className="text-md flex items-center gap-1">Browse Plans</CardTitle>
                                 {/* Validity Tracking - Only for Mobile */}
                                {type === 'mobile' && mockCurrentPlan && remainingValidityDays !== null && (
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
                                            {category === 'Recommended' && type === 'mobile' && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}
                                            {category === 'Offers' && type === 'mobile' && <Gift className="h-3 w-3 mr-1 text-red-500" />}
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
                                                   {category === 'Recommended' && type === 'mobile' && <Badge variant="secondary" className="text-xs h-5 px-1.5 mr-2 shrink-0 mt-1 flex items-center gap-1 bg-yellow-100 text-yellow-800"><Star className="h-3 w-3 text-yellow-500 fill-current"/> Recommended</Badge>}
                                              </div>
                                          </div>
                                           <p className="text-sm mt-1 text-muted-foreground">{plan.description}</p>
                                          <div className="text-xs mt-2 text-muted-foreground flex items-start justify-between flex-wrap gap-x-4 gap-y-1">
                                               <div>
                                                    <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Validity: {plan.validity}</div>
                                                     {type === 'mobile' && plan.data && <div className="flex items-center gap-1"><Smartphone className="h-3 w-3"/> Data: {plan.data}</div>}
                                                     {type === 'dth' && plan.channels && <div className="flex items-center gap-1"><Tv2 className="h-3 w-3"/> Channels: {plan.channels}</div>}
                                               </div>
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
                          disabled={!selectedBiller && !detectedOperator} // Disable if no operator selected or detected
                        />
                     </div>
                      {/* Show Top-up Vouchers link only for mobile when amount is entered manually */}
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


        {/* Payment Section */}
         <Card className="shadow-md" id="payment-section">
             <CardContent className="p-4 space-y-4">
                 <div className="flex justify-between items-center text-sm">
                     <span className="text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4"/> Paying from:</span>
                     <Button variant="link" size="sm" className="p-0 h-auto text-sm">(Wallet / Linked Account)</Button> {/* Make clickable */}
                 </div>
                  <div className="flex justify-between items-center text-sm">
                     <span className="text-muted-foreground">Available Balance:</span>
                      {isBalanceLoading ? (
                         <Skeleton className="h-5 w-20" />
                     ) : (
                        <span className="font-medium text-primary">₹{accountBalance !== null ? accountBalance.toFixed(2) : 'N/A'}</span>
                     )}
                 </div>
                  {/* Bank Status Info */}
                  {bankStatus && bankStatus !== 'Active' && (
                      <Alert variant={bankStatus === 'Down' ? "destructive" : "default"} className={`${bankStatus === 'Slow' ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                          <AlertTitle className="text-xs">{bankStatus === 'Down' ? 'Bank Server Down' : 'Bank Server Slow'}</AlertTitle>
                          <AlertDescription className="text-xs">Payments via this bank may fail or be delayed.</AlertDescription>
                      </Alert>
                  )}
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
                    type="button" // Changed to type="button" as form submit is handled separately
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11 text-base" // PhonePe-style purple button
                    disabled={isLoading || !identifier || !amount || Number(amount) <= 0 || (!selectedBiller && !detectedOperator) || bankStatus === 'Down'}
                    onClick={handleRecharge} // Trigger recharge handler
                  >
                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                     {bankStatus === 'Down' ? 'Bank Unavailable' : `Proceed to Pay ₹${amount || '0'}`}
                  </Button>
                  {/* Temporary Freeze Button - Example */}
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => alert("Temporary Freeze: Coming Soon!")}>
                       <AlarmClockOff className="mr-2 h-4 w-4"/> Freeze Payments (e.g., 1 hour)
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
                                {plan.data && <p><strong>Data:</strong> {plan.data || 'N/A'}</p>}
                                {plan.channels && <p><strong>Channels:</strong> {plan.channels || 'N/A'}</p>}
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
                    {showTariffModal?.data && <p><strong>Data:</strong> {showTariffModal?.data || 'N/A'}</p>}
                    {showTariffModal?.channels && <p><strong>Channels:</strong> {showTariffModal.channels || 'N/A'}</p>}
                    {showTariffModal?.talktime !== undefined && <p><strong>Talktime:</strong> {showTariffModal.talktime === -1 ? 'Unlimited' : `₹${showTariffModal.talktime}`}</p>}
                    {showTariffModal?.sms !== undefined && <p><strong>SMS:</strong> {showTariffModal.sms === -1 ? 'Unlimited' : showTariffModal.sms}</p>}
                     {showTariffModal?.category && <p><strong>Category:</strong> {showTariffModal?.category}</p>}
                     {showTariffModal?.category === 'Roaming' && <Alert variant="default" className="mt-2"><AlertTriangle className="h-4 w-4 text-orange-500" /><AlertDescription className="text-xs ml-6">International Roaming pack. Ensure roaming services are active before travel.</AlertDescription></Alert>}
                     {showTariffModal?.category === 'Top-up' && type === 'mobile' && <Alert variant="default" className="mt-2"><Info className="h-4 w-4 text-blue-500" /><AlertDescription className="text-xs ml-6">Talktime will be added to your main balance. This plan may not extend validity.</AlertDescription></Alert>}
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


      </main>
    </div>
  );
}

// Mock API calls (replace with actual fetch/axios calls)
async function getBillers_mock(billerType: string): Promise<Biller[]> {
  console.log(`Fetching billers for type: ${billerType}`);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
  const mockData: { [key: string]: Biller[] } = {
    Mobile: [
      { billerId: 'airtel-prepaid', billerName: 'Airtel Prepaid', billerType: 'Mobile', logoUrl: '/logos/airtel.png' },
      { billerId: 'jio-prepaid', billerName: 'Jio Prepaid', billerType: 'Mobile', logoUrl: '/logos/jio.png' },
      // ... more mobile operators
    ],
    DTH: [
      { billerId: 'tata-play', billerName: 'Tata Play (Tata Sky)', billerType: 'DTH', logoUrl: '/logos/tataplay.png' },
      // ... more DTH operators
    ],
    // ... other types
  };
  return mockData[billerType] || [];
}

    