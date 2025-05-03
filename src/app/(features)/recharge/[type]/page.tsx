'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Smartphone, Tv, Bolt, RefreshCw, Loader2, Search, Info, BadgePercent, Star, GitCompareArrows, CalendarClock, Wallet, Clock, Users, ShieldAlert, Gift } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller, RechargePlan, getRechargeHistory, RechargeHistoryEntry } from '@/services/recharge'; // Import service and Plan interface
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recommendRechargePlans, RecommendRechargePlansInput } from '@/ai/flows/recharge-plan-recommendation';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'; // Use Dialog for comparison
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For reminders/validity

// Helper to capitalize first letter
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// Map types to icons and titles
const rechargeTypeDetails: { [key: string]: { icon: React.ElementType; title: string } } = {
  mobile: { icon: Smartphone, title: "Mobile Recharge" },
  dth: { icon: Tv, title: "DTH Recharge" },
  electricity: { icon: Bolt, title: "Electricity Bill" },
  fastag: { icon: BadgePercent, title: "FASTag Recharge"}, // Added FASTag
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
    expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Expires in 10 days
    planName: "Active Plan: 2GB/Day",
};
const mockAccountBalance = 1500.75; // Simulate fetching user wallet/linked account balance
const mockSavedNumbers = [
    { id: 'family1', name: 'Mom', number: '9876543210'},
    { id: 'family2', name: 'Dad', number: '9988776655'},
];


