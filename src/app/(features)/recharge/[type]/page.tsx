
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Smartphone, Tv, Bolt, RefreshCw, Loader2, Search, Info, BadgePercent, Star, GitCompareArrows } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller, RechargePlan } from '@/services/recharge'; // Import service and Plan interface
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { recommendRechargePlans, RecommendRechargePlansInput } from '@/ai/flows/recharge-plan-recommendation';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'; // Use Dialog for comparison

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Map types to icons and titles
const rechargeTypeDetails: { [key: string]: { icon: React.ElementType; title: string } } = {
  mobile: { icon: Smartphone, title: "Mobile Recharge" },
  dth: { icon: Tv, title: "DTH Recharge" },
  electricity: { icon: Bolt, title: "Electricity Bill" },
  // Add more types as needed
};

// Mock user usage data (replace with actual fetching)
const mockUsageHistory = {
    averageMonthlyDataUsageGB: 50, // GB
    averageMonthlyCallsMinutes: 600, // Minutes
    preferredPlanType: 'balanced' as const,
    budget: 300, // Rupees
};

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
  const { toast } = useToast();

  const details = rechargeTypeDetails[type] || rechargeTypeDetails.mobile; // Fallback to mobile details
  const inputRef = useRef<HTMLInputElement>(null);
  const identifierLabel = type === 'mobile' ? 'Mobile Number' : type === 'dth' ? 'DTH Subscriber ID' : 'Consumer Number';


  // Fetch Billers (Operators)
  useEffect(() => {
    async function fetchBillersData() {
      if (type !== 'mobile') return; // Only fetch for mobile for now
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

  // Handle Biller Selection Change
  useEffect(() => {
    if (selectedBiller) {
      const biller = billers.find(b => b.billerId === selectedBiller);
      setSelectedBillerName(biller?.billerName || '');
      fetchRechargePlans(); // Fetch plans when operator is selected
    } else {
      setRechargePlans([]); // Clear plans if operator is deselected
      setRecommendedPlanIds([]);
      setSelectedBillerName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBiller]);

  // Handle Plan Selection
  const handlePlanSelect = (plan: RechargePlan) => {
      setAmount(plan.price.toString());
      setSelectedPlan(plan);
      if (inputRef.current) { inputRef.current.focus(); } // Optional: focus amount input
      toast({ title: `Plan Selected: ₹${plan.price} - ${plan.description}` });
  };

  // Handle Payment Submission
  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    // Add validation here
    if (!selectedBiller || !identifier || !amount || Number(amount) <= 0) {
      setError("Please select operator, enter identifier, and a valid amount.");
      toast({ variant: "destructive", title: "Invalid Input" });
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
        description: `Recharge of ₹${amount} for ${identifier} (${selectedBillerName}) was successful.`,
      });
      // Reset relevant fields
      // setAmount('');
      // setSelectedPlan(null);
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
      await new Promise(resolve => setTimeout(resolve, 800));
      // Mock plans with categories and offers
      const mockPlans: RechargePlan[] = [
          { planId: 'p1', description: 'Unlimited Calls, 1.5GB/Day', price: 299, validity: '28 Days', data: '1.5GB/day', sms: 100, category: 'Popular', isOffer: false },
          { planId: 'p2', description: '50GB Data Pack', price: 149, validity: '30 Days', data: '50GB', category: 'Data', isOffer: false },
          { planId: 'p3', description: 'Talktime ₹100', price: 100, validity: 'Unlimited', data: 'N/A', talktime: 100, category: 'Top-up', isOffer: false },
          { planId: 'p4', description: 'Unlimited Calls, 2GB/Day + Disney+ Hotstar', price: 599, validity: '56 Days', data: '2GB/day', sms: 100, category: 'Entertainment', isOffer: true },
          { planId: 'p5', description: 'International Roaming Pack USA', price: 2999, validity: '30 Days', data: '5GB', talktime: 100, category: 'Roaming', isOffer: false },
          { planId: 'p6', description: 'Unlimited Calls, 1GB/Day - Annual', price: 1799, validity: '365 Days', data: '1GB/day', sms: 100, category: 'Annual', isOffer: false },
           { planId: 'p7', description: '₹20 Extra Talktime Offer', price: 200, validity: 'Unlimited', data: 'N/A', talktime: 220, category: 'Top-up', isOffer: true },
      ];
      setRechargePlans(mockPlans);
      // After fetching plans, get recommendations
      fetchRecommendations(mockPlans);
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
             if(result.reasoning) {
                toast({title: "Plan Recommendations", description: result.reasoning, duration: 5000});
            }
        } catch (error) {
            console.error("Failed to get recommendations:", error);
             toast({ variant: "destructive", title: "Could not get recommendations" });
        } finally {
            setIsRecommending(false);
        }
    };


  // Filter and group plans for display
  const { filteredPlans, planCategories } = useMemo(() => {
    let plans = rechargePlans;
    if (planSearchTerm) {
      plans = plans.filter(plan =>
        plan.description.toLowerCase().includes(planSearchTerm.toLowerCase()) ||
        plan.price.toString().includes(planSearchTerm) ||
        plan.category?.toLowerCase().includes(planSearchTerm.toLowerCase())
      );
    }
    const categories = ['Recommended', 'Popular', 'Data', 'Entertainment', 'Annual', 'Top-up', 'Roaming', 'Offers']; // Define order
    const grouped = plans.reduce((acc, plan) => {
       const category = recommendedPlanIds.includes(plan.planId) ? 'Recommended' : plan.isOffer ? 'Offers' : plan.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(plan);
      return acc;
    }, {} as Record<string, RechargePlan[]>);

     // Sort categories based on predefined order, placing 'Recommended' first if present
     const sortedCategories = Object.keys(grouped).sort((a, b) => {
        const indexA = categories.indexOf(a);
        const indexB = categories.indexOf(b);
        if (a === 'Recommended') return -1; // Always first
        if (b === 'Recommended') return 1;
        if (indexA === -1 && indexB === -1) return a.localeCompare(b); // Sort unknown categories alphabetically
        if (indexA === -1) return 1; // Unknown categories last
        if (indexB === -1) return -1;
        return indexA - indexB; // Sort by predefined order
     });


    return { filteredPlans: grouped, planCategories: sortedCategories };
  }, [rechargePlans, planSearchTerm, recommendedPlanIds]);


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
    setIsManualOperatorSelect(false); // Reset manual selection
    try {
      // TODO: Replace with actual API call: await detectMobileOperator(identifier);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockOperator: Biller = billers.length > 0 ? billers[0] : { billerId: 'mock-airtel', billerName: 'Airtel (Mock)', billerType: 'Mobile' }; // Simulate detection
      setDetectedOperator(mockOperator);
      setSelectedBiller(mockOperator.billerId); // Auto-select detected operator
      setSelectedBillerName(mockOperator.billerName);
      toast({
        title: "Operator Detected",
        description: `Operator detected as ${mockOperator.billerName}.`,
      });
    } catch (error) {
      console.error("Failed to detect operator:", error);
      toast({
        variant: "destructive",
        title: "Detection Failed",
        description: "Could not detect operator. Please select manually.",
      });
      setIsManualOperatorSelect(true); // Allow manual selection on failure
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
                // Uncheck the box visually if limit reached (requires managing checkbox state externally or finding another way)
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
        {/* Add other header elements like balance check icon if needed */}
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Enter Details</CardTitle>
            <CardDescription>Please provide the details for your {type} payment.</CardDescription>
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
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="pr-10" // Make space for detection button
                />
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

              {/* Operator/Biller Select */}
              {(billers.length > 0 || detectedOperator) && type === 'mobile' && (
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
              {isLoading && !billers.length && !detectedOperator && type === 'mobile' && <p className="text-sm text-muted-foreground">Loading operators...</p>}


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
                     <p className="text-xs text-muted-foreground mt-1">Selected Plan: {selectedPlan.description}</p>
                 )}
              </div>

              {/* Plan Browser (Mobile Only) */}
               {type === 'mobile' && selectedBiller && (
                <Card className="mt-4 border-dashed">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                         <CardTitle className="text-md flex items-center gap-1"><BadgePercent className="h-4 w-4"/> Available Plans</CardTitle>
                        {plansToCompare.length >= 2 && (
                             <Button variant="secondary" size="sm" onClick={openCompareModal}>
                                <GitCompareArrows className="mr-2 h-4 w-4"/> Compare ({plansToCompare.length})
                             </Button>
                        )}
                    </div>

                     <Input
                        type="search"
                        placeholder="Search plans (e.g., unlimited, 599, data)"
                        value={planSearchTerm}
                        onChange={(e) => setPlanSearchTerm(e.target.value)}
                        className="mt-2"
                    />
                  </CardHeader>
                   <CardContent>
                     {isPlanLoading || isRecommending ? (
                       <div className="flex items-center justify-center py-4">
                         <Loader2 className="h-6 w-6 animate-spin text-primary" />
                         <p className="ml-2 text-sm text-muted-foreground">Loading plans...</p>
                       </div>
                     ) : rechargePlans.length === 0 ? (
                       <p className="text-sm text-muted-foreground text-center py-4">No plans available for {selectedBillerName}.</p>
                     ) : (
                       <Tabs defaultValue={planCategories[0] || 'Popular'} className="w-full">
                         <TabsList className="overflow-x-auto justify-start h-auto p-1 mb-2">
                            {planCategories.map(category => (
                                <TabsTrigger key={category} value={category} className="text-xs px-2 py-1 flex items-center gap-1">
                                     {category === 'Recommended' && <Star className="h-3 w-3 text-yellow-500" />}
                                     {category} ({filteredPlans[category]?.length || 0})
                                </TabsTrigger>
                            ))}
                         </TabsList>
                         {planCategories.map(category => (
                            <TabsContent key={category} value={category}>
                                <Accordion type="single" collapsible className="w-full">
                                {filteredPlans[category] && filteredPlans[category].length > 0 ? filteredPlans[category].map(plan => (
                                    <AccordionItem key={plan.planId} value={plan.planId} className="border-b">
                                    <div className="flex items-center w-full">
                                         <Checkbox
                                            id={`compare-${plan.planId}`}
                                            className="mr-2 ml-1 shrink-0"
                                            checked={plansToCompare.some(p => p.planId === plan.planId)}
                                            onCheckedChange={(checked) => handleCompareCheckbox(plan, checked)}
                                            disabled={plansToCompare.length >= 3 && !plansToCompare.some(p => p.planId === plan.planId)}
                                            aria-label={`Compare ${plan.description}`}
                                        />
                                        <AccordionTrigger className="flex-grow py-3 text-left text-sm hover:no-underline">
                                            <div className="flex justify-between items-center w-full">
                                                <span>₹{plan.price} - {plan.description}</span>
                                                 {plan.isOffer && <span className="text-xs font-semibold text-destructive mr-2">Offer!</span>}
                                            </div>
                                        </AccordionTrigger>
                                    </div>
                                    <AccordionContent className="pb-3 pl-8">
                                        <ul className="list-none space-y-1 text-xs text-muted-foreground">
                                        <li><strong>Validity:</strong> {plan.validity}</li>
                                        <li><strong>Data:</strong> {plan.data}</li>
                                        {plan.talktime !== undefined && <li><strong>Talktime:</strong> {plan.talktime === -1 ? 'Unlimited' : `₹${plan.talktime}`}</li>}
                                        {plan.sms !== undefined && <li><strong>SMS:</strong> {plan.sms === -1 ? 'Unlimited' : plan.sms}</li>}
                                        </ul>
                                        <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-xs" onClick={() => handlePlanSelect(plan)}>
                                            Select this plan
                                        </Button>
                                        {/* Add Tariff Details link/modal trigger here */}
                                        <Button variant="ghost" size="sm" className="h-auto p-0 ml-2 text-xs text-muted-foreground" onClick={() => alert(`Details for plan ${plan.planId} (Not Implemented)`)}>
                                             <Info className="h-3 w-3 mr-1"/> Details
                                        </Button>
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

              {error && !isLoading && <p className="text-sm text-destructive mt-2">{error}</p>}

              <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoading}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 Proceed to Pay ₹{amount || '0'}
              </Button>
            </form>
          </CardContent>
        </Card>

         {/* Plan Comparison Modal */}
         <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Compare Plans</DialogTitle>
                    <DialogDescription>Compare the selected recharge plans side-by-side.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 grid-cols-1 sm:grid-cols-3"> {/* Adjust columns based on compare count */}
                    {plansToCompare.map(plan => (
                        <Card key={plan.planId} className="flex flex-col">
                            <CardHeader className="pb-2 bg-muted/50">
                                <CardTitle className="text-sm">₹{plan.price}</CardTitle>
                                <CardDescription className="text-xs">{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs pt-2 space-y-1 flex-grow">
                                <p><strong>Validity:</strong> {plan.validity}</p>
                                <p><strong>Data:</strong> {plan.data}</p>
                                {plan.talktime !== undefined && <p><strong>Talktime:</strong> {plan.talktime === -1 ? 'Unlimited' : `₹${plan.talktime}`}</p>}
                                {plan.sms !== undefined && <p><strong>SMS:</strong> {plan.sms === -1 ? 'Unlimited' : plan.sms}</p>}
                                {plan.category && <p><strong>Category:</strong> {plan.category}</p>}
                                {plan.isOffer && <p className="text-destructive font-semibold">Special Offer!</p>}
                            </CardContent>
                             <Button variant="outline" size="sm" className="m-4 mt-auto" onClick={() => {handlePlanSelect(plan); setIsCompareModalOpen(false);}}>
                                Select Plan
                            </Button>
                        </Card>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => { setPlansToCompare([]); setIsCompareModalOpen(false);}}>Clear Selection</Button>
                    <Button onClick={() => setIsCompareModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
