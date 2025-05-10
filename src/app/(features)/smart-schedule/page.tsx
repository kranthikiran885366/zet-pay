'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CalendarClock, PlusCircle, MapPin, Utensils, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


export default function SmartSchedulePage() {
    const [tripName, setTripName] = useState('');
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [interests, setInterests] = useState(''); // Comma-separated
    const [generatedSchedule, setGeneratedSchedule] = useState<any | null>(null); // Replace 'any' with Schedule interface
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setGeneratedSchedule(null);
        // TODO: Call AI backend to generate schedule
        console.log("Generating schedule for:", { tripName, destination, startDate, endDate, interests });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
        // Mock response
        setGeneratedSchedule({
            title: `Your Trip to ${destination}`,
            days: [
                { day: 1, date: startDate ? format(startDate, 'PPP') : '', activities: [{time: '09:00 AM', activity: 'Visit Famous Landmark', type: 'sightseeing'}, {time: '01:00 PM', activity: `Lunch at 'Local Delights'`, type: 'food'}, {time: '03:00 PM', activity: 'Explore Museum', type: 'sightseeing'}] },
                { day: 2, date: endDate ? format(endDate, 'PPP') : '', activities: [{time: '10:00 AM', activity: 'Shopping at City Center', type: 'activity'}, {time: '07:00 PM', activity: `Dinner at 'Rooftop Grill'`, type: 'food'}] },
            ]
        });
        setIsLoading(false);
    };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <CalendarClock className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Smart Schedule Builder</h1>
      </header>

      <main className="flex-grow p-4 space-y-4 pb-20">
          <Card className="shadow-md">
              <CardHeader>
                  <CardTitle>Plan Your Trip or Day</CardTitle>
                  <CardDescription>Let AI help you create an optimized schedule for travel, work, and food.</CardDescription>
              </CardHeader>
              <CardContent>
                  <form onSubmit={handleGenerateSchedule} className="space-y-4">
                      <div className="space-y-1"><Label htmlFor="tripName">Trip/Schedule Name</Label><Input id="tripName" placeholder="e.g., Goa Adventure, Productive Work Day" value={tripName} onChange={e=>setTripName(e.target.value)} required/></div>
                      <div className="space-y-1"><Label htmlFor="destination">Destination/Focus Area</Label><Input id="destination" placeholder="e.g., North Goa, Work Tasks" value={destination} onChange={e=>setDestination(e.target.value)} required/></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1"><Label htmlFor="startDate">Start Date</Label><Popover><PopoverTrigger asChild><Button id="startDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{startDate ? format(startDate, "PPP") : <span>Pick date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent></Popover></div>
                          <div className="space-y-1"><Label htmlFor="endDate">End Date</Label><Popover><PopoverTrigger asChild><Button id="endDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{endDate ? format(endDate, "PPP") : <span>Pick date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => startDate ? date < startDate : false} initialFocus /></PopoverContent></Popover></div>
                      </div>
                      <div className="space-y-1"><Label htmlFor="interests">Interests/Activities (Optional)</Label><Input id="interests" placeholder="e.g., Beaches, History, Coding, Meetings" value={interests} onChange={e=>setInterests(e.target.value)}/></div>
                      <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>} Generate Schedule</Button>
                  </form>
              </CardContent>
          </Card>

          {generatedSchedule && (
             <Card className="shadow-md mt-6">
                <CardHeader><CardTitle>{generatedSchedule.title}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {generatedSchedule.days.map((day: any) => (
                        <div key={day.day}>
                            <h3 className="font-semibold text-md mb-1">Day {day.day} ({day.date})</h3>
                            <ul className="space-y-2">
                                {day.activities.map((act: any, index: number) => (
                                    <li key={index} className="flex items-start gap-2 p-2 border rounded-md bg-muted/50">
                                        {act.type === 'sightseeing' && <MapPin className="h-4 w-4 text-primary mt-0.5"/>}
                                        {act.type === 'food' && <Utensils className="h-4 w-4 text-orange-500 mt-0.5"/>}
                                        {act.type === 'activity' && <Briefcase className="h-4 w-4 text-blue-500 mt-0.5"/>}
                                        <div>
                                            <p className="text-sm font-medium">{act.time} - {act.activity}</p>
                                            {/* Add more details if provided by AI */}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    <div className="flex gap-2 mt-4">
                        <Button variant="outline" className="w-full">Save Schedule</Button>
                        <Button className="w-full">Export to Calendar</Button>
                    </div>
                </CardContent>
             </Card>
          )}

      </main>
    </div>
  );
}
// Added CalendarIcon import for consistency
import { CalendarDays as CalendarIcon } from 'lucide-react';
