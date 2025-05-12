
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
import { mockTemplesData } from '@/mock-data'; // Import centralized mock data

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

    const templeDetails = mockTemplesData.find(t => t.id === selectedTemple);
    const bookingFee = templeDetails?.bookingFee || 0;

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemple || !visitDate || !numberOfPersons || Number(numberOfPersons) <= 1 || !groupLeaderName || !groupLeaderMobile || !groupLeaderEmail) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill all required fields (Group size must be > 1)." });
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
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Request Submitted Successfully!", description: `Your group visit request for ${numberOfPersons} persons has been submitted${templeDetails?.requiresApproval ? '. You will be notified upon approval.' : '.'}` });
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
                             <div className="space-y-1">
                                <Label htmlFor="temple">Select Temple</Label>
                                <Select value={selectedTemple} onValueChange={setSelectedTemple} required>
                                    <SelectTrigger id="temple"><SelectValue placeholder="Select Temple" /></SelectTrigger>
                                    <SelectContent>
                                        {mockTemplesData.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                             <div className="space-y-1">
                                <Label htmlFor="visitDate">Preferred Visit Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="visitDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !visitDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {visitDate ? format(visitDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={visitDate} onSelect={setVisitDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="persons">Number of Persons</Label>
                                <Input id="persons" type="number" min="2" placeholder="Enter total count (e.g., 15)" value={numberOfPersons} onChange={(e) => setNumberOfPersons(e.target.value)} required />
                            </div>

                             <Separator/>

                             <p className="text-sm font-medium text-muted-foreground">Group Leader Contact Details</p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                    <Label htmlFor="leaderName">Name</Label>
                                    <Input id="leaderName" placeholder="Leader's Full Name" value={groupLeaderName} onChange={(e) => setGroupLeaderName(e.target.value)} required/>
                                 </div>
                                  <div className="space-y-1">
                                    <Label htmlFor="leaderMobile">Mobile Number</Label>
                                    <Input id="leaderMobile" type="tel" placeholder="Leader's Mobile" value={groupLeaderMobile} onChange={(e) => setGroupLeaderMobile(e.target.value)} required/>
                                </div>
                             </div>
                             <div className="space-y-1">
                                <Label htmlFor="leaderEmail">Email Address</Label>
                                <Input id="leaderEmail" type="email" placeholder="Leader's Email" value={groupLeaderEmail} onChange={(e) => setGroupLeaderEmail(e.target.value)} required/>
                             </div>

                            <div className="space-y-1">
                                <Label htmlFor="requests">Special Requests (Optional)</Label>
                                <Textarea id="requests" placeholder="e.g., Wheelchair assistance, specific timing preferences" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
                            </div>

                             {bookingFee > 0 && (
                                 <p className="text-sm text-muted-foreground">A nominal booking fee of ₹{bookingFee} may apply upon approval.</p>
                             )}

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                                    {isSubmitting ? 'Submitting...' : 'Submit Group Visit Request'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
