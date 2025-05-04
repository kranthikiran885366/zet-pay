'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Users, Gift as GiftIcon, Copy, Loader2, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getLoyaltyStatus, getReferralStatus, getScratchCards, scratchCard, LoyaltyStatus, ReferralStatus, ScratchCardData } from '@/services/offers'; // Use functions from offers service
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';


export default function RewardsPage() {
    const [loyalty, setLoyalty] = useState<LoyaltyStatus | null>(null);
    const [referral, setReferral] = useState<ReferralStatus | null>(null);
    const [scratchCards, setScratchCards] = useState<ScratchCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScratching, setIsScratching] = useState<string | null>(null); // Track which card is being scratched
    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [loyaltyData, referralData, scratchCardData] = await Promise.all([
                getLoyaltyStatus(),
                getReferralStatus(),
                getScratchCards()
            ]);
            setLoyalty(loyaltyData);
            setReferral(referralData);
            setScratchCards(scratchCardData.sort((a, b) => (a.isScratched ? 1 : 0) - (b.isScratched ? 1 : 0))); // Show unscratched first
        } catch (error) {
            console.error("Failed to fetch rewards data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load rewards information." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScratch = async (cardId: string) => {
        const card = scratchCards.find(c => c.id === cardId);
        if (!card || card.isScratched || isScratching) return;

        setIsScratching(cardId);
        try {
            const result = await scratchCard(cardId);
            // Update the specific card in the state
            setScratchCards(prev => prev.map(c =>
                c.id === cardId ? { ...c, isScratched: true, rewardAmount: result.rewardAmount, message: result.message } : c
            ).sort((a, b) => (a.isScratched ? 1 : 0) - (b.isScratched ? 1 : 0))); // Re-sort after scratching
            toast({ title: "Card Scratched!", description: result.message });
        } catch (error) {
            console.error("Failed to scratch card:", error);
            toast({ variant: "destructive", title: "Scratch Failed", description: "Could not scratch the card." });
        } finally {
            setIsScratching(null);
        }
    };

    const copyReferralCode = () => {
        if (!referral?.referralCode) return;
        navigator.clipboard.writeText(referral.referralCode).then(() => {
            toast({ title: "Referral Code Copied!" });
        }).catch(() => {
            toast({ variant: "destructive", title: "Copy Failed" });
        });
    };

    const getTierColor = (tier: string | undefined) => {
        switch (tier) {
            case 'Bronze': return 'bg-yellow-700/80';
            case 'Silver': return 'bg-slate-400';
            case 'Gold': return 'bg-yellow-500';
            case 'Platinum': return 'bg-blue-400';
            default: return 'bg-muted';
        }
    }

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/offers" passHref> {/* Or link back to profile */}
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Award className="h-6 w-6" />
                <h1 className="text-lg font-semibold">My Rewards & Loyalty</h1>
                 <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={fetchData} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                 </Button>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

                {!isLoading && (
                    <Tabs defaultValue="loyalty" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
                            <TabsTrigger value="referrals">Referrals</TabsTrigger>
                            <TabsTrigger value="scratch">Scratch Cards</TabsTrigger>
                        </TabsList>

                        {/* Loyalty Tab */}
                        <TabsContent value="loyalty">
                            {loyalty ? (
                                <Card className="shadow-md">
                                    <CardHeader className="text-center">
                                        <CardTitle className="flex flex-col items-center gap-2">
                                            <Badge className={`px-4 py-1 text-lg ${getTierColor(loyalty.tier)} text-white`}>{loyalty.tier} Tier</Badge>
                                            <span>{loyalty.points.toLocaleString()} Points</span>
                                        </CardTitle>
                                        <CardDescription>Your current loyalty status and benefits.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Progress Bar (Optional) */}
                                        {/* <Progress value={(loyalty.points % 1000) / 10} /> */}
                                        {/* <p className="text-xs text-muted-foreground text-center">{(1000 - (loyalty.points % 1000))} points to next tier</p> */}

                                        <div>
                                            <h4 className="font-semibold mb-1 text-sm">Your Benefits:</h4>
                                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                                {loyalty.benefits.map((benefit, index) => <li key={index}>{benefit}</li>)}
                                            </ul>
                                        </div>
                                        <Button variant="link" size="sm" className="w-full">Learn More About Tiers</Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="shadow-md text-center"><CardContent className="p-6 text-muted-foreground">Could not load loyalty status.</CardContent></Card>
                            )}
                        </TabsContent>

                        {/* Referrals Tab */}
                        <TabsContent value="referrals">
                             {referral ? (
                                <Card className="shadow-md">
                                    <CardHeader>
                                        <CardTitle>Refer & Earn</CardTitle>
                                        <CardDescription>Invite friends to PayFriend and earn rewards!</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                         <div className="text-center space-y-1">
                                             <p className="text-sm text-muted-foreground">Your Referral Code:</p>
                                             <div className="flex items-center justify-center gap-2 p-2 border border-dashed rounded-md">
                                                <span className="text-lg font-mono font-semibold text-primary">{referral.referralCode}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyReferralCode}>
                                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                             </div>
                                         </div>
                                         <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                                             <Users className="mr-2 h-4 w-4"/> Invite Friends
                                         </Button>
                                         <div className="grid grid-cols-3 gap-2 text-center text-sm pt-2">
                                             <div>
                                                <p className="font-semibold">{referral.successfulReferrals}</p>
                                                <p className="text-xs text-muted-foreground">Successful Referrals</p>
                                             </div>
                                              <div>
                                                <p className="font-semibold">{referral.pendingReferrals}</p>
                                                <p className="text-xs text-muted-foreground">Pending</p>
                                             </div>
                                              <div>
                                                <p className="font-semibold">₹{referral.totalEarnings}</p>
                                                <p className="text-xs text-muted-foreground">Total Earned</p>
                                             </div>
                                         </div>
                                          <Button variant="link" size="sm" className="w-full">Referral Program T&Cs</Button>
                                    </CardContent>
                                </Card>
                             ) : (
                                <Card className="shadow-md text-center"><CardContent className="p-6 text-muted-foreground">Could not load referral status.</CardContent></Card>
                             )}
                        </TabsContent>

                        {/* Scratch Cards Tab */}
                        <TabsContent value="scratch">
                             <Card className="shadow-md">
                                <CardHeader>
                                    <CardTitle>Your Scratch Cards</CardTitle>
                                    <CardDescription>Scratch cards you've earned from offers and payments.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-4">
                                    {scratchCards.length === 0 && <p className="col-span-full text-center text-muted-foreground py-4">No scratch cards available.</p>}
                                    {scratchCards.map((card) => (
                                        <div
                                            key={card.id}
                                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-center p-2 relative overflow-hidden cursor-pointer transition-all duration-300 ease-in-out transform ${
                                                 card.isScratched ? 'bg-muted border' : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md hover:scale-105'
                                            } ${isScratching === card.id ? 'animate-pulse' : ''}`}
                                            onClick={() => handleScratch(card.id)}
                                            style={{ perspective: '1000px' }} // Needed for potential flip effect
                                        >
                                            {/* Unscratched View */}
                                            {!card.isScratched && (
                                                 <>
                                                     <GiftIcon className="h-8 w-8 mb-1 opacity-90" />
                                                     <p className="text-xs font-semibold">{card.message}</p>
                                                     <p className="text-[10px] opacity-80 mt-1">Expires: {format(new Date(card.expiryDate), 'MMM d')}</p>
                                                      {isScratching === card.id && <Loader2 className="absolute top-1 right-1 h-3 w-3 animate-spin"/>}
                                                 </>
                                            )}

                                             {/* Scratched View */}
                                             {card.isScratched && (
                                                <div className="text-center">
                                                    {card.rewardAmount ? (
                                                        <>
                                                             <p className="text-xs text-muted-foreground">You won</p>
                                                             <p className="text-xl font-bold text-green-600">₹{card.rewardAmount}</p>
                                                        </>
                                                    ) : (
                                                        <p className="text-sm font-medium text-muted-foreground">{card.message}</p>
                                                    )}
                                                     <p className="text-[10px] text-muted-foreground mt-1">Scratched</p>
                                                </div>
                                             )}
                                        </div>
                                    ))}
                                </CardContent>
                             </Card>
                        </TabsContent>
                    </Tabs>
                 )}
            </main>
        </div>
    );
}
