
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Train, CalendarIcon, Search, ArrowRightLeft, Loader2, Users, Wallet, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { mockStations, mockQuotas, mockClasses, mockTrainAvailability, TrainAvailability, AvailabilityStatus, PnrStatus } from '@/mock-data'; // Import centralized mock data

export default function TrainBookingPage() {
    const [activeTab, setActiveTab] = useState('search');
    const [pnrNumber, setPnrNumber] = useState('');
    const [pnrStatusResult, setPnrStatusResult] = useState<PnrStatus | null>(null);
    const [isLoadingPnr, setIsLoadingPnr] = useState(false);

    const [fromStation, setFromStation] = useState('');
    const [toStation, setToStation] = useState('');
    const [journeyDate, setJourneyDate] = useState<Date | undefined>(new Date());
    const [selectedQuota, setSelectedQuota] = useState('GENERAL');
    const [searchResults, setSearchResults] = useState<TrainAvailability[]>([]);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedTrain, setSelectedTrain] = useState<TrainAvailability | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    const { toast } = useToast();

    const handlePnrCheck = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!pnrNumber || pnrNumber.length !== 10) {
            toast({ variant: "destructive", title: "Invalid PNR", description: "Please enter a valid 10-digit PNR number." });
            return;
        }
        setIsLoadingPnr(true);
        setPnrStatusResult(null);
        console.log("Checking PNR:", pnrNumber);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (pnrNumber === '1234567890') {
                setPnrStatusResult({ pnr: pnrNumber, trainNumber: '12658', trainName: 'Bengaluru Mail', journeyDate: format(new Date(), 'dd-MMM-yyyy'), bookingStatus: 'WL 15', currentStatus: 'RAC 5', chartPrepared: false, passengers: [{ seat: 'S4, 32', status: 'RAC 5' }] });
            } else if (pnrNumber === '9876543210') {
                 setPnrStatusResult({ pnr: pnrNumber, trainNumber: '22691', trainName: 'Rajdhani Express', journeyDate: format(new Date(), 'dd-MMM-yyyy'), bookingStatus: 'CNF', currentStatus: 'CNF', chartPrepared: true, passengers: [{ seat: 'B2, 15', status: 'CNF' }] });
            } else {
                 toast({ variant: "destructive", title: "PNR Not Found" });
            }
        } catch (error) {
            console.error("PNR check failed:", error);
            toast({ variant: "destructive", title: "Error Checking PNR", description: "Could not fetch PNR status." });
        } finally {
            setIsLoadingPnr(false);
        }
    };

    const handleSearchTrains = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromStation || !toStation || !journeyDate || !selectedQuota) {
            toast({ variant: "destructive", title: "Please fill all fields" });
            return;
        }
        setIsLoadingSearch(true);
        setShowResults(false);
        setSearchResults([]);
        setSelectedTrain(null);
        setSelectedClass(null);
        console.log("Searching Trains:", { fromStation, toStation, date: format(journeyDate, 'yyyy-MM-dd'), quota: selectedQuota });
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const results = mockTrainAvailability.filter(train =>
                train.departureStation === fromStation && train.arrivalStation === toStation
            );
            setSearchResults(results);
            setShowResults(true);
             if (results.length === 0) {
                toast({ description: "No trains found for this route/date/quota." });
            }
        } catch (error) {
            console.error("Train search failed:", error);
            toast({ variant: "destructive", title: "Search Failed", description: "Could not fetch train availability." });
        } finally {
            setIsLoadingSearch(false);
        }
    };

     const handleSelectTrainClass = (train: TrainAvailability, classCode: string) => {
        setSelectedTrain(train);
        setSelectedClass(classCode);
         console.log("Selected Train:", train.trainNumber, "Class:", classCode);
         toast({title: "Proceeding to Booking", description: `Selected ${classCode} for ${train.trainName} (${train.trainNumber})`});
         alert(`Book ${classCode} on ${train.trainName}?`);
    };


    const swapStations = () => {
        setFromStation(toStation);
        setToStation(fromStation);
    };

    const getStationName = (code: string) => mockStations.find(s => s.code === code)?.name || code;
    const getAvailabilityColor = (status: AvailabilityStatus['status']) => {
        switch (status) {
            case 'AVAILABLE': return 'text-green-600';
            case 'WL': return 'text-orange-600';
            case 'RAC': return 'text-blue-600';
            case 'NOT AVAILABLE':
            case 'CHARTING DONE': return 'text-red-600';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Train className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Train Tickets</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="search">Book Tickets</TabsTrigger>
                        <TabsTrigger value="pnr">PNR Status</TabsTrigger>
                    </TabsList>

                    <TabsContent value="search">
                        {!showResults ? (
                            <Card className="shadow-md">
                                <CardHeader>
                                    <CardTitle>Search for Trains</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSearchTrains} className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="fromStation">From Station</Label>
                                                <Select value={fromStation} onValueChange={setFromStation} required>
                                                    <SelectTrigger id="fromStation"><SelectValue placeholder="Select Origin" /></SelectTrigger>
                                                    <SelectContent>
                                                        {mockStations.map(stn => <SelectItem key={`from-${stn.code}`} value={stn.code}>{stn.name} ({stn.code})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={swapStations}>
                                                <ArrowRightLeft className="h-4 w-4 text-primary" />
                                            </Button>
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="toStation">To Station</Label>
                                                <Select value={toStation} onValueChange={setToStation} required>
                                                    <SelectTrigger id="toStation"><SelectValue placeholder="Select Destination" /></SelectTrigger>
                                                    <SelectContent>
                                                         {mockStations.map(stn => <SelectItem key={`to-${stn.code}`} value={stn.code}>{stn.name} ({stn.code})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                             <div className="space-y-1">
                                                <Label htmlFor="journeyDate">Date of Journey</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button id="journeyDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !journeyDate && "text-muted-foreground")}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {journeyDate ? format(journeyDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={journeyDate} onSelect={setJourneyDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                             <div className="space-y-1">
                                                <Label htmlFor="quota">Quota</Label>
                                                <Select value={selectedQuota} onValueChange={setSelectedQuota} required>
                                                    <SelectTrigger id="quota"><SelectValue placeholder="Select Quota" /></SelectTrigger>
                                                    <SelectContent>
                                                        {mockQuotas.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoadingSearch}>
                                            {isLoadingSearch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                            {isLoadingSearch ? 'Searching...' : 'Search Trains'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                 <Button variant="outline" onClick={() => setShowResults(false)} className="mb-4">
                                     <ArrowLeft className="mr-2 h-4 w-4"/> Modify Search
                                 </Button>
                                 <h2 className="text-lg font-semibold">{searchResults.length} Trains Found</h2>
                                 {searchResults.map(train => (
                                     <Card key={train.trainNumber} className="shadow-sm">
                                        <CardHeader className="pb-2">
                                             <CardTitle className="text-base">{train.trainName} ({train.trainNumber})</CardTitle>
                                             <CardDescription className="text-xs flex flex-wrap gap-x-4">
                                                 <span>Runs on: {train.runningDays.join(', ')}</span>
                                                 <span>Duration: {train.duration}</span>
                                             </CardDescription>
                                             <div className="flex justify-between items-center text-xs pt-1">
                                                 <span>Dep: {getStationName(train.departureStation)} ({train.departureTime})</span>
                                                 <span>Arr: {getStationName(train.arrivalStation)} ({train.arrivalTime})</span>
                                             </div>
                                         </CardHeader>
                                        <CardContent>
                                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                 {train.classesAvailable.map(classCode => {
                                                     const avail = train.availability[classCode];
                                                     if (!avail) return null;
                                                      const colorClass = getAvailabilityColor(avail.status);
                                                      const text = `${avail.status}${avail.number !== undefined ? ` ${avail.number}` : ''}`;
                                                      const canBook = avail.status === 'AVAILABLE' || avail.status === 'RAC' || avail.status === 'WL';

                                                     return (
                                                         <Button
                                                             key={classCode}
                                                             variant="outline"
                                                             className={cn("flex flex-col h-auto p-2 text-center", canBook ? "cursor-pointer" : "cursor-not-allowed opacity-60")}
                                                             onClick={() => canBook && handleSelectTrainClass(train, classCode)}
                                                             disabled={!canBook}
                                                         >
                                                             <span className="font-semibold">{classCode}</span>
                                                             <span className={cn("text-xs font-medium", colorClass)}>{text}</span>
                                                             {avail.confirmProbability !== undefined && <span className="text-[10px] text-muted-foreground">({avail.confirmProbability}% chance)</span>}
                                                         </Button>
                                                     );
                                                 })}
                                             </div>
                                        </CardContent>
                                     </Card>
                                 ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="pnr">
                        <Card className="shadow-md">
                             <CardHeader>
                                <CardTitle>Check PNR Status</CardTitle>
                                <CardDescription>Enter your 10-digit PNR number to check the status.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handlePnrCheck} className="flex gap-2 mb-4">
                                    <Input
                                        id="pnrNumber"
                                        type="text"
                                        maxLength={10}
                                        placeholder="Enter 10-digit PNR"
                                        value={pnrNumber}
                                        onChange={(e) => setPnrNumber(e.target.value.replace(/\D/g, ''))}
                                        required
                                        pattern="[0-9]{10}"
                                        className="text-lg tracking-wider"
                                    />
                                    <Button type="submit" disabled={isLoadingPnr}>
                                         {isLoadingPnr ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                        Check
                                    </Button>
                                </form>

                                {isLoadingPnr && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}

                                {pnrStatusResult && (
                                    <div className="border border-border rounded-md p-4 space-y-2">
                                         <p className="text-lg font-bold text-primary">PNR: {pnrStatusResult.pnr}</p>
                                         <Separator/>
                                         <p><strong>Train:</strong> {pnrStatusResult.trainName} ({pnrStatusResult.trainNumber})</p>
                                         <p><strong>Journey Date:</strong> {pnrStatusResult.journeyDate}</p>
                                         <p><strong>Booking Status:</strong> {pnrStatusResult.bookingStatus}</p>
                                         <p><strong>Current Status:</strong> <span className="font-semibold">{pnrStatusResult.currentStatus}</span></p>
                                         <p><strong>Charting Status:</strong> {pnrStatusResult.chartPrepared ? <Badge variant="default" className="bg-green-100 text-green-700">Chart Prepared</Badge> : <Badge variant="secondary">Chart Not Prepared</Badge>}</p>
                                          <div>
                                            <strong>Passengers:</strong>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                {pnrStatusResult.passengers.map((p, i) => <li key={i}>{p.seat} - {p.status}</li>)}
                                            </ul>
                                          </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
