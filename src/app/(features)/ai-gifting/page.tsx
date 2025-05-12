'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, WandSparkles, Gift, Search, Loader2 } from 'lucide-react'; // Added Loader2
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image'; // Import next/image
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Import types and server action from the Genkit flow
import { suggestGifts, SuggestGiftsInput, GiftSuggestion } from '@/ai/flows/gift-suggestion-flow';

const mockOccasions = ["Birthday", "Anniversary", "Wedding", "Festival (Diwali, Christmas, etc.)", "Graduation", "Thank You", "Just Because", "Housewarming", "New Baby", "Get Well Soon"];
const mockRelationships = ["Friend", "Parent", "Sibling", "Spouse/Partner", "Colleague", "Child", "Grandparent", "Teacher", "Boss", "Other Family"];
const mockInterestsData = ["Tech", "Books", "Travel", "Fashion", "Foodie", "Sports", "Gaming", "Art & Decor", "Wellness", "Music", "Movies", "Gardening", "Cooking", "Photography", "DIY Crafts"];

export default function AiGiftingAssistantPage() {
    const [occasion, setOccasion] = useState('');
    const [relationship, setRelationship] = useState('');
    const [interestsInput, setInterestsInput] = useState(''); // User types interests here
    const [budget, setBudget] = useState('');
    const [ageRange, setAgeRange] = useState('');
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [giftSuggestions, setGiftSuggestions] = useState<GiftSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGetSuggestions = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!occasion || !relationship || !interestsInput.trim()) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please select occasion, relationship, and enter at least one interest.",
            });
            return;
        }
        setIsLoading(true);
        setGiftSuggestions([]);

        const interestsArray = interestsInput.split(',').map(interest => interest.trim()).filter(interest => interest);

        const inputData: SuggestGiftsInput = {
            occasion,
            relationship,
            interests: interestsArray,
            budget: budget || undefined,
            ageRange: ageRange || undefined,
            additionalInfo: additionalInfo || undefined,
        };

        console.log("Getting gift suggestions for:", inputData);
        try {
            const suggestions = await suggestGifts(inputData);
            setGiftSuggestions(suggestions);
            if (suggestions.length === 0) {
                toast({
                    description: "No specific gift ideas found with current criteria. Try broadening your search!",
                });
            }
        } catch (error) {
            console.error("Error fetching gift suggestions:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not fetch gift suggestions. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <WandSparkles className="h-6 w-6" />
        <h1 className="text-lg font-semibold">AI Gifting Assistant</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
          <Card className="shadow-md">
              <CardHeader>
                  <CardTitle>Find the Perfect Gift</CardTitle>
                  <CardDescription>Tell us about the recipient and occasion, and our AI will suggest some great gift ideas.</CardDescription>
              </CardHeader>
              <CardContent>
                  <form onSubmit={handleGetSuggestions} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="occasion">Occasion *</Label>
                            <Select value={occasion} onValueChange={setOccasion} required><SelectTrigger id="occasion"><SelectValue placeholder="Select Occasion"/></SelectTrigger><SelectContent>{mockOccasions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="relationship">Relationship *</Label>
                            <Select value={relationship} onValueChange={setRelationship} required><SelectTrigger id="relationship"><SelectValue placeholder="Select Relationship"/></SelectTrigger><SelectContent>{mockRelationships.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                          <Label htmlFor="interests">Interests (comma-separated) *</Label>
                          <Input id="interests" placeholder="e.g., Reading, Gaming, Travel" value={interestsInput} onChange={(e) => setInterestsInput(e.target.value)} required />
                          <p className="text-xs text-muted-foreground">For multiple interests, separate with a comma.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="budget">Budget (Approx. ₹)</Label>
                            <Input id="budget" type="text" placeholder="e.g., 500-1000 or Under 2000" value={budget} onChange={e=>setBudget(e.target.value)}/>
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="ageRange">Age Range (Optional)</Label>
                            <Input id="ageRange" placeholder="e.g., 25-35, Teenager" value={ageRange} onChange={e=>setAgeRange(e.target.value)}/>
                        </div>
                      </div>
                       <div className="space-y-1">
                          <Label htmlFor="additionalInfo">Any Other Details? (Optional)</Label>
                          <Textarea id="additionalInfo" placeholder="e.g., Prefers handmade items, loves color blue, recently moved..." value={additionalInfo} onChange={e=>setAdditionalInfo(e.target.value)}/>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                          Get Gift Suggestions
                      </Button>
                  </form>
              </CardContent>
          </Card>

           {isLoading && giftSuggestions.length === 0 && (
            <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Finding amazing gifts...</p>
            </div>
           )}

          {giftSuggestions.length > 0 && !isLoading && (
            <Card className="shadow-md mt-6">
                <CardHeader>
                    <CardTitle>Gift Ideas For You</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {giftSuggestions.map(gift => (
                        <Card key={gift.id} className="overflow-hidden flex flex-col">
                            <div className="relative w-full h-40 bg-muted">
                                <Image src={gift.imageUrl || `https://picsum.photos/seed/${gift.id}/200/200`} alt={gift.name} layout="fill" objectFit="cover" data-ai-hint={gift.dataAiHint || gift.name}/>
                            </div>
                            <div className="p-3 flex flex-col flex-grow">
                                <h3 className="font-semibold text-sm truncate">{gift.name}</h3>
                                <p className="text-xs text-muted-foreground">{gift.category}</p>
                                <p className="text-xs text-muted-foreground mt-1 flex-grow">{gift.description}</p>
                                <p className="text-sm font-medium mt-2">{gift.priceRange}</p>
                                {gift.purchaseLink ? (
                                     <Button size="sm" variant="outline" className="w-full mt-2 text-xs" asChild>
                                        <a href={gift.purchaseLink} target="_blank" rel="noopener noreferrer">View Product</a>
                                     </Button>
                                ) : (
                                     <Button size="sm" variant="outline" className="w-full mt-2 text-xs" disabled>More Info Soon</Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </CardContent>
            </Card>
          )}
      </main>
    </div>
  );
}