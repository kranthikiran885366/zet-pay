'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Loader2, Users, Wallet, User, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

// Mock Data (Replace with actual API calls)
const mockTemples = [ // Reuse or fetch centrally
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)', requiresApproval: true, bookingFee: 500 },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust', requiresApproval: true, bookingFee: 200 },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board', requiresApproval: false, bookingFee: 0 }, // Example without fee/approval
];

export default function GroupVisitBookingPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [visitDate, setVisitDate] = useState<Date | undefined>();
    const [numberOfPersons, setNumberOfPersons] = useState<string>('');
    const [groupLeaderName, setGroupLeaderName] = useState('');
    const [groupLeaderMobile, setGroupLeaderMobile] = useState('');
    const [groupLeaderEmail, setGroupLeaderEmail] = useState('');
    const [specialRequests, setSpecialRequests] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const templeDetails = mockTemples.find(t => t.id === selectedTemple);
    const bookingFee = templeDetails?.bookingFee || 0;

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemple || !visitDate || !numberOfPersons || Number(numberOfPersons) <= 1 || !groupLeaderName || !groupLeaderMobile || !groupLeaderEmail) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill all required fields (Group size must be &gt; 1)." });
            return;
        }

        setIsSubmitting(true);
        console.log("Submitting Group Visit Request:", {
            temple: selectedTemple,
            date: format(visitDate, 'yyyy-MM-dd'),
            persons: numberOfPersons,
            leaderName: groupLeaderName,
            leaderMobile: groupLeaderMobile,
            leaderEmail: groupLeaderEmail,
            requests: specialRequests,
            bookingFee
        });
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Request Submitted Successfully!", description: `Your group visit request for ${numberOfPersons} persons has been submitted${templeDetails?.requiresApproval ? '. You will be notified upon approval.' : '.'}` });
            // Reset form
            setSelectedTemple('');
            setVisitDate(undefined);
            setNumberOfPersons('');
            setGroupLeaderName('');
            setGroupLeaderMobile('');
            setGroupLeaderEmail('');
            setSpecialRequests('');
        } catch (err) {
            console.error("Group visit request failed:", err);
            toast({ variant: "destructive", title: "Submission Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Users className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Group Visit Booking</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Request a Group Visit</CardTitle>
                        <CardDescription>Submit details for group darshan or visits (often requires prior approval).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmitRequest} className="space-y-4">
                             {/* Temple Selection */}
                             <div className="space-y-1">
                                &lt;Label htmlFor="temple"&gt;Select Temple&lt;/Label&gt;
                                &lt;Select value={selectedTemple} onValueChange={setSelectedTemple} required&gt;
                                    &lt;SelectTrigger id="temple"&gt;&lt;SelectValue placeholder="Select Temple" /&gt;&lt;/SelectTrigger&gt;
                                    &lt;SelectContent&gt;
                                        {mockTemples.map(temple => &lt;SelectItem key={temple.id} value={temple.id}&gt;{temple.name}&lt;/SelectItem&gt;)}
                                    &lt;/SelectContent&gt;
                                &lt;/Select&gt;
                            &lt;/div&gt;

                             {/* Visit Date */}
                             &lt;div className="space-y-1"&gt;
                                &lt;Label htmlFor="visitDate"&gt;Preferred Visit Date&lt;/Label&gt;
                                &lt;Popover&gt;
                                    &lt;PopoverTrigger asChild&gt;
                                        &lt;Button id="visitDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !visitDate && "text-muted-foreground")}&gt;
                                            &lt;CalendarIcon className="mr-2 h-4 w-4" /&gt;
                                            {visitDate ? format(visitDate, "PPP") : &lt;span&gt;Pick a date&lt;/span&gt;}
                                        &lt;/Button&gt;
                                    &lt;/PopoverTrigger&gt;
                                    &lt;PopoverContent className="w-auto p-0"&gt;
                                        &lt;Calendar mode="single" selected={visitDate} onSelect={setVisitDate} initialFocus disabled={(date) => date &lt; new Date(new Date().setHours(0,0,0,0))}/&gt;
                                    &lt;/PopoverContent&gt;
                                &lt;/Popover&gt;
                            &lt;/div&gt;

                            {/* Number of Persons */}
                            &lt;div className="space-y-1"&gt;
                                &lt;Label htmlFor="persons"&gt;Number of Persons&lt;/Label&gt;
                                &lt;Input id="persons" type="number" min="2" placeholder="Enter total count (e.g., 15)" value={numberOfPersons} onChange={(e) => setNumberOfPersons(e.target.value)} required /&gt;
                            &lt;/div&gt;

                             &lt;Separator/&gt;

                            {/* Group Leader Details */}
                             &lt;p className="text-sm font-medium text-muted-foreground"&gt;Group Leader Contact Details&lt;/p&gt;
                             &lt;div className="grid grid-cols-1 sm:grid-cols-2 gap-4"&gt;
                                 &lt;div className="space-y-1"&gt;
                                    &lt;Label htmlFor="leaderName"&gt;Name&lt;/Label&gt;
                                    &lt;Input id="leaderName" placeholder="Leader's Full Name" value={groupLeaderName} onChange={(e) => setGroupLeaderName(e.target.value)} required/&gt;
                                 &lt;/div&gt;
                                  &lt;div className="space-y-1"&gt;
                                    &lt;Label htmlFor="leaderMobile"&gt;Mobile Number&lt;/Label&gt;
                                    &lt;Input id="leaderMobile" type="tel" placeholder="Leader's Mobile" value={groupLeaderMobile} onChange={(e) => setGroupLeaderMobile(e.target.value)} required/&gt;
                                &lt;/div&gt;
                             &lt;/div&gt;
                             &lt;div className="space-y-1"&gt;
                                &lt;Label htmlFor="leaderEmail"&gt;Email Address&lt;/Label&gt;
                                &lt;Input id="leaderEmail" type="email" placeholder="Leader's Email" value={groupLeaderEmail} onChange={(e) => setGroupLeaderEmail(e.target.value)} required/&gt;
                             &lt;/div&gt;


                             {/* Special Requests */}
                            &lt;div className="space-y-1"&gt;
                                &lt;Label htmlFor="requests"&gt;Special Requests (Optional)&lt;/Label&gt;
                                &lt;Textarea id="requests" placeholder="e.g., Wheelchair assistance, specific timing preferences" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} /&gt;
                            &lt;/div&gt;

                             {/* Booking Fee Info */}
                             {bookingFee > 0 && (
                                 &lt;p className="text-sm text-muted-foreground"&gt;A nominal booking fee of ₹{bookingFee} may apply upon approval.&lt;/p&gt;
                             )}


                            {/* Submit Button */}
                            &lt;div className="pt-4"&gt;
                                &lt;Separator className="mb-4"/&gt;
                                &lt;Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isSubmitting}
                                &gt;
                                    {isSubmitting ? &lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt; : &lt;Users className="mr-2 h-4 w-4" /&gt;}
                                    {isSubmitting ? 'Submitting...' : 'Submit Group Visit Request'}
                                &lt;/Button&gt;
                            &lt;/div&gt;
                        &lt;/form&gt;
                    &lt;/CardContent&gt;
                &lt;/Card&gt;
            &lt;/main&gt;
        &lt;/div&gt;
    );
}