export default function RechargePage() {
  const params = useParams();
  const type = typeof params.type === 'string' ? params.type : 'mobile'; // Default to mobile if invalid

  const [billers, setBillers] = useState<Biller[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<string>('');
  const [selectedBillerName, setSelectedBillerName] = useState<string>(''); // Store name for recommendations
  const [identifier, setIdentifier] = useState<string>(''); // e.g., Mobile number, DTH ID
  const [amount, setAmount] = useState<string>('');
  const [detectedOperator, setDetectedOperator] = useState<Biller | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading for operators/payment
  const [error, setError] = useState<string | null>(null);
  const [isManualOperatorSelect, setIsManualOperatorSelect] = useState(false);
  const [rechargePlans, setRechargePlans] = useState<RechargePlan[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(false); // Specific loading for plans
  const [planSearchTerm, setPlanSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [recommendedPlanIds, setRecommendedPlanIds] = useState<string[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [plansToCompare, setPlansToCompare] = useState<RechargePlan[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState<RechargePlan | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // Toggle to show/hide history section


  const { toast } = useToast();

  const details = rechargeTypeDetails[type] || rechargeTypeDetails.mobile; // Fallback to mobile details
  const inputRef = useRef<HTMLInputElement>(null);
  const identifierLabel = type === 'mobile' ? 'Mobile Number' : type === 'dth' ? 'DTH Subscriber ID' : 'Consumer Number';


  // Fetch Billers (Operators)
  useEffect(() => {
    async function fetchBillersData() {
      // Only fetch operators for mobile/dth/fastag type for now
       if (!['mobile', 'dth', 'fastag'].includes(type)) return;
      setIsLoading(true);
      setError(null);
      try {
        const fetchedBillers = await getBillers(capitalize(type));
        setBillers(fetchedBillers);
      } catch (err) {
        setError('Failed to load operators. Please try again.');
        console.error(err);
        toast({
          variant: "destructive",
          title: "Could not load operators",
        });
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


  // Handle Biller Selection Change -> Fetch Plans
  useEffect(() => {
    if (selectedBiller) {
      const biller = billers.find(b => b.billerId === selectedBiller);
      setSelectedBillerName(biller?.billerName || '');
      // Automatically fetch plans for mobile/dth/fastag
       if (['mobile', 'dth', 'fastag'].includes(type)) {
            fetchRechargePlans();
       } else {
            setRechargePlans([]); // Clear plans for other types like electricity
       }
    } else {
      setRechargePlans([]); // Clear plans if operator is deselected
      setRecommendedPlanIds([]);
      setSelectedBillerName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBiller, type]); // Also depend on type

  // Handle Plan Selection
  const handlePlanSelect = (plan: RechargePlan) => {
      setAmount(plan.price.toString());
      setSelectedPlan(plan);
      if (inputRef.current) { inputRef.current.focus(); } // Optional: focus amount input
      toast({ title: `Plan Selected: ₹${plan.price}`, description: plan.description });
       // Close comparison modal if open
       setIsCompareModalOpen(false);
  };

  // Handle Payment Submission
  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    // Add validation here
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

    // Balance Check Simulation
    if (Number(amount) > mockAccountBalance) {
        setError(`Insufficient balance (₹${mockAccountBalance.toFixed(2)}). Please add funds.`);
         toast({ variant: "destructive", title: "Insufficient Balance" });
         return;
    }

    setError(null);
    setIsLoading(true); // Use isLoading for payment processing
    console.log("Processing recharge:", { type, selectedBiller, identifier, amount });

    // TODO: Integrate with actual processRecharge API
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Recharge Successful (Simulated)",
        description: `Recharge of ₹${amount} for ${identifier} (${selectedBillerName || 'Selected Operator'}) was successful. Activation status can be checked in History.`,
        duration: 5000,
      });
      // Reset relevant fields? Maybe keep identifier/operator for quick re-recharge
      setAmount('');
      setSelectedPlan(null);
       fetchHistory(identifier); // Refresh history after successful recharge
    }, 1500);
  };

  // Simulate plan fetching based on operator
  const fetchRechargePlans = async () => {
    if (!selectedBiller) return;

    setIsPlanLoading(true);
    setRechargePlans([]); // Clear previous plans
    setRecommendedPlanIds([]); // Clear recommendations
    setIsRecommending(false);
    try {
      // TODO: Replace with actual API call: await getRechargePlans(selectedBiller);
      console.log(`Fetching plans for ${selectedBillerName} (${selectedBiller})`);
      await new Promise(resolve => setTimeout(resolve, 800));
      // Mock plans with categories and offers for demo
      const mockPlans: RechargePlan[] = [
          // Popular
          { planId: 'p1', description: 'UL Calls, 1.5GB/D, 100SMS/D', price: 299, validity: '28 Days', data: '1.5GB/day', sms: 100, talktime: -1, category: 'Popular', isOffer: false },
          { planId: 'p1a', description: 'UL Calls, 1GB/D, 100SMS/D', price: 239, validity: '24 Days', data: '1GB/day', sms: 100, talktime: -1, category: 'Popular', isOffer: false },
           // Data
          { planId: 'p2', description: '50GB Bulk Data Pack', price: 301, validity: 'Existing Plan', data: '50GB', category: 'Data', isOffer: false },
          { planId: 'p2a', description: '12GB Data Add-on', price: 121, validity: 'Existing Plan', data: '12GB', category: 'Data', isOffer: false },
           // Top-up
          { planId: 'p3', description: '₹81.75 Talktime', price: 100, validity: 'Unlimited', data: 'N/A', talktime: 81.75, category: 'Top-up', isOffer: false },
          { planId: 'p7', description: '₹190 Talktime + 1GB Offer', price: 200, validity: 'Unlimited', data: '1GB', talktime: 190, category: 'Top-up', isOffer: true },
           // Entertainment
          { planId: 'p4', description: 'UL Calls, 2GB/D + Streaming App', price: 599, validity: '56 Days', data: '2GB/day', sms: 100, talktime: -1, category: 'Entertainment', isOffer: true },
          // Roaming
          { planId: 'p5', description: 'Intl Roaming USA 30D', price: 2999, validity: '30 Days', data: '5GB', talktime: 100, category: 'Roaming', isOffer: false },
          { planId: 'p5a', description: 'Intl Roaming UK 10D', price: 1101, validity: '10 Days', data: '1GB', talktime: 50, category: 'Roaming', isOffer: false },
          // Annual
          { planId: 'p6', description: 'UL Calls, 24GB/Yr', price: 1799, validity: '365 Days', data: '24GB Total', sms: 3600, talktime: -1, category: 'Annual', isOffer: false },

      ];
      setRechargePlans(mockPlans);
      // After fetching plans, get recommendations (only for mobile)
      if (type === 'mobile') {
         fetchRecommendations(mockPlans);
      }
    } catch (error) {
      console.error("Failed to fetch recharge plans:", error);
      toast({
        variant: "destructive",
        title: "Could not load recharge plans"
      });
    } finally {
      setIsPlanLoading(false);
    }
  };

   // Fetch AI Recommendations
   const fetchRecommendations = async (plans: RechargePlan[]) => {
        if (!selectedBillerName || plans.length === 0) return;
        setIsRecommending(true);
        try {
            const input: RecommendRechargePlansInput = {
                userId: 'user123', // Replace with actual user ID
                operatorName: selectedBillerName,
                availablePlans: plans,
                usageHistory: mockUsageHistory, // Provide usage history
            };
            const result = await recommendRechargePlans(input);
            setRecommendedPlanIds(result.recommendedPlanIds);
             if(result.reasoning && result.recommendedPlanIds.length > 0) {
                toast({title: "Plan Recommendations Loaded", description: result.reasoning, duration: 5000});
            }
        } catch (error) {
            console.error("Failed to get recommendations:", error);
             // Don't show destructive toast for recommendation failure, just log it.
             // toast({ variant: "destructive", title: "Could not get recommendations" });
             console.log("AI Recommendation service might be unavailable.");
        } finally {
            setIsRecommending(false);
        }
    };


  // Filter and group plans for display
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
    const baseCategories = ['Popular', 'Data', 'Entertainment', 'Annual', 'Top-up', 'Roaming'];
    let dynamicCategories = [...baseCategories];

    const grouped = plans.reduce((acc, plan) => {
        let category = plan.category || 'Other'; // Assign to 'Other' if category is missing
        // Prioritize Recommended and Offers
        if (recommendedPlanIds.includes(plan.planId)) category = 'Recommended';
        else if (plan.isOffer) category = 'Offers';

        if (!acc[category]) acc[category] = [];
        acc[category].push(plan);
        return acc;
    }, {} as Record<string, RechargePlan[]>);

     // Add Recommended and Offers to the beginning if they exist
     if (grouped['Offers']) dynamicCategories.unshift('Offers');
     if (grouped['Recommended']) dynamicCategories.unshift('Recommended');

      // Filter out categories that don't exist in the grouped data, and add 'Other' if it exists
      let finalCategories = dynamicCategories.filter(cat => grouped[cat]?.length > 0);
      if (grouped['Other']?.length > 0) finalCategories.push('Other');

      // If search is active and results are found, just show a single "Search Results" category
       if(planSearchTerm && plans.length > 0) {
          return { filteredPlansByCategory: { "Search Results": plans } , planCategories: ["Search Results"] };
       }
       // If no plans found after filtering/loading
       if (Object.keys(grouped).length === 0 && !isPlanLoading) {
           return { filteredPlansByCategory: {}, planCategories: [] };
       }


    return { filteredPlansByCategory: grouped, planCategories: finalCategories };
  }, [rechargePlans, planSearchTerm, recommendedPlanIds, isPlanLoading]);


  // Operator Detection Logic (Mobile Only)
  const detectOperator = async () => {
    if (type !== 'mobile' || !identifier || !identifier.match(/^[6-9]\d{9}$/)) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number to detect operator.",
      });
      return;
    }
    setIsDetecting(true);
    setDetectedOperator(null);
    setIsManualOperatorSelect(false); // Reset manual selection flag
    try {
      // TODO: Replace with actual API call: await detectMobileOperator(identifier);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
       // Find a mock operator from the fetched list if possible, otherwise create one
       let mockOperator = billers.find(b => b.billerName.toLowerCase().includes('airtel')) || billers[0]; // Example: try to find Airtel or take the first
       if (!mockOperator && billers.length === 0) { // If billers haven't loaded yet, create a placeholder
            mockOperator = { billerId: 'mock-airtel', billerName: 'Airtel (Mock)', billerType: 'Mobile' };
            setBillers([mockOperator]); // Add the mock operator to the list so select can find it
       }


      if (mockOperator) {
           setDetectedOperator(mockOperator);
           setSelectedBiller(mockOperator.billerId); // Auto-select detected operator
           setSelectedBillerName(mockOperator.billerName); // Store name
            toast({
                title: "Operator Detected",
                description: `Operator detected as ${mockOperator.billerName}.`,
            });
            setIsManualOperatorSelect(false); // Keep auto-detection active
       } else {
            throw new Error("Could not determine operator from mock data."); // Or handle case where no operator matches
       }

    } catch (error) {
      console.error("Failed to detect operator:", error);
      toast({
        variant: "destructive",
        title: "Detection Failed",
        description: "Could not detect operator. Please select manually.",
      });
      setIsManualOperatorSelect(true); // Force manual selection on failure
    } finally {
      setIsDetecting(false);
    }
  };

    // Comparison Logic
    const handleCompareCheckbox = (plan: RechargePlan, checked: boolean | 'indeterminate') => {
        if (checked === true) {
            if (plansToCompare.length < 3) {
                setPlansToCompare([...plansToCompare, plan]);
            } else {
                toast({ variant: "destructive", title: "Limit Reached", description: "You can compare up to 3 plans." });
                // We cannot directly uncheck the ShadCN checkbox here easily after it's checked by the user.
                // The disabled state prevents adding more, which is the main goal.
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

      // Tariff Details Modal
    const openTariffModal = (plan: RechargePlan) => {
        setShowTariffModal(plan);
    };

     // Fetch History
    const fetchHistory = async (num: string) => {
        setIsHistoryLoading(true);
        try {
            // TODO: Replace with actual API call: getRechargeHistory(num)
             await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
             const history = await getRechargeHistory(num); // Use the imported function
             setRechargeHistory(history);
             setShowHistory(history.length > 0); // Show history only if there are entries
        } catch (error) {
            console.error("Failed to fetch recharge history:", error);
             // Don't show toast for history failure, just log
        } finally {
            setIsHistoryLoading(false);
        }
    };

      // Quick Recharge Handler
    const handleQuickRecharge = (entry: RechargeHistoryEntry) => {
        if (entry.billerId && entry.amount) {
            setSelectedBiller(entry.billerId);
            setAmount(entry.amount.toString());
             const plan = rechargePlans.find(p => p.price === entry.amount) || null; // Try to find matching plan
             setSelectedPlan(plan);
             toast({title: "Details Filled", description: `Recharging ₹${entry.amount} for ${identifier}`});
             // Optionally trigger form submission directly after a small delay
             // setTimeout(() => inputRef.current?.closest('form')?.requestSubmit(), 100);
             setShowHistory(false); // Hide history after selecting
        } else {
            toast({ variant: "destructive", title: "Missing Details", description: "Cannot perform quick recharge for this entry." });
        }
    };

      // Family/Saved Number Selection
    const handleSelectSavedNumber = (number: string) => {
        setIdentifier(number);
        // Optionally trigger operator detection
        if (type === 'mobile') {
            setTimeout(detectOperator, 100); // Detect after state updates
        }
    };


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
        {/* Balance Check Placeholder */}
         <Button variant="ghost" size="sm" className="ml-auto text-xs text-primary-foreground/80 hover:text-primary-foreground">
            <Wallet className="h-4 w-4 mr-1"/> ₹{mockAccountBalance.toFixed(2)}
         </Button>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4">
         {/* Validity/Reminder Alert */}
         {type === 'mobile' && mockCurrentPlan && (
            <Alert variant={new Date(mockCurrentPlan.expiryDate) < new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) ? "destructive" : "default"}>
                 <CalendarClock className="h-4 w-4" />
                 <AlertTitle>Current Plan Validity</AlertTitle>
                 <AlertDescription>
                    Your plan ({mockCurrentPlan.planName}) expires on {format(mockCurrentPlan.expiryDate, "PPP")}.
                    {new Date(mockCurrentPlan.expiryDate) < new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) && " Recharge soon!"}
                 </AlertDescription>
             </Alert>
         )}

        {/* Saved Numbers (Family Recharges) - Placeholder */}
        {type === 'mobile' && mockSavedNumbers.length > 0 && (
            <Card className="shadow-sm border-dashed">
                 <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4"/> Quick Recharge for Saved Numbers
                    </CardTitle>
                </CardHeader>
                 <CardContent className="flex gap-2 overflow-x-auto pb-3">
                     {mockSavedNumbers.map(saved => (
                        <Button
                            key={saved.id}
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => handleSelectSavedNumber(saved.number)}
                        >
                           {saved.name} ({saved.number.slice(-4)})
                        </Button>
                     ))}
                 </CardContent>
            </Card>
        )}


        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Enter Details</CardTitle>
            {/* <CardDescription>Please provide the details for your {type} payment.</CardDescription> */}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecharge} className="space-y-4">
              {/* Identifier Input (Mobile No, DTH ID, etc.) */}
              <div className="space-y-2 relative">
                <Label htmlFor="identifier">{identifierLabel}</Label>
                <Input
                  id="identifier"
                  type={type === 'mobile' ? 'tel' : 'text'}
                  placeholder={`Enter ${identifierLabel}`}
                  ref={inputRef}
                  pattern={type === 'mobile' ? '[0-9]{10}' : undefined} // HTML5 validation for mobile
                  value={identifier}
                  onChange={(e) => {
                     setIdentifier(e.target.value);
                     // Reset operator detection if number changes
                     if (type === 'mobile') {
                        setDetectedOperator(null);
                        setSelectedBiller('');
                        setIsManualOperatorSelect(false);
                     }
                  }}
                  required
                  className="pr-10" // Make space for detection button
                />
                {/* Operator Detection Button - Mobile Only */}
                {type === 'mobile' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-[26px] h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={detectOperator}
                    disabled={isDetecting || !identifier.match(/^[6-9]\d{9}$/)}
                    title="Detect Operator"
                  >
                    {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                )}
              </div>

               {/* Recharge History Section (collapsible) */}
               {type === 'mobile' && rechargeHistory.length > 0 && (
                     <Accordion type="single" collapsible className="w-full" value={showHistory ? "history" : ""} onValueChange={(value) => setShowHistory(value === "history")}>
                        <AccordionItem value="history" className="border-b-0">
                            <AccordionTrigger className="text-sm text-muted-foreground py-1 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                Show Previous Recharges for this Number ({rechargeHistory.length})
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 space-y-2">
                                {isHistoryLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : rechargeHistory.map(entry => (
                                    <div key={entry.transactionId} className="flex justify-between items-center text-xs p-2 border rounded-md">
                                         <div>
                                             <p>₹{entry.amount} on {format(entry.date, "PP")}</p>
                                             <p className="text-muted-foreground">{entry.status} {entry.planDescription ? `- ${entry.planDescription}` : ''}</p>
                                         </div>
                                        <Button size="xs" variant="outline" onClick={() => handleQuickRecharge(entry)}>Recharge Again</Button>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}


              {/* Operator/Biller Select */}
              {(billers.length > 0 || detectedOperator) && ['mobile', 'dth', 'fastag'].includes(type) && (
                <div className="space-y-2">
                  <Label htmlFor="biller">Operator</Label>
                  {detectedOperator && !isManualOperatorSelect ? (
                     <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                        <p className="text-sm font-medium">{detectedOperator.billerName}</p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setIsManualOperatorSelect(true)}>Change</Button>
                    </div>
                  ) : (
                    <Select value={selectedBiller} onValueChange={setSelectedBiller} required>
                      <SelectTrigger id="biller">
                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Operator"} />
                      </SelectTrigger>
                      <SelectContent>
                        {billers.map((biller) => (
                          <SelectItem key={biller.billerId} value={biller.billerId}>
                            {biller.billerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {error && !isLoading && <p className="text-sm text-destructive">{error}</p>}
                </div>
              )}
               {/* Loading indicator specifically for operators */}
               {isLoading && !billers.length && !detectedOperator && ['mobile', 'dth', 'fastag'].includes(type) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading operators...
                  </div>
               )}


              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter Amount or Select Plan"
                      value={amount}
                      onChange={(e) => {setAmount(e.target.value); setSelectedPlan(null);}} // Deselect plan if amount typed manually
                      required
                      min="1" // Basic validation
                       step="0.01"
                       className="pl-7"
                    />
                 </div>
                 {selectedPlan && (
                      <Badge variant="secondary" className="mt-1 font-normal">Selected: {selectedPlan.description}</Badge>
                 )}
              </div>

              {/* Plan Browser (Mobile/DTH/FASTag Only) */}
               {['mobile', 'dth', 'fastag'].includes(type) && selectedBiller && (
                <Card className="mt-4 border-dashed">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                         <CardTitle className="text-md flex items-center gap-1"><BadgePercent className="h-4 w-4"/> Available Plans</CardTitle>
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
                       <div className="flex items-center justify-center py-4">
                         <Loader2 className="h-6 w-6 animate-spin text-primary" />
                         <p className="ml-2 text-sm text-muted-foreground">
                            {isRecommending ? 'Finding best plans for you...' : 'Loading plans...'}
                         </p>
                       </div>
                     ) : planCategories.length === 0 && rechargePlans.length > 0 ? (
                         // Case where search yields no results but plans are loaded
                         <p className="text-sm text-muted-foreground text-center py-4">No plans found matching your search.</p>
                      ) : rechargePlans.length === 0 ? (
                       <p className="text-sm text-muted-foreground text-center py-4">No plans available for {selectedBillerName}.</p>
                     ) : (
                       <Tabs defaultValue={planCategories[0] || 'Popular'} className="w-full">
                         <TabsList className="h-auto p-1 mb-2 flex flex-wrap justify-start">
                            {planCategories.map(category => (
                                <TabsTrigger key={category} value={category} className="text-xs px-2 py-1 flex items-center gap-1 h-7">
                                     {category === 'Recommended' && <Star className="h-3 w-3 text-yellow-500" />}
                                      {category === 'Offers' && <Gift className="h-3 w-3 text-red-500" />}
                                     {category} ({filteredPlansByCategory[category]?.length || 0})
                                </TabsTrigger>
                            ))}
                         </TabsList>
                         {planCategories.map(category => (
                            <TabsContent key={category} value={category} className="mt-0">
                                <Accordion type="single" collapsible className="w-full">
                                {filteredPlansByCategory[category] && filteredPlansByCategory[category].length > 0 ? filteredPlansByCategory[category].map(plan => (
                                    <AccordionItem key={plan.planId} value={plan.planId} className="border-b">
                                    <div className="flex items-center w-full hover:bg-accent/50 transition-colors rounded-t-md">
                                         <Checkbox
                                            id={`compare-${plan.planId}`}
                                            className="ml-2 mr-2 shrink-0" // Adjusted margin
                                            checked={plansToCompare.some(p => p.planId === plan.planId)}
                                            onCheckedChange={(checked) => handleCompareCheckbox(plan, checked)}
                                            disabled={plansToCompare.length >= 3 && !plansToCompare.some(p => p.planId === plan.planId)}
                                            aria-label={`Compare ${plan.description}`}
                                        />
                                        <AccordionTrigger className="flex-grow py-2 text-left text-sm hover:no-underline px-2">
                                            <div className="flex justify-between items-center w-full">
                                                <span className="font-medium">₹{plan.price}</span>
                                                <span className="text-xs text-muted-foreground mx-2 flex-1 text-left truncate">{plan.description}</span>
                                                 {plan.isOffer && <Badge variant="destructive" className="text-xs h-5 px-1.5 mr-2 shrink-0">Offer</Badge>}
                                                  {category === 'Recommended' && <Star className="h-3 w-3 text-yellow-500 mr-2 shrink-0"/>}
                                            </div>
                                        </AccordionTrigger>
                                    </div>
                                    <AccordionContent className="pb-3 pt-2 pl-10 pr-2 bg-muted/30 rounded-b-md"> {/* Indent content */}
                                        <ul className="space-y-1 text-xs text-muted-foreground">
                                            <li><strong>Validity:</strong> {plan.validity || 'N/A'}</li>
                                            <li><strong>Data:</strong> {plan.data || 'N/A'}</li>
                                            {plan.talktime !== undefined && <li><strong>Talktime:</strong> {plan.talktime === -1 ? 'Unlimited' : `₹${plan.talktime}`}</li>}
                                            {plan.sms !== undefined && <li><strong>SMS:</strong> {plan.sms === -1 ? 'Unlimited' : plan.sms}</li>}
                                        </ul>
                                        <div className="flex gap-2 mt-2">
                                            <Button variant="default" size="xs" className="h-6 px-2 text-xs bg-lime-600 hover:bg-lime-700" onClick={() => handlePlanSelect(plan)}>
                                                Select Plan
                                            </Button>
                                            <Button variant="outline" size="xs" className="h-6 px-2 text-xs" onClick={() => openTariffModal(plan)}>
                                                <Info className="h-3 w-3 mr-1"/> Details
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                    </AccordionItem>
                                )) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No plans found in this category.</p>
                                )}
                                </Accordion>
                            </TabsContent>
                         ))}
                       </Tabs>
                     )}
                   </CardContent>
                 </Card>
               )}

              {error && <p className="text-sm text-destructive mt-2">{error}</p>}

              {/* Scheduled Recharge Placeholder */}
               <Button variant="outline" className="w-full" disabled>
                  <Clock className="mr-2 h-4 w-4"/> Schedule This Recharge (Coming Soon)
               </Button>

              <Button type="submit" className="w-full bg-lime-500 hover:bg-lime-600 text-white" disabled={isLoading}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 Proceed to Pay ₹{amount || '0'}
              </Button>
            </form>
          </CardContent>
        </Card>

         {/* Plan Comparison Modal */}
         <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
            <DialogContent className="sm:max-w-[90%] md:max-w-[600px]"> {/* Wider modal */}
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
                    <p className="text-xs text-muted-foreground pt-2">Note: Benefits are subject to operator terms and conditions. This is a placeholder for detailed tariff information.</p>
                     {/* Placeholder for Top-up Voucher info if applicable */}
                     {showTariffModal?.category === 'Top-up' && <p className="text-xs text-blue-600 pt-1">This is a top-up voucher. Balance will be added to your main account.</p>}
                 </div>
                <DialogFooter>
                     <Button variant="secondary" onClick={() => handlePlanSelect(showTariffModal!)}>Select Plan</Button>
                     <Button onClick={() => setShowTariffModal(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      </main>
    </div>
  );
}


// Helper needed for date formatting
import { format } from 'date-fns';
