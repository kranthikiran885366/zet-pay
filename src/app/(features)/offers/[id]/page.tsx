
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Tag, Gift, Sparkles, Info, CalendarDays, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getOffers, Offer } from '@/services/offers'; // Use actual service
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Mock Offer Details (replace with actual data fetching)
const mockOfferDetails = (id: string): Offer & { terms: string, validity: string, claimed?: boolean } | null => {
    // Find base offer
    const baseOffer = mockOffersData.find(o => o.offerId === id);
    if (!baseOffer) return null;

    // Add specific details
    return {
        ...baseOffer,
        terms: `1. Offer applicable on minimum spend of ₹500.\n2. Valid only for payments made via PayFriend UPI.\n3. Cashback will be credited within 24 hours.\n4. Offer cannot be clubbed with other promotions.`,
        validity: `Valid until ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, // Expires in 7 days
        claimed: id === '1', // Simulate offer '1' being claimed
    };
};

// Mock data used by the details function
const mockOffersData: Offer[] = [
    { offerId: '1', description: 'Flat ₹100 Cashback on Electricity Bill Payment over ₹1000', imageUrl: 'https://picsum.photos/seed/electricity_lg/600/300', offerType: 'Cashback' },
    { offerId: '2', description: 'Get 20% off up to ₹150 on Movie Tickets', imageUrl: 'https://picsum.photos/seed/movie_lg/600/300', offerType: 'Coupon' },
    { offerId: '3', description: 'Upto ₹50 Cashback on Mobile Recharge', imageUrl: 'https://picsum.photos/seed/recharge_lg/600/300', offerType: 'Cashback' },
     // Add other offers matching those on the main offers page
];


export default function OfferDetailsPage() {
  const params = useParams();
  const offerId = typeof params.id === 'string' ? params.id : '';
  const [offer, setOffer] = useState<Offer & { terms: string, validity: string, claimed?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const { toast } = useToast();

   useEffect(() => {
    const fetchOfferDetails = async () => {
      if (!offerId) {
          setIsLoading(false);
          toast({variant: "destructive", title: "Invalid Offer ID"});
          return;
      };
      setIsLoading(true);
      try {
        // Simulate fetching details - replace with actual API call
        // const fetchedOffer = await getOfferDetails(offerId);
        const fetchedOffer = mockOfferDetails(offerId); // Use mock function
        if (!fetchedOffer) {
             throw new Error("Offer not found");
        }
        setOffer(fetchedOffer);
      } catch (error: any) {
        console.error("Failed to fetch offer details:", error);
        toast({ variant: "destructive", title: "Could not load offer details", description: error.message });
         setOffer(null); // Ensure offer is null on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchOfferDetails();
  }, [offerId, toast]);

   const handleClaimOffer = async () => {
     if (!offer || offer.claimed) return;

     setIsClaiming(true);
     try {
        // TODO: Call actual API to claim the offer
        console.log(`Claiming offer ${offer.offerId}`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
        setOffer(prev => prev ? {...prev, claimed: true} : null);
        toast({title: "Offer Claimed Successfully!"});
     } catch (error) {
        console.error("Failed to claim offer:", error);
        toast({variant: "destructive", title: "Failed to claim offer"});
     } finally {
        setIsClaiming(false);
     }
   }

  const Icon = offer?.offerType === 'Cashback' ? Sparkles : Tag;
  const accentColor = offer?.offerType === 'Cashback' ? 'text-yellow-700' : 'text-blue-700';


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/offers" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Gift className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Offer Details</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
         {isLoading && (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
         )}

         {!isLoading && !offer && (
             <Card className="shadow-md text-center">
                <CardContent className="p-6">
                    <p className="text-muted-foreground">Offer not found or failed to load.</p>
                    <Link href="/offers" passHref>
                        <Button variant="link" className="mt-2">Back to Offers</Button>
                    </Link>
                </CardContent>
            </Card>
         )}

         {!isLoading && offer && (
             <Card className="shadow-md overflow-hidden">
                 <div className="relative w-full h-48 md:h-64">
                     <Image
                        src={offer.imageUrl}
                        alt={offer.description}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="offer promotion banner large"
                     />
                 </div>
                <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <CardTitle className="text-xl mb-1">{offer.description}</CardTitle>
                            <Badge variant={offer.offerType === 'Cashback' ? 'default' : 'secondary'} className={`flex items-center w-fit ${accentColor.replace('text-', 'bg-').replace('-700', '-100')}`}>
                                <Icon className={`h-4 w-4 mr-1 ${accentColor}`} />
                                {offer.offerType}
                            </Badge>
                        </div>
                        {offer.claimed && (
                             <Badge variant="outline" className="text-green-600 border-green-600 flex items-center shrink-0">
                                <Check className="h-4 w-4 mr-1"/> Claimed
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold mb-1 flex items-center"><CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" /> Validity</h3>
                        <p className="text-sm text-muted-foreground">{offer.validity}</p>
                    </div>

                    <Separator />

                     <div>
                        <h3 className="text-sm font-semibold mb-1 flex items-center"><Info className="h-4 w-4 mr-1 text-muted-foreground" /> Terms & Conditions</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{offer.terms}</p>
                    </div>

                    {!offer.claimed && (
                        <Button
                            className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                            onClick={handleClaimOffer}
                            disabled={isClaiming}
                        >
                           {isClaiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" /> }
                           {isClaiming ? 'Claiming...' : 'Claim Offer Now'}
                        </Button>
                    )}
                     {offer.claimed && (
                         <Button className="w-full" variant="outline" disabled>
                            Offer Already Claimed
                        </Button>
                    )}
                </CardContent>
             </Card>
         )}
      </main>
    </div>
  );
}
