'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, ShoppingBasket, Wallet, Plus, Minus, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';

// Mock Data (Replace with actual API calls)
const mockTemples = [ // Reuse or fetch centrally
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)' },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust' },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board' },
];

interface PrasadamItem {
    id: string;
    name: string;
    description: string;
    price: number; // Price per unit/packet
    imageUrl: string;
    minQuantity?: number;
    maxQuantity?: number;
}

const mockPrasadam: { [templeId: string]: PrasadamItem[] } = {
    'tirupati': [
        { id: 'ttd-laddu', name: 'Tirupati Laddu (Large)', description: 'World-famous besan laddu.', price: 50, imageUrl: '/images/prasadam/tirupati_laddu.jpg', minQuantity: 1, maxQuantity: 10 },
        { id: 'ttd-vada', name: 'Tirupati Vada', description: 'Savory fried lentil snack.', price: 25, imageUrl: '/images/prasadam/tirupati_vada.jpg', minQuantity: 2, maxQuantity: 20 },
    ],
    'shirdi': [
        { id: 'shirdi-packet', name: 'Shirdi Prasadam Packet', description: 'Includes Udi, sweets, and sugar crystals.', price: 100, imageUrl: '/images/prasadam/shirdi_packet.jpg', minQuantity: 1, maxQuantity: 5 },
    ],
    'vaishno-devi': [
         { id: 'vd-prasad', name: 'Vaishno Devi Prasad', description: 'Dry fruits and Mishri.', price: 150, imageUrl: '/images/prasadam/vaishno_devi_prasad.jpg', minQuantity: 1, maxQuantity: 5 },
    ]
};

interface CartItem extends PrasadamItem {
    quantity: number;
}

