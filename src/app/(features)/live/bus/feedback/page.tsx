'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Star, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { mockFeedbackCategories } from '@/mock-data/liveTracking';

export default function CustomerFeedbackPage() {
    const { toast } = useToast();
    const [feedbackCategory, setFeedbackCategory] = useState('');
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackCategory || !feedbackComment.trim()) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select a category and provide your comments." });
            return;
        }
        setIsSubmittingFeedback(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            toast({ title: "Feedback Submitted!", description: "Thank you for your valuable feedback. We will review it shortly." });
            setFeedbackCategory('');
            setFeedbackRating(0);
            setFeedbackComment('');
        } catch (error) {
            toast({ variant: "destructive", title: "Submission Failed", description: "Could not submit your feedback. Please try again." });
        } finally {
            setIsSubmittingFeedback(false);
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
                <MessageCircle className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Customer Feedback</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Share Your Experience</CardTitle>
                        <CardDescription>Help us improve by providing your feedback or reporting any issues.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmitFeedback} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="feedback-category-page">Category</Label>
                                <Select value={feedbackCategory} onValueChange={setFeedbackCategory} required>
                                    <SelectTrigger id="feedback-category-page"><SelectValue placeholder="Select Feedback Category"/></SelectTrigger>
                                    <SelectContent>{mockFeedbackCategories.map(cat=><SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Rating (Optional)</Label>
                                <div className="flex items-center justify-start space-x-1.5 py-1">
                                    {[1,2,3,4,5].map(r => (
                                        <Star
                                            key={r}
                                            className={cn("h-7 w-7 cursor-pointer", feedbackRating >=r ? "text-yellow-400 fill-yellow-400":"text-muted-foreground hover:text-yellow-300")}
                                            onClick={()=>setFeedbackRating(r)}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="feedback-comment-page">Comments/Suggestions</Label>
                                <Textarea
                                    id="feedback-comment-page"
                                    placeholder="Enter your comments or describe the issue (max 500 chars)"
                                    value={feedbackComment}
                                    onChange={e=>setFeedbackComment(e.target.value)}
                                    required
                                    maxLength={500}
                                    rows={5}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmittingFeedback}>
                                {isSubmittingFeedback ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null} Submit Feedback
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
