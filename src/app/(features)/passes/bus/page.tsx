
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Ticket, MapPin, CalendarDays, Loader2, Wallet, User, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

// Mock Data
const mockCities = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai'];
const mockOperators: { [city: string]: string[] } = {
    'Bangalore': ['BMTC', 'KSRTC City'],
    'Mumbai': ['BEST', 'NMMT'],
    'Delhi': ['DTC'],
    'Chennai': ['MTC'],
};
const mockPassTypes: { [operator: string]: { id: string; name: string; price: number; duration: string; description: string }[] } = {
    'BMTC': [
        { id: 'bmtc-daily', name: 'Daily Pass', price: 70, duration: '1 Day', description: 'Unlimited travel on non-AC buses for one day.' },
        { id: 'bmtc-monthly-nonac', name: 'Monthly Pass (Non-AC)', price: 1050, duration: '1 Month', description: 'Unlimited travel on non-AC buses for one month.' },
        { id: 'bmtc-monthly-ac', name: 'Monthly Pass (AC Vajra)', price: 2500, duration: '1 Month', description: 'Unlimited travel on AC Vajra buses for one month.' },
    ],
    'BEST': [
        { id: 'best-daily', name: 'Daily Pass', price: 50, duration: '1 Day', description: 'Unlimited travel within city limits.' },
        { id: 'best-monthly', name: 'Monthly Pass', price: 800, duration: '1 Month', description: 'Monthly travel pass.' },
    ],
     // Add more for other operators
};


export default function BusPassPage() {
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedOperator, setSelectedOperator] = useState<string>('');
    const [selectedPassType, setSelectedPassType] = useState<string>('');
    const [passDetails, setPassDetails] = useState<{ name: string; price: number; duration: string; description: string } | null>(null);
    const [passengerName, setPassengerName] = useState('');
    const [passengerPhoto, setPassengerPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const handleCityChange = (city: string) => {
        setSelectedCity(city);
        setSelectedOperator(''); // Reset operator on city change
        setSelectedPassType('');
        setPassDetails(null);
    };

    const handleOperatorChange = (operator: string) => {
        setSelectedOperator(operator);
        setSelectedPassType(''); // Reset pass type on operator change
        setPassDetails(null);
    };

    const handlePassTypeChange = (passId: string) => {
        setSelectedPassType(passId);
        const pass = mockPassTypes[selectedOperator]?.find(p => p.id === passId) || null;
        setPassDetails(pass);
    };

     const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
             if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({ variant: "destructive", title: "File Too Large", description: "Please upload an image smaller than 2MB." });
                return;
            }
            setPassengerPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
             toast({ variant: "destructive", title: "Invalid File", description: "Please upload a valid image file." });
             setPassengerPhoto(null);
             setPhotoPreview(null);
        }
    };

    const handlePurchasePass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCity || !selectedOperator || !selectedPassType || !passDetails || !passengerName || !passengerPhoto) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill all fields and upload a photo." });
            return;
        }
        setIsProcessing(true);
        console.log("Purchasing Bus Pass:", { city: selectedCity, operator: selectedOperator, pass: passDetails, name: passengerName });
        try {
            // Simulate API call for purchase
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast({ title: "Bus Pass Purchased Successfully!", description: `${passDetails.name} for ${passengerName}. Check 'My Passes' section.` });
            // Reset form or navigate
             setSelectedCity('');
             setSelectedOperator('');
             setSelectedPassType('');
             setPassDetails(null);
             setPassengerName('');
             setPassengerPhoto(null);
             setPhotoPreview(null);
             // router.push('/passes');
        } catch (error) {
            console.error("Bus pass purchase failed:", error);
            toast({ variant: "destructive", title: "Purchase Failed", description: "Could not purchase the bus pass." });
        } finally {
            setIsProcessing(false);
        }
    };

    const availableOperators = mockOperators[selectedCity] || [];
    const availablePassTypes = mockPassTypes[selectedOperator] || [];

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Ticket className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Apply for Bus Pass</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Bus Pass Application</CardTitle>
                        <CardDescription>Select your city, operator, and pass type.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePurchasePass} className="space-y-4">
                            {/* City Selection */}
                            <div className="space-y-1">
                                <Label htmlFor="city">City</Label>
                                <Select value={selectedCity} onValueChange={handleCityChange} required>
                                    <SelectTrigger id="city">
                                        <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Operator Selection */}
                            {selectedCity && (
                                <div className="space-y-1">
                                    <Label htmlFor="operator">Operator</Label>
                                    <Select value={selectedOperator} onValueChange={handleOperatorChange} required disabled={availableOperators.length === 0}>
                                        <SelectTrigger id="operator">
                                            <SelectValue placeholder={availableOperators.length === 0 ? "No operators for this city" : "Select Operator"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableOperators.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Pass Type Selection */}
                             {selectedOperator && (
                                <div className="space-y-1">
                                    <Label htmlFor="passType">Pass Type</Label>
                                    <Select value={selectedPassType} onValueChange={handlePassTypeChange} required disabled={availablePassTypes.length === 0}>
                                        <SelectTrigger id="passType">
                                            <SelectValue placeholder={availablePassTypes.length === 0 ? "No passes for this operator" : "Select Pass Type"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availablePassTypes.map(pass => <SelectItem key={pass.id} value={pass.id}>{pass.name} (₹{pass.price})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Pass Details Display */}
                            {passDetails && (
                                <Card className="bg-muted/50 p-3 border border-border">
                                    <p className="font-semibold text-sm">{passDetails.name}</p>
                                    <p className="text-xs text-muted-foreground">{passDetails.description}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs">Duration: {passDetails.duration}</p>
                                        <p className="text-sm font-bold">Price: ₹{passDetails.price}</p>
                                    </div>
                                </Card>
                            )}

                            <Separator />

                            {/* Passenger Details */}
                            <div className="space-y-4">
                                <p className="text-sm font-medium">Passenger Details</p>
                                 <div className="space-y-1">
                                    <Label htmlFor="passengerName">Full Name (as per ID)</Label>
                                    <Input id="passengerName" placeholder="Enter your full name" value={passengerName} onChange={e => setPassengerName(e.target.value)} required />
                                </div>
                                 <div className="space-y-1">
                                     <Label htmlFor="passengerPhoto">Upload Recent Photo</Label>
                                     <Input id="passengerPhoto" type="file" accept="image/*" onChange={handlePhotoUpload} required className="text-xs file:mr-2 file:text-xs file:font-medium"/>
                                     {photoPreview && (
                                        <div className="mt-2 flex items-center gap-2">
                                             <img src={photoPreview} alt="Photo preview" className="h-16 w-16 rounded-md object-cover border"/>
                                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setPassengerPhoto(null); setPhotoPreview(null); }}>Remove</Button>
                                        </div>
                                     )}
                                     <p className="text-xs text-muted-foreground">Max 2MB. Clear face photo required.</p>
                                </div>
                            </div>


                            {/* Payment Summary & Button */}
                             {passDetails && (
                                <div className="space-y-4 pt-4">
                                    <Separator />
                                     <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Amount Payable:</span>
                                        <span className="font-bold text-lg">₹{passDetails.price.toFixed(2)}</span>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                        disabled={isProcessing || !passDetails || !passengerName || !passengerPhoto}
                                    >
                                         {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                         {isProcessing ? 'Processing...' : `Proceed to Pay ₹${passDetails.price.toFixed(2)}`}
                                    </Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
