'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, PlusCircle, Trash2, Star, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getSavedCards, deleteCard, setPrimaryCard, CardDetails, payWithSavedCard } from '@/services/cards'; // Import card service, including payWithSavedCard
import { Badge } from '@/components/ui/badge';
import { isBefore, addMonths, parse } from 'date-fns'; // Import date-fns functions

export default function SavedCardsPage() {
    const [cards, setCards] = useState<CardDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null); // Track which card is being processed
    const { toast } = useToast();

    // Fetch saved cards on mount
    useEffect(() => {
        const fetchCards = async () => {
            setIsLoading(true);
            try {
                const fetchedCards = await getSavedCards();
                setCards(fetchedCards);
                // Check for expiring cards after fetching
                checkCardExpiry(fetchedCards);
            } catch (error) {
                console.error("Failed to fetch saved cards:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load saved cards." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchCards();
    }, [toast]);

     // Function to check and notify about expiring cards
    const checkCardExpiry = (savedCards: CardDetails[]) => {
        const now = new Date();
        const twoMonthsFromNow = addMonths(now, 2); // Check cards expiring within 2 months

        savedCards.forEach(card => {
             try {
                // Parse expiry date (assuming YYYY format for year)
                 // Use 1st day of the month *after* expiry month for comparison
                 const expiryDate = parse(`${card.expiryMonth}/${card.expiryYear}`, 'MM/yyyy', new Date());
                 const expiryCheckDate = addMonths(expiryDate, 1); // Compare against the start of the month *after* expiry
                 expiryCheckDate.setDate(1);
                 expiryCheckDate.setHours(0,0,0,0);


                if (isBefore(expiryCheckDate, twoMonthsFromNow)) { // If expiry is within the next 2 months (or already past)
                    toast({
                        variant: "default", // Use default variant for warnings
                         title: `Card Expiring Soon: ...${card.last4}`,
                         description: `Your ${card.bankName || card.cardIssuer} ${card.cardType} card expires on ${card.expiryMonth}/${card.expiryYear}. Please update or add a new card.`,
                         duration: 10000, // Longer duration for warning
                    });
                }
            } catch(e){
                 console.error(`Error parsing expiry date for card ...${card.last4}: ${card.expiryMonth}/${card.expiryYear}`, e)
            }
        });
    };


    const handleDelete = async (cardId: string) => {
        const cardToDelete = cards.find(c => c.id === cardId);
        if (!cardToDelete) return;

        if (cardToDelete.isPrimary) {
            toast({ variant: "destructive", title: "Cannot Delete Primary", description: "Please set another card as primary before deleting." });
            return;
        }

        setIsProcessing(cardId);
        try {
            const success = await deleteCard(cardId);
            if (success) {
                setCards(prev => prev.filter(c => c.id !== cardId));
                toast({ title: "Card Deleted", description: `Card ending in ${cardToDelete.last4} has been removed.` });
            } else {
                throw new Error("Deletion failed via service.");
            }
        } catch (error: any) { // Added 'any' type for error
            console.error("Failed to delete card:", error);
            toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "Could not delete the card." });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleSetPrimary = async (cardId: string) => {
        const cardToSet = cards.find(c => c.id === cardId);
        if (!cardToSet || cardToSet.isPrimary) return;

        setIsProcessing(cardId);
        try {
            const success = await setPrimaryCard(cardId);
            if (success) {
                setCards(prev => prev.map(c => ({ ...c, isPrimary: c.id === cardId })));
                toast({ title: "Primary Card Set", description: `Card ending in ${cardToSet.last4} is now your primary card.` });
            } else {
                 throw new Error("Setting primary failed via service.");
            }
        } catch (error: any) { // Added 'any' type for error
            console.error("Failed to set primary card:", error);
            toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not set the primary card." });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleAddNewCard = () => {
        // TODO: Navigate to or open a secure card adding flow (e.g., using a payment gateway SDK)
        alert("Add New Card flow not implemented. This should use a secure method.");
    };

    // Simulate payment attempt to trigger retry flow
     const simulateFailedPaymentAndRetry = async (card: CardDetails) => {
        const amount = 1500; // Example amount that might fail
        const cvv = '123'; // Example CVV
        const purpose = "Simulated Bill Payment";

        toast({ title: "Simulating Payment...", description: `Trying card ...${card.last4}` });
        setIsProcessing(card.id);
        try {
             const result = await payWithSavedCard(card.id, amount, cvv, purpose);
             if (result.success) {
                 toast({ title: "Payment Successful", description: result.message });
             } else {
                 toast({ variant: "destructive", title: "Payment Failed", description: `${result.message}` });
                 if (result.retryWithDifferentMethod) {
                     // **Trigger Retry Flow Here**
                     // In a real UI, you'd show a modal or prompt allowing the user to select another card or wallet.
                     // For this simulation, we'll just log it.
                     console.log("Payment failed, suggesting retry with another method.");
                     alert(`Payment with card ...${card.last4} failed (${result.message}). You would normally be prompted to retry with another card or wallet here.`);
                     // Example: retryWithWallet() or showCardSelectionModal()
                 }
             }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Payment Error", description: error.message });
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/profile" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <CreditCard className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Saved Cards</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                <Button className="w-full" onClick={handleAddNewCard}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Debit/Credit Card
                </Button>

                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Your Saved Cards</CardTitle>
                        <CardDescription>Manage your saved payment methods.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

                        {!isLoading && cards.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-6">You haven't saved any cards yet.</p>
                        )}

                        {!isLoading && cards.map(card => {
                            // Check if card is expiring soon (within 2 months)
                            let isExpiringSoon = false;
                            try {
                                 const expiryDate = parse(`${card.expiryMonth}/${card.expiryYear}`, 'MM/yyyy', new Date());
                                 const expiryCheckDate = addMonths(expiryDate, 1);
                                 expiryCheckDate.setDate(1);
                                 expiryCheckDate.setHours(0,0,0,0);
                                 isExpiringSoon = isBefore(expiryCheckDate, addMonths(new Date(), 2));
                            } catch(e){
                                console.error("Date parse error in render", e)
                            }

                            return (
                            <Card key={card.id} className="p-4 border shadow-sm relative overflow-hidden flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CreditCard className={`h-8 w-8 ${card.cardType === 'Credit' ? 'text-blue-600' : 'text-green-600'}`} />
                                    <div>
                                        <p className="font-semibold flex items-center flex-wrap gap-x-2">
                                            <span>{card.bankName || card.cardIssuer || 'Card'} ending in {card.last4}</span>
                                            {card.isPrimary && <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary"><Star className="h-3 w-3 mr-1"/> Primary</Badge>}
                                            {isExpiringSoon && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1"/> Expires Soon</Badge>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Expires: {card.expiryMonth}/{card.expiryYear} • {card.cardType}</p>
                                        {/* Button to simulate payment failure */}
                                        {/* <Button size="xs" variant="outline" className='mt-1' onClick={() => simulateFailedPaymentAndRetry(card)}>Simulate Payment</Button> */}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                     {!card.isPrimary && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            onClick={() => handleSetPrimary(card.id)}
                                            disabled={isProcessing === card.id}
                                            title="Set as Primary"
                                        >
                                            <Star className="h-4 w-4" />
                                        </Button>
                                     )}
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                disabled={isProcessing === card.id || card.isPrimary}
                                                title="Delete Card"
                                             >
                                                <Trash2 className="h-4 w-4" />
                                             </Button>
                                        </AlertDialogTrigger>
                                         <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Card?</AlertDialogTitle>
                                                 <AlertDialogDescription>
                                                     Are you sure you want to remove the card ending in {card.last4}? You will need to add it again for future payments.
                                                 </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(card.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                 {isProcessing === card.id && (
                                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                 )}
                            </Card>
                            );
                        })}
                    </CardContent>
                </Card>

                 <Card className="shadow-md border-green-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700"><ShieldCheck className="h-5 w-5"/> Secure Payments</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>Your card details are securely stored and tokenized as per RBI guidelines.</p>
                        <p>We do not store your CVV number. You will be asked for it during payments.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
