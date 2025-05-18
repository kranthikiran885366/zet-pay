'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Trash2, Bus, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { FavoriteRoute } from '@/mock-data/liveTracking';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function FavoriteRoutesPage() {
    const { toast } = useToast();
    const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        try {
            const storedFavorites = localStorage.getItem('nbsFavorites');
            if (storedFavorites) {
                setFavorites(JSON.parse(storedFavorites));
            }
        } catch (error) {
            console.error("Error loading favorites from localStorage:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load saved favorites." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const removeFavorite = (id: string) => {
        const updatedFavorites = favorites.filter(fav => fav.id !== id);
        setFavorites(updatedFavorites);
        try {
            localStorage.setItem('nbsFavorites', JSON.stringify(updatedFavorites));
            toast({ description: "Removed from Favourites!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not update favorites." });
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/live/bus" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Heart className="h-6 w-6" />
                <h1 className="text-lg font-semibold">My Favourite Routes & Stops</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                {isLoading && <p className="text-center text-muted-foreground">Loading favorites...</p>}
                {!isLoading && favorites.length === 0 && (
                    <Card className="text-center shadow-md">
                        <CardContent className="p-6">
                            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground">You haven't saved any favorite routes or stops yet.</p>
                            <p className="text-xs text-muted-foreground mt-1">You can add them from search results or stop details.</p>
                        </CardContent>
                    </Card>
                )}
                {!isLoading && favorites.length > 0 && (
                    <div className="space-y-3">
                        {favorites.map(fav => (
                            <Card key={fav.id} className="p-3 border rounded-lg shadow-sm flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                   {fav.type === 'route' ? <Bus className="h-5 w-5 text-primary"/> : <MapPin className="h-5 w-5 text-primary"/>}
                                    <div>
                                        <p className="text-sm font-semibold">{fav.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {fav.type === 'route' ? `${fav.details.from} to ${fav.details.to}` : fav.details.address}
                                        </p>
                                    </div>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Remove Favorite?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to remove "{fav.name}" from your favorites?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => removeFavorite(fav.id)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
