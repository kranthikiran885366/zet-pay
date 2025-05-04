'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, PlusCircle, Trash2, Star, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getSavedCards, deleteCard, setPrimaryCard, CardDetails } from '@/services/cards'; // Import card service
import { Badge } from '@/components/ui/badge';

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
            } catch (error) {
                console.error("Failed to fetch saved cards:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load saved cards." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchCards();
    }, [toast]);

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
        } catch (error) {
            console.error("Failed to delete card:", error);
            toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the card." });
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
        } catch (error) {
            console.error("Failed to set primary card:", error);
            toast({ variant: "destructive", title: "Update Failed", description: "Could not set the primary card." });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleAddNewCard = () => {
        // TODO: Navigate to or open a secure card adding flow (e.g., using a payment gateway SDK)
        alert("Add New Card flow not implemented. This should use a secure method.");
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

                        {!isLoading && cards.map(card => (
                            <Card key={card.id} className="p-4 border shadow-sm relative overflow-hidden flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CreditCard className={`h-8 w-8 ${card.cardType === 'Credit' ? 'text-blue-600' : 'text-green-600'}`} />
                                    <div>
                                        <p className="font-semibold flex items-center">
                                            {card.bankName || card.cardIssuer || 'Card'} ending in {card.last4}
                                            {card.isPrimary && <Badge variant="outline" className="ml-2 text-xs bg-primary/10 text-primary border-primary"><Star className="h-3 w-3 mr-1"/> Primary</Badge>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Expires: {card.expiryMonth}/{card.expiryYear} • {card.cardType}</p>
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
                        ))}
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
