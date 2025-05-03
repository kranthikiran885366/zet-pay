
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Tag, Gift, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getOffers, Offer } from '@/services/offers'; // Use actual service
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extend Offer interface for UI state if needed
interface DisplayOffer extends Offer {
  claimed?: boolean; // Example state
}

export default function OffersPage() {
  const [offers, setOffers] = useState<DisplayOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOffers = async () => {
      setIsLoading(true);
      try {
        const fetchedOffers = await getOffers();
        // You might add additional client-side state here, e.g., checking if claimed
        setOffers(fetchedOffers.map(offer => ({...offer, claimed: false /* Check actual status */})));
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
  const cashbackOffers = offers.filter(o => o.offerType === 'Cashback');
  const couponOffers = offers.filter(o => o.offerType === 'Coupon');
  const otherOffers = offers.filter(o => o.offerType !== 'Cashback' && o.offerType !== 'Coupon');


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
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
         <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">All Offers</TabsTrigger>
            <TabsTrigger value="cashback">Cashback</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            {/* Add more tabs if needed e.g., "Scratch Cards" */}
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
                 {/* Add content for other tabs if needed */}
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
    const Icon = offer.offerType === 'Cashback' ? Sparkles : Tag; // Example icon mapping
    const accentColor = offer.offerType === 'Cashback' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';

    return (
         <Card className="shadow-md overflow-hidden flex flex-col">
            <div className="relative w-full h-32">
                <Image
                    // Use a placeholder or the actual offer image
                    src={`https://picsum.photos/seed/${offer.offerId}/400/200`}
                    alt={offer.description}
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="offer promotion banner"
                />
                 <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${accentColor} flex items-center`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {offer.offerType}
                 </div>
            </div>
            <CardContent className="p-4 flex-grow flex flex-col justify-between">
                <p className="text-sm font-medium mb-2">{offer.description}</p>
                <Button
                    size="sm"
                    className="w-full mt-2 bg-[#32CD32] hover:bg-[#2AAE2A] text-white disabled:bg-muted disabled:text-muted-foreground"
                    onClick={() => onClaim(offer.offerId)}
                    disabled={offer.claimed}
                >
                    {offer.claimed ? 'Claimed' : 'Claim Offer'}
                </Button>
            </CardContent>
        </Card>
    )
}
