
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShoppingBag, Search, Filter, Star, MapPin, Bike, Percent, Clock, ArrowUpDown, Flame, IndianRupee, CheckCircle, Salad, Wallet, PackagePlus, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getShoppingCategories, getShoppingProducts, placeMockOrder, ShoppingCategory, ShoppingProduct } from '@/services/shopping';
import type { Transaction } from '@/services/types';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';


export default function OnlineShoppingPage() {
    const [categories, setCategories] = useState<ShoppingCategory[]>([]);
    const [products, setProducts] = useState<ShoppingProduct[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<ShoppingProduct[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [cart, setCart] = useState<Array<ShoppingProduct & { quantity: number }>>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoadingCategories(true);
            try {
                const fetchedCategories = await getShoppingCategories();
                setCategories(fetchedCategories);
                if (fetchedCategories.length > 0) {
                    //setSelectedCategory(fetchedCategories[0].id); // Select first category by default
                }
            } catch (error) {
                console.error("Failed to fetch categories:", error);
                toast({ variant: "destructive", title: "Error Loading Categories" });
            } finally {
                setIsLoadingCategories(false);
            }
        };
        fetchCategories();
    }, [toast]);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoadingProducts(true);
            try {
                const fetchedProducts = await getShoppingProducts(selectedCategory || undefined);
                setProducts(fetchedProducts);
                setFilteredProducts(fetchedProducts); // Initially show all products of the category
            } catch (error) {
                console.error("Failed to fetch products:", error);
                toast({ variant: "destructive", title: "Error Loading Products" });
            } finally {
                setIsLoadingProducts(false);
            }
        };
        if (selectedCategory === null) { // Fetch all products if no category selected
            fetchProducts();
        } else if (selectedCategory) {
             fetchProducts();
        } else {
            setProducts([]); // Clear products if no category selected after initial load
            setFilteredProducts([]);
        }
    }, [selectedCategory, toast]);

     useEffect(() => {
        let tempFiltered = products;
        if (searchTerm) {
            tempFiltered = tempFiltered.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredProducts(tempFiltered);
    }, [searchTerm, products]);

    const handleCategorySelect = (categoryId: string | null) => {
        setSelectedCategory(categoryId);
        setSearchTerm(''); // Reset search when category changes
    };

    const addToCart = (product: ShoppingProduct) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
        toast({ title: `${product.name} added to cart` });
    };

    const updateQuantity = (productId: string, change: number) => {
        setCart(prevCart =>
            prevCart.map(item =>
                item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
            ).filter(item => item.quantity > 0) // Remove if quantity is 0
        );
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast({ variant: "destructive", title: "Empty Cart", description: "Please add items to your cart before checking out." });
            return;
        }
        setIsCheckingOut(true);
        try {
            // Simulate order placement
            const orderDetails = {
                items: cart.map(item => ({ productId: item.id, quantity: item.quantity, price: item.price })),
                totalAmount: cartTotal,
                // Add user details, address etc. here
            };
            const result = await placeMockOrder(orderDetails); // Call mock order service
            toast({
                title: "Order Placed Successfully!",
                description: `Your order #${result.orderId} for ₹${result.totalAmount.toFixed(2)} has been placed.`,
                duration: 7000,
            });
            setCart([]);
            setIsCartOpen(false);
            router.push('/history'); // Redirect to order history or confirmation page
        } catch (error: any) {
            console.error("Checkout failed:", error);
            toast({ variant: "destructive", title: "Checkout Failed", description: error.message || "Could not place your order." });
        } finally {
            setIsCheckingOut(false);
        }
    };


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <ShoppingBag className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Shop Online</h1>
                <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
                    <DialogTrigger asChild>
                         <Button variant="secondary" size="sm" className="ml-auto h-8 relative">
                            <ShoppingBasket className="mr-2 h-4 w-4"/> Cart
                             {cart.length > 0 && (
                                <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs rounded-full">{cart.reduce((sum, item) => sum + item.quantity, 0)}</Badge>
                            )}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Your Shopping Cart</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] -mx-6 px-6"> {/* Allow content to scroll */}
                            {cart.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">Your cart is empty.</p>
                            ) : (
                                <div className="space-y-3 py-4">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-none last:pb-0">
                                            <Image src={item.imageUrl} alt={item.name} width={40} height={40} className="h-10 w-10 rounded object-cover" data-ai-hint="product small image"/>
                                            <div className="flex-grow">
                                                <p className="text-sm font-medium truncate">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">₹{item.price.toFixed(2)} x {item.quantity}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3"/></Button>
                                                <span className="w-6 text-center text-sm">{item.quantity}</span>
                                                <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3"/></Button>
                                            </div>
                                            <p className="text-sm font-semibold w-16 text-right">₹{(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        {cart.length > 0 && (
                            <>
                                <Separator className="my-3"/>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total:</span>
                                    <span>₹{cartTotal.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        <DialogFooter className="mt-4">
                             <Button type="button" variant="outline" onClick={() => setIsCartOpen(false)}>Continue Shopping</Button>
                             <Button
                                type="button"
                                onClick={handleCheckout}
                                disabled={cart.length === 0 || isCheckingOut}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wallet className="mr-2 h-4 w-4"/>}
                                Proceed to Checkout
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {/* Search and Category Filters */}
                <div className="sticky top-[60px] z-40 bg-secondary py-3 space-y-3"> {/* Adjust top based on header */}
                    <Input
                        type="search"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10"
                    />
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex space-x-2 pb-2">
                            <Button
                                variant={selectedCategory === null ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleCategorySelect(null)}
                                className="rounded-full h-8 px-3 text-xs flex-shrink-0"
                            >
                                All Products
                            </Button>
                            {isLoadingCategories ? (
                                <Skeleton className="h-8 w-24 rounded-full" />
                            ) : (
                                categories.map(category => (
                                    <Button
                                        key={category.id}
                                        variant={selectedCategory === category.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleCategorySelect(category.id)}
                                        className="rounded-full h-8 px-3 text-xs flex-shrink-0"
                                    >
                                        {category.name}
                                    </Button>
                                ))
                            )}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>


                {/* Product List */}
                <div className="space-y-3">
                    {isLoadingProducts && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
                        </div>
                    )}
                    {!isLoadingProducts && filteredProducts.length === 0 && (
                        <Card className="shadow-sm text-center">
                            <CardContent className="p-6">
                                <PackagePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                                <p className="text-muted-foreground">{searchTerm ? "No products found matching your search." : "No products available in this category."}</p>
                            </CardContent>
                        </Card>
                    )}
                    {!isLoadingProducts && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// Product Card Component
interface ProductCardProps {
    product: ShoppingProduct;
    onAddToCart: (product: ShoppingProduct) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
    return (
        <Card className="shadow-sm overflow-hidden flex flex-col">
            <div className="relative w-full aspect-[3/4]"> {/* Aspect ratio for product image */}
                <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    style={{ objectFit: 'cover' }}
                    className="transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint="product image"
                />
                {/* Optional: Offer Badge */}
                 {product.offer && <Badge variant="destructive" className="absolute top-2 left-2 text-xs">{product.offer}</Badge>}
            </div>
            <CardContent className="p-3 flex-grow flex flex-col justify-between">
                <div>
                    <CardTitle className="text-sm font-semibold truncate mb-1">{product.name}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground truncate h-8 mb-2">{product.description}</CardDescription>
                </div>
                <div className="flex justify-between items-center mt-auto">
                    <p className="text-base font-bold">₹{product.price.toFixed(2)}</p>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-primary text-primary hover:bg-primary/10" onClick={() => onAddToCart(product)}>
                        <PlusCircle className="mr-1 h-3 w-3"/> Add
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Skeleton Loader for Product Card
function ProductCardSkeleton() {
    return (
        <Card className="shadow-sm overflow-hidden flex flex-col">
            <Skeleton className="w-full aspect-[3/4]" />
            <CardContent className="p-3 space-y-2 flex-grow flex flex-col justify-between">
                <div>
                    <Skeleton className="h-5 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-full mb-2" />
                     <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex justify-between items-center mt-auto">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-7 w-1/3" />
                </div>
            </CardContent>
        </Card>
    );
}