'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, WandSparkles, Gift, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const mockOccasions = ["Birthday", "Anniversary", "Wedding", "Festival (Diwali, Christmas, etc.)", "Graduation", "Thank You", "Just Because"];
const mockRelationships = ["Friend", "Parent", "Sibling", "Spouse/Partner", "Colleague", "Child", "Other Family"];
const mockInterests = ["Tech", "Books", "Travel", "Fashion", "Foodie", "Sports", "Gaming", "Art & Decor", "Wellness"];

export default function AiGiftingAssistantPage() {
    const [occasion, setOccasion] = useState('');
    const [relationship, setRelationship] = useState('');
    const [interests, setInterests] = useState<string[]>([]); // Allow multiple interests
    const [budget, setBudget] = useState('');
    const [ageRange, setAgeRange] = useState('');
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [giftSuggestions, setGiftSuggestions] = useState<any[]>([]); // Replace 'any' with GiftSuggestion interface
    const [isLoading, setIsLoading] = useState(false);

    const handleGetSuggestions = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setGiftSuggestions([]);
        console.log("Getting gift suggestions for:", { occasion, relationship, interests, budget, ageRange, additionalInfo });
        // TODO: Call AI backend to get gift suggestions
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
        setGiftSuggestions([ // Mock suggestions
            { id: 'g1', name: 'Smart Watch', category: 'Tech', priceRange: '₹3000-₹10000', relevance: 0.9, imageUrl: 'https://picsum.photos/seed/smartwatch_gift/200/200', dataAiHint: 'smartwatch gift' },
            { id: 'g2', name: 'Personalized Novel', category: 'Books', priceRange: '₹500-₹1500', relevance: 0.8, imageUrl: 'https://picsum.photos/seed/novel_gift/200/200', dataAiHint: 'personalized novel book' },
            { id: 'g3', name: 'Gourmet Food Basket', category: 'Foodie', priceRange: '₹1000-₹3000', relevance: 0.85, imageUrl: 'https://picsum.photos/seed/foodbasket_gift/200/200', dataAiHint: 'gourmet food basket' },
        ]);
        setIsLoading(false);
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
                            <Label htmlFor="occasion">Occasion</Label>
                            <Select value={occasion} onValueChange={setOccasion}><SelectTrigger id="occasion"><SelectValue placeholder="Select Occasion"/></SelectTrigger><SelectContent>{mockOccasions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="relationship">Relationship</Label>
                            <Select value={relationship} onValueChange={setRelationship}><SelectTrigger id="relationship"><SelectValue placeholder="Select Relationship"/></SelectTrigger><SelectContent>{mockRelationships.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                          <Label htmlFor="interests">Interests (select multiple if applicable, or type)</Label>
                          {/* TODO: Implement multi-select or tag input for interests */}
                          <Input id="interests" placeholder="e.g., Reading, Gaming, Travel" onChange={(e) => setInterests(e.target.value.split(','))} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="budget">Budget (Approx. ₹)</Label>
                            <Input id="budget" type="number" placeholder="e.g., 1000" value={budget} onChange={e=>setBudget(e.target.value)}/>
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="ageRange">Age Range (Optional)</Label>
                            <Input id="ageRange" placeholder="e.g., 25-35" value={ageRange} onChange={e=>setAgeRange(e.target.value)}/>
                        </div>
                      </div>
                       <div className="space-y-1">
                          <Label htmlFor="additionalInfo">Any Other Details? (Optional)</Label>
                          <Textarea id="additionalInfo" placeholder="e.g., Prefers handmade items, loves color blue..." value={additionalInfo} onChange={e=>setAdditionalInfo(e.target.value)}/>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                          Get Gift Suggestions
                      </Button>
                  </form>
              </CardContent>
          </Card>

          {giftSuggestions.length > 0 && (
            <Card className="shadow-md mt-6">
                <CardHeader>
                    <CardTitle>Gift Ideas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {giftSuggestions.map(gift => (
                        <Card key={gift.id} className="overflow-hidden">
                            <div className="relative w-full h-32 bg-muted">
                                <Image src={gift.imageUrl} alt={gift.name} layout="fill" objectFit="cover" data-ai-hint={gift.dataAiHint}/>
                            </div>
                            <div className="p-3">
                                <h3 className="font-semibold text-sm truncate">{gift.name}</h3>
                                <p className="text-xs text-muted-foreground">{gift.category}</p>
                                <p className="text-sm font-medium mt-1">{gift.priceRange}</p>
                                <Button size="sm" variant="outline" className="w-full mt-2 text-xs">View Details</Button>
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
