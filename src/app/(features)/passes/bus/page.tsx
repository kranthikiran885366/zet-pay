'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Ticket, MapPin, CalendarDays, Loader2, Wallet, User, Image as ImageIcon, Upload, GraduationCap } from 'lucide-react'; // Added GraduationCap, Upload
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Added RadioGroup
import { format } from 'date-fns';

// Mock Data
const mockCities = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai'];
const mockOperators: { [city: string]: string[] } = {
    'Bangalore': ['BMTC', 'KSRTC City'],
    'Mumbai': ['BEST', 'NMMT'],
    'Delhi': ['DTC'],
    'Chennai': ['MTC'],
};

interface BusPass {
    id: string;
    name: string;
    price: number;
    duration: string;
    description: string;
    category: 'General' | 'Student';
}

const mockPassTypes: { [operator: string]: BusPass[] } = {
    'BMTC': [
        { id: 'bmtc-daily', name: 'Daily Pass', price: 70, duration: '1 Day', description: 'Unlimited travel on non-AC buses for one day.', category: 'General' },
        { id: 'bmtc-monthly-nonac', name: 'Monthly Pass (Non-AC)', price: 1050, duration: '1 Month', description: 'Unlimited travel on non-AC buses for one month.', category: 'General' },
        { id: 'bmtc-monthly-ac', name: 'Monthly Pass (AC Vajra)', price: 2500, duration: '1 Month', description: 'Unlimited travel on AC Vajra buses for one month.', category: 'General' },
        { id: 'bmtc-student-monthly', name: 'Student Monthly Pass', price: 200, duration: '1 Month', description: 'Concessional travel for students (Non-AC). Requires validation.', category: 'Student' },
    ],
    'BEST': [
        { id: 'best-daily', name: 'Daily Pass', price: 50, duration: '1 Day', description: 'Unlimited travel within city limits.', category: 'General' },
        { id: 'best-monthly', name: 'Monthly Pass', price: 800, duration: '1 Month', description: 'Monthly travel pass.', category: 'General' },
        { id: 'best-student-quarterly', name: 'Student Quarterly Pass', price: 300, duration: '3 Months', description: 'Concessional travel for students. Requires validation.', category: 'Student' },
    ],
     // Add more for other operators
};

export default function BusPassApplicationPage() {
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedOperator, setSelectedOperator] = useState('');
    const [selectedPassType, setSelectedPassType] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [studentId, setStudentId] = useState('');
    const [photo, setPhoto] = useState<File | null>(null); // State to hold the selected photo file
    const { toast } = useToast();
    const today = new Date();

    // Filter operators based on selected city
    const operators = selectedCity ? mockOperators[selectedCity] : [];
    const passTypes = selectedOperator ? mockPassTypes[selectedOperator] : [];

    const handleCityChange = (city: string) => {
        setSelectedCity(city);
        setSelectedOperator(''); // Reset operator on city change
        setSelectedPassType(null);
    };

    const handleOperatorChange = (operator: string) => {
        setSelectedOperator(operator);
        setSelectedPassType(null); // Reset pass type on operator change
    };

    const handlePassTypeChange = (passId: string) => {
        setSelectedPassType(passId);
    };

    // Photo upload
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCity || !selectedOperator || !selectedPassType) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select city, operator, and pass type." });
            return;
        }

        // Gather necessary information based on pass type (student vs general)
        if (mockPassTypes[selectedOperator]?.find(pt => pt.id === selectedPassType)?.category === 'Student' && !studentId) {
            toast({ variant: "destructive", title: "Missing Student ID" });
            return;
        }
        if (!name || !dob || !gender || !address || !photo) {
            toast({ variant: "destructive", title: "Missing Required Fields", description: "Please fill in all the required fields." });
            return;
        }

        // Submit data (replace with actual API call)
        console.log("Submitting Bus Pass Application:", {
            selectedCity,
            selectedOperator,
            selectedPassType,
            name,
            dob: format(dob, 'yyyy-MM-dd'),
            gender,
            address,
            studentId,
            photo: photo.name, // Send only the filename (handle file upload separately)
        });

        toast({ title: "Application Submitted", description: "Your application has been submitted successfully. Please wait for verification." });
        // TODO: Reset form and navigate
    };


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/passes/my-passes" passHref> {/* Link back to the my passes page */}
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Ticket className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Apply for Bus Pass</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Enter Your Details</CardTitle>
                        <CardDescription>Fill out the form below to apply for a bus pass.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* City Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Select value={selectedCity} onValueChange={handleCityChange} required>
                                    <SelectTrigger id="city">
                                        <SelectValue placeholder="Select a City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockCities.map((city) => (
                                            <SelectItem key={city} value={city}>{city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Operator Selection */}
                            {selectedCity && (
                                <div className="space-y-2">
                                    <Label htmlFor="operator">Operator</Label>
                                    <Select value={selectedOperator} onValueChange={handleOperatorChange} required>
                                        <SelectTrigger id="operator">
                                            <SelectValue placeholder="Select an Operator" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {operators.map((operator) => (
                                                <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Pass Type Selection */}
                            {selectedOperator && (
                                <div className="space-y-2">
                                    <Label htmlFor="passType">Pass Type</Label>
                                    <Select value={selectedPassType || ''} onValueChange={handlePassTypeChange} required>
                                        <SelectTrigger id="passType">
                                            <SelectValue placeholder="Select a Pass Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {passTypes.map((pass) => (
                                                <SelectItem key={pass.id} value={pass.id}>
                                                    {pass.name} - ₹{pass.price} ({pass.duration})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Personal Details */}
                            <Separator/>
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input type="text" id="name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                 <Input type="date" id="dob" max={format(today, 'yyyy-MM-dd')} value={dob ? format(dob, 'yyyy-MM-dd') : ''} onChange={(e) => setDob(e.target.value ? new Date(e.target.value) : null)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <RadioGroup defaultValue={gender} className="flex gap-4" onValueChange={setGender} required>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="male" id="male" />
                                        <Label htmlFor="male">Male</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="female" id="female" />
                                        <Label htmlFor="female">Female</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="other" id="other" />
                                        <Label htmlFor="other">Other</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input type="text" id="address" placeholder="Enter your address" value={address} onChange={(e) => setAddress(e.target.value)} required />
                            </div>

                            {/* Student Specific Fields */}
                            {mockPassTypes[selectedOperator]?.find(pt => pt.id === selectedPassType)?.category === 'Student' && (
                                <div className="space-y-2">
                                    <Label htmlFor="studentId">Student ID</Label>
                                    <Input type="text" id="studentId" placeholder="Enter your Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
                                </div>
                            )}

                            {/* Photo Upload */}
                            <div className="space-y-2">
                                <Label htmlFor="photo">Upload Photo</Label>
                                <Input type="file" id="photo" accept="image/*" onChange={handlePhotoUpload} required />
                                {photo && (
                                    <p className="text-sm text-muted-foreground">Selected: {photo.name} ({format(photo.lastModified, 'PPP')})</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white">
                                Submit Application
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
