
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Ticket, MapPin, CalendarDays, Loader2, Wallet, User, Image as ImageIcon, Upload, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from 'date-fns';
import { mockCitiesBusPass, mockOperatorsBusPass, mockPassTypesData } from '@/mock-data'; // Import centralized mock data

export interface BusPass { // Keep type definition if used internally
    id: string;
    name: string;
    price: number;
    duration: string;
    description: string;
    category: 'General' | 'Student';
}
export interface PurchasedPass { // Keep type definition if used internally
    passId: string;
    purchaseId: string;
    operatorName: string;
    operatorLogo?: string;
    passName: string;
    passengerName: string;
    passengerPhotoUrl?: string;
    validFrom: Date;
    validUntil: Date;
    status: 'Active' | 'Expired' | 'Pending Verification' | 'Rejected';
    qrCodeData?: string;
    downloadUrl?: string;
}


export default function BusPassApplicationPage() {
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedOperator, setSelectedOperator] = useState('');
    const [selectedPassType, setSelectedPassType] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [studentId, setStudentId] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const { toast } = useToast();
    const today = new Date();

    const operators = selectedCity ? mockOperatorsBusPass[selectedCity] : [];
    const passTypes = selectedOperator ? mockPassTypesData[selectedOperator] : [];

    const handleCityChange = (city: string) => {
        setSelectedCity(city);
        setSelectedOperator('');
        setSelectedPassType(null);
    };

    const handleOperatorChange = (operator: string) => {
        setSelectedOperator(operator);
        setSelectedPassType(null);
    };

    const handlePassTypeChange = (passId: string) => {
        setSelectedPassType(passId);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCity || !selectedOperator || !selectedPassType) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select city, operator, and pass type." });
            return;
        }

        if (mockPassTypesData[selectedOperator]?.find(pt => pt.id === selectedPassType)?.category === 'Student' && !studentId) {
            toast({ variant: "destructive", title: "Missing Student ID" });
            return;
        }
        if (!name || !dob || !gender || !address || !photo) {
            toast({ variant: "destructive", title: "Missing Required Fields", description: "Please fill in all the required fields." });
            return;
        }

        console.log("Submitting Bus Pass Application:", {
            selectedCity,
            selectedOperator,
            selectedPassType,
            name,
            dob: format(dob, 'yyyy-MM-dd'),
            gender,
            address,
            studentId,
            photo: photo.name,
        });

        toast({ title: "Application Submitted", description: "Your application has been submitted successfully. Please wait for verification." });
    };


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/passes/my-passes" passHref>
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
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Select value={selectedCity} onValueChange={handleCityChange} required>
                                    <SelectTrigger id="city">
                                        <SelectValue placeholder="Select a City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockCitiesBusPass.map((city) => (
                                            <SelectItem key={city} value={city}>{city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

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

                            {mockPassTypesData[selectedOperator]?.find(pt => pt.id === selectedPassType)?.category === 'Student' && (
                                <div className="space-y-2">
                                    <Label htmlFor="studentId">Student ID</Label>
                                    <Input type="text" id="studentId" placeholder="Enter your Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="photo">Upload Photo</Label>
                                <Input type="file" id="photo" accept="image/*" onChange={handlePhotoUpload} required />
                                {photo && (
                                    <p className="text-sm text-muted-foreground">Selected: {photo.name} ({photo.lastModified ? format(new Date(photo.lastModified), 'PPP') : ''})</p>
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