export default function PrasadamBookingPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [availablePrasadam, setAvailablePrasadam] = useState<PrasadamItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();

    // Fetch prasadam when temple changes
    useState(() => {
        if (selectedTemple) {
            setIsLoading(true);
            setCart([]); // Clear cart
            // Simulate fetching
            setTimeout(() => {
                setAvailablePrasadam(mockPrasadam[selectedTemple] || []);
                setIsLoading(false);
            }, 500);
        } else {
            setAvailablePrasadam([]);
            setCart([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTemple]);

    const handleQuantityChange = (item: PrasadamItem, change: number) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
            const newQuantity = (existingItem?.quantity || 0) + change;
            const minQty = item.minQuantity || 1;
            const maxQty = item.maxQuantity || 10; // Default max quantity

            if (newQuantity < minQty) {
                // Remove item if quantity goes below minimum
                toast({ description: `${item.name} removed from cart (Min Qty: ${minQty})` });
                return prevCart.filter(cartItem => cartItem.id !== item.id);
            }
            if (newQuantity > maxQty) {
                 toast({ variant: "destructive", title: "Quantity Limit", description: `Maximum ${maxQty} units of ${item.name} allowed.` });
                 return prevCart; // Don't change quantity
            }

            if (existingItem) {
                // Update quantity
                return prevCart.map(cartItem =>
                    cartItem.id === item.id ? { ...cartItem, quantity: newQuantity } : cartItem
                );
            } else {
                 // Add new item (only if change is positive)
                if (change > 0) {
                    return [...prevCart, { ...item, quantity: newQuantity }];
                }
                return prevCart; // Should not happen if starting from 0
            }
        });
    };

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleConfirmOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) {
            toast({ variant: "destructive", title: "Empty Cart", description: "Please add prasadam items to your cart." });
            return;
        }
        if (!deliveryAddress.trim()) {
            toast({ variant: "destructive", title: "Missing Address", description: "Please enter the delivery address." });
            return;
        }

        setIsBooking(true);
        console.log("Confirming Prasadam Order:", {
            temple: selectedTemple,
            cartItems: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })),
            totalAmount,
            deliveryAddress
        });
        try {
            // Simulate API call for order placement
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast({ title: "Order Placed Successfully!", description: `Your prasadam order (₹${totalAmount}) will be delivered soon.` });
            // Reset form
            setCart([]);
            setDeliveryAddress('');
            // Optionally reset temple
            // setSelectedTemple('');
        } catch (error) {
            console.error("Prasadam order failed:", error);
            toast({ variant: "destructive", title: "Order Failed" });
        } finally {
            setIsBooking(false);
        }
    }

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <ShoppingBasket className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Order Prasadam</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Select Temple</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Select value={selectedTemple} onValueChange={setSelectedTemple} required>
                            <SelectTrigger id="temple"><SelectValue placeholder="Select Temple to order from" /></SelectTrigger>
                            <SelectContent>
                                {mockTemples.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                 </Card>

                 {/* Prasadam Listing */}
                 {selectedTemple && (
                    <Card className="shadow-md mt-4">
                        <CardHeader>
                             <CardTitle>Available Prasadam Items</CardTitle>
                             {isLoading && <p className="text-sm text-muted-foreground">Loading items...</p>}
                             {!isLoading && availablePrasadam.length === 0 && <p className="text-sm text-muted-foreground">No prasadam available for online order from this temple currently.</p>}
                         </CardHeader>
                         <CardContent className="space-y-3">
                              {availablePrasadam.map((item) => {
                                  const cartItem = cart.find(ci => ci.id === item.id);
                                  const quantity = cartItem?.quantity || 0;
                                  return (
                                       <Card key={item.id} className="p-3 flex items-start gap-3">
                                            <Image src={item.imageUrl || '/images/prasadam/default.jpg'} alt={item.name} width={64} height={64} className="w-16 h-16 rounded object-cover border" data-ai-hint="temple prasadam food"/>
                                            <div className="flex-grow">
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.description}</p>
                                                <p className="text-sm font-bold mt-1">₹{item.price}</p>
                                                 <p className="text-[10px] text-muted-foreground">Min Qty: {item.minQuantity || 1}, Max Qty: {item.maxQuantity || 10}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                 <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(item, -1)} disabled={quantity === 0}>
                                                    <Minus className="h-4 w-4" />
                                                 </Button>
                                                 <span className="w-8 text-center font-medium">{quantity}</span>
                                                 <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(item, 1)} disabled={quantity >= (item.maxQuantity || 10)}>
                                                    <Plus className="h-4 w-4" />
                                                 </Button>
                                            </div>
                                       </Card>
                                   );
                               })}
                         </CardContent>
                    </Card>
                 )}

                  {/* Delivery & Checkout */}
                  {cart.length > 0 && (
                       <Card className="shadow-md mt-4">
                           <CardHeader>
                               <CardTitle>Delivery Details & Checkout</CardTitle>
                           </CardHeader>
                           <CardContent>
                               <form onSubmit={handleConfirmOrder} className="space-y-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="address">Delivery Address</Label>
                                         <Textarea
                                             id="address"
                                             placeholder="Enter your full delivery address including Pincode"
                                             value={deliveryAddress}
                                             onChange={(e) => setDeliveryAddress(e.target.value)}
                                             required
                                             rows={3}
                                         />
                                    </div>
                                    <Separator/>
                                    {/* Cart Summary */}
                                    <div className="space-y-1 text-sm">
                                         {cart.map(item => (
                                            <div key={item.id} className="flex justify-between">
                                                <span>{item.name} (x{item.quantity})</span>
                                                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                         <Separator className="my-1"/>
                                         <div className="flex justify-between font-bold text-base">
                                             <span>Total Amount</span>
                                             <span>₹{totalAmount.toFixed(2)}</span>
                                         </div>
                                         <p className="text-xs text-muted-foreground pt-1">Note: Delivery charges may apply based on location and will be added at checkout.</p>
                                    </div>

                                    <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isBooking || !deliveryAddress.trim()}>
                                         {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                         {isBooking ? 'Processing...' : 'Proceed to Pay'}
                                     </Button>
                               </form>
                           </CardContent>
                       </Card>
                  )}

            </main>
        </div>
    );
}
