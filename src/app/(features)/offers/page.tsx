'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Tag, Gift, Sparkles, Loader2, Building } from 'lucide-react'; // Added Building for Partner
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getOffers, Offer } from '@/services/offers'; // Use actual service
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extend Offer interface for UI state if needed
interface DisplayOffer extends Offer {
  claimed?: boolean; // Example state
  category?: 'Cashback' | 'Coupon' | 'Partner'; // Added category for filtering
}

// Enhanced Mock Data
const mockOffersData: DisplayOffer[] = [
    { offerId: 'cashback1', description: 'Flat ₹50 Cashback on Electricity Bill Payment over ₹500', imageUrl: 'https://picsum.photos/seed/elec_cb/400/200', offerType: 'Cashback', category: 'Cashback' },
    { offerId: 'coupon1', description: 'Get 20% off up to ₹150 on Movie Tickets', imageUrl: 'https://picsum.photos/seed/movie_coupon/400/200', offerType: 'Coupon', category: 'Coupon' },
    { offerId: 'cashback2', description: 'Upto ₹25 Cashback on Mobile Recharge ₹199+', imageUrl: 'https://picsum.photos/seed/recharge_cb/400/200', offerType: 'Cashback', category: 'Cashback' },
    { offerId: 'partner1', description: '10% off on Zomato Orders via PayFriend', imageUrl: 'https://picsum.photos/seed/zomato_offer/400/200', offerType: 'Discount', category: 'Partner' },
    { offerId: 'coupon2', description: '₹100 OFF on Myntra Shopping over ₹1000', imageUrl: 'https://picsum.photos/seed/myntra_coupon/400/200', offerType: 'Coupon', category: 'Coupon' },
    { offerId: 'cashback3', description: '₹20 Cashback on first UPI Lite transaction', imageUrl: 'https://picsum.photos/seed/upilite_cb/400/200', offerType: 'Cashback', category: 'Cashback' },
];


export default function OffersPage() {
  const [offers, setOffers] = useState<DisplayOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOffers = async () => {
      setIsLoading(true);
      try {
        // Replace with actual API call: const fetchedOffers = await getOffers();
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
        // Assign categories based on offerType or other logic for demo
        const categorizedOffers = mockOffersData.map(offer => ({
            ...offer,
            claimed: false, // Check actual status
             // Simple categorization for demo
            category: offer.offerType === 'Cashback' ? 'Cashback' :
                      offer.offerType === 'Coupon' ? 'Coupon' :
                      'Partner' as any // Default to Partner for others
        }));
        setOffers(categorizedOffers);
      } catch (error) {
        console.error("Failed to fetch offers:", error);
        toast({ variant: "destructive", title: "Could not load offers" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOffers();
  }, [toast]);

  const handleClaimOffer = (offerId: string) => {
     // Simulate claiming
     setOffers(prev => prev.map(o => o.offerId === offerId ? {...o, claimed: true} : o));
     toast({title: "Offer Claimed!", description: "The offer has been added to your account."})
     // TODO: Call actual API to claim the offer
  }

   // Filter offers by type for tabs
  const cashbackOffers = offers.filter(o => o.category === 'Cashback');
  const couponOffers = offers.filter(o => o.category === 'Coupon');
  const partnerOffers = offers.filter(o => o.category === 'Partner');


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Gift className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Offers & Rewards</h1>
         {/* Optional: Link to Rewards/Loyalty page */}
         <Link href="/profile/rewards" passHref className='ml-auto'>
            <Button variant="secondary" size="sm" className='bg-primary/80 text-xs'>My Rewards</Button>
         </Link>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
         <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4"> {/* Adjusted to 4 cols */}
            <TabsTrigger value="all">All Offers</TabsTrigger>
            <TabsTrigger value="cashback">Cashback</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="partner">Partner</TabsTrigger> {/* Added Partner Tab */}
          </TabsList>

           {isLoading && (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading offers...</p>
                </div>
            )}

           {!isLoading && offers.length === 0 && (
                 <Card className="shadow-md text-center">
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">No offers available at the moment. Check back later!</p>
                    </CardContent>
                </Card>
           )}

           {/* Tab Content */}
           {!isLoading && offers.length > 0 && (
            <>
                <TabsContent value="all">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {offers.map((offer) => <OfferCard key={offer.offerId} offer={offer} onClaim={handleClaimOffer} />)}
                    </div>
                </TabsContent>
                <TabsContent value="cashback">
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {cashbackOffers.length > 0 ? cashbackOffers.map((offer) => <OfferCard key={offer.offerId} offer={offer} onClaim={handleClaimOffer} />) : <p className="text-muted-foreground col-span-full text-center py-4">No cashback offers found.</p>}
                    </div>
                </TabsContent>
                 <TabsContent value="coupons">
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {couponOffers.length > 0 ? couponOffers.map((offer) => <OfferCard key={offer.offerId} offer={offer} onClaim={handleClaimOffer} />) : <p className="text-muted-foreground col-span-full text-center py-4">No coupon offers found.</p>}
                    </div>
                </TabsContent>
                 <TabsContent value="partner"> {/* Added Partner Content */}
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {partnerOffers.length > 0 ? partnerOffers.map((offer) => <OfferCard key={offer.offerId} offer={offer} onClaim={handleClaimOffer} />) : <p className="text-muted-foreground col-span-full text-center py-4">No partner offers found.</p>}
                    </div>
                </TabsContent>
            </>
           )}

         </Tabs>

      </main>
    </div>
  );
}


// Offer Card Component
interface OfferCardProps {
    offer: DisplayOffer;
    onClaim: (offerId: string) => void;
}

function OfferCard({ offer, onClaim }: OfferCardProps) {
    const Icon = offer.category === 'Cashback' ? Sparkles : offer.category === 'Coupon' ? Tag : Building; // Choose icon based on category
    const accentColor = offer.category === 'Cashback' ? 'bg-yellow-100 text-yellow-700' :
                        offer.category === 'Coupon' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'; // Example color for Partner

    return (
         <Card className="shadow-md overflow-hidden flex flex-col transition-all hover:shadow-lg">
             <Link href={`/offers/${offer.offerId}`} passHref className='contents'>
                 <div className="relative w-full h-32 cursor-pointer">
                    <Image
                        // Use a placeholder or the actual offer image
                        src={offer.imageUrl || `https://picsum.photos/seed/${offer.offerId}/400/200`}
                        alt={offer.description}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="offer promotion banner"
                    />
                     <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${accentColor} flex items-center`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {offer.category}
                     </div>
                </div>
            </Link>
            <CardContent className="p-3 flex-grow flex flex-col justify-between">
                 <Link href={`/offers/${offer.offerId}`} passHref className='contents'>
                    <p className="text-sm font-medium mb-2 cursor-pointer hover:text-primary">{offer.description}</p>
                 </Link>
                <Button
                    size="sm"
                    variant={offer.claimed ? "secondary" : "default"}
                    className={`w-full mt-2 text-xs h-7 ${offer.claimed ? 'disabled:bg-muted disabled:text-muted-foreground' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    onClick={() => onClaim(offer.offerId)}
                    disabled={offer.claimed}
                >
                    {offer.claimed ? 'Claimed' : 'Claim Offer'}
                </Button>
            </CardContent>
        </Card>
    )
}
