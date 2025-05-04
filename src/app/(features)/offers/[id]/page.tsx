'use client';

import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Tag, Gift, Sparkles, Info, CalendarDays, Check, Loader2, Building } from 'lucide-react'; // Added Building
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getOfferDetails, Offer } from '@/services/offers'; // Use actual service
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns'; // To format dates

// Extend Offer interface for details page
interface OfferDetails extends Offer {
  terms: string;
  validity: string; // Keep as string for display, maybe store Date object too
  category?: 'Cashback' | 'Coupon' | 'Partner'; // Use category from list page
  claimed?: boolean;
}

// Keep using mock data source from service
// const mockOfferDetails = (id: string): OfferDetails | null => { ... };

export default function OfferDetailsPage() {
  const params = useParams();
  const router = useRouter(); // Initialize router
  const offerId = typeof params.id === 'string' ? params.id : '';
  const [offer, setOffer] = useState<OfferDetails | null>(null);
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
        // Replace with actual API call
        const fetchedOffer = await getOfferDetails(offerId);
        if (!fetchedOffer) {
             throw new Error("Offer not found");
        }
        // Map the fetched data to OfferDetails interface
        const details: OfferDetails = {
            ...fetchedOffer,
            terms: fetchedOffer.terms || "1. Standard T&Cs apply.\n2. Offer valid once per user.\n3. Cannot be clubbed with other offers.", // Default T&Cs
            validity: fetchedOffer.validUntil ? `Valid until ${format(new Date(fetchedOffer.validUntil), 'PPP')}` : "Validity not specified", // Format date
            category: fetchedOffer.offerType === 'Cashback' ? 'Cashback' :
                      fetchedOffer.offerType === 'Coupon' ? 'Coupon' :
                      'Partner', // Assign category
            claimed: false // Check actual claimed status from user data
        };
        setOffer(details);
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
        // Optionally redirect or update UI further
        // router.push('/profile/rewards');
     } catch (error) {
        console.error("Failed to claim offer:", error);
        toast({variant: "destructive", title: "Failed to claim offer"});
     } finally {
        setIsClaiming(false);
     }
   }

  const Icon = offer?.category === 'Cashback' ? Sparkles : offer?.category === 'Coupon' ? Tag : Building;
  const accentColor = offer?.category === 'Cashback' ? 'text-yellow-700' :
                      offer?.category === 'Coupon' ? 'text-blue-700' :
                      'text-purple-700'; // Example color for Partner
  const accentBgColor = offer?.category === 'Cashback' ? 'bg-yellow-100' :
                        offer?.category === 'Coupon' ? 'bg-blue-100' :
                        'bg-purple-100'; // Example bg color


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
      <main className="flex-grow p-4 pb-20">
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
                 <div className="relative w-full h-48 md:h-64 bg-muted">
                     <Image
                        src={offer.imageUrl || `https://picsum.photos/seed/${offer.offerId}_lg/600/300`}
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
                            <Badge variant={'secondary'} className={`flex items-center w-fit ${accentBgColor} ${accentColor}`}>
                                <Icon className={`h-4 w-4 mr-1 ${accentColor}`} />
                                {offer.category} Offer
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
                         <div className="text-sm text-muted-foreground whitespace-pre-line space-y-1 text-xs max-h-40 overflow-y-auto border rounded p-2 bg-muted/50">
                            {offer.terms.split('\n').map((line, index) => <p key={index}>{line}</p>)}
                         </div>
                    </div>

                    {!offer.claimed && (
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleClaimOffer}
                            disabled={isClaiming}
                        >
                           {isClaiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="mr-2 h-4 w-4" /> }
                           {isClaiming ? 'Claiming...' : 'Claim Offer Now'}
                        </Button>
                    )}
                     {offer.claimed && (
                         <Button className="w-full" variant="outline" disabled>
                            <Check className="mr-2 h-4 w-4" /> Offer Already Claimed
                        </Button>
                    )}
                </CardContent>
             </Card>
         )}
      </main>
    </div>
  );
}
