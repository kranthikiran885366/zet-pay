
// src/mock-data/shopping.ts
import type { ShoppingCategory, ShoppingProduct } from '@/services/shopping'; // Use types from client-side services

export const mockCategoriesData: ShoppingCategory[] = [
    { id: 'electronics', name: 'Electronics', imageUrl: 'https://picsum.photos/seed/electronics_cat/200/150' },
    { id: 'fashion', name: 'Fashion', imageUrl: 'https://picsum.photos/seed/fashion_cat/200/150' },
    { id: 'home', name: 'Home & Kitchen', imageUrl: 'https://picsum.photos/seed/home_cat/200/150' },
    { id: 'grocery', name: 'Grocery', imageUrl: 'https://picsum.photos/seed/grocery_cat/200/150' },
    { id: 'beauty', name: 'Beauty & Personal Care', imageUrl: 'https://picsum.photos/seed/beauty_cat/200/150' },
    { id: 'books', name: 'Books & Media', imageUrl: 'https://picsum.photos/seed/books_cat/200/150' },
];

export const mockProductsData: ShoppingProduct[] = [
    // Electronics
    { id: 'prod1', name: 'Wireless Bluetooth Headphones', description: 'Noise-cancelling over-ear headphones with long battery life.', price: 2999, imageUrl: 'https://picsum.photos/seed/headphones/300/300', categoryId: 'electronics', categoryName: 'Electronics', stock: 50, rating: 4.5, brand: 'SoundMagic' },
    { id: 'prod2', name: 'Smartwatch Fitness Tracker', description: 'Tracks heart rate, steps, sleep, and notifications.', price: 3499, imageUrl: 'https://picsum.photos/seed/smartwatch/300/300', categoryId: 'electronics', categoryName: 'Electronics', stock: 30, rating: 4.2, brand: 'FitTech', offer: "10% OFF" },
    { id: 'prod3', name: 'Portable Power Bank 20000mAh', description: 'Fast charging power bank for all your devices.', price: 1899, imageUrl: 'https://picsum.photos/seed/powerbank/300/300', categoryId: 'electronics', categoryName: 'Electronics', stock: 100, rating: 4.0, brand: 'ChargeUp' },
    // Fashion
    { id: 'prod4', name: 'Men\'s Casual T-Shirt', description: 'Comfortable cotton t-shirt, available in various colors.', price: 499, imageUrl: 'https://picsum.photos/seed/tshirt_men/300/300', categoryId: 'fashion', categoryName: 'Fashion', stock: 200, rating: 4.3, brand: 'UrbanStyle' },
    { id: 'prod5', name: 'Women\'s Skinny Fit Jeans', description: 'Stretchable denim jeans for a perfect fit.', price: 1299, imageUrl: 'https://picsum.photos/seed/jeans_women/300/300', categoryId: 'fashion', categoryName: 'Fashion', stock: 150, rating: 4.0, brand: 'DenimCo' },
    { id: 'prod6', name: 'Unisex Sports Sneakers', description: 'Lightweight and durable sneakers for all activities.', price: 2200, imageUrl: 'https://picsum.photos/seed/sneakers/300/300', categoryId: 'fashion', categoryName: 'Fashion', stock: 80, rating: 4.6, brand: 'ActiveRun', offer: "Launch Offer!" },
    // Home & Kitchen
    { id: 'prod7', name: 'Non-Stick Cookware Set (3 pcs)', description: 'Induction compatible cookware set.', price: 1999, imageUrl: 'https://picsum.photos/seed/cookware/300/300', categoryId: 'home', categoryName: 'Home & Kitchen', stock: 60, rating: 4.1, brand: 'KitchenMaster' },
    { id: 'prod8', name: 'Microfiber Bed Sheet Set (Queen)', description: 'Soft and comfortable double bedsheet with 2 pillow covers.', price: 899, imageUrl: 'https://picsum.photos/seed/bedsheet/300/300', categoryId: 'home', categoryName: 'Home & Kitchen', stock: 120, rating: 3.9, brand: 'HomeComfort' },
    // Grocery
    { id: 'prod9', name: 'Organic Honey 500g', description: 'Pure and natural organic honey.', price: 350, imageUrl: 'https://picsum.photos/seed/honey/300/300', categoryId: 'grocery', categoryName: 'Grocery', stock: 0, rating: 4.7, brand: 'NaturePure' },
    { id: 'prod10', name: 'Basmati Rice - Premium 1kg', description: 'Long grain premium basmati rice.', price: 120, imageUrl: 'https://picsum.photos/seed/rice/300/300', categoryId: 'grocery', categoryName: 'Grocery', stock: 300, rating: 4.4, brand: 'RoyalGrain' },
    // Beauty
    { id: 'prod11', name: 'Vitamin C Face Serum', description: 'Brightening and anti-aging face serum.', price: 799, imageUrl: 'https://picsum.photos/seed/faceserum/300/300', categoryId: 'beauty', categoryName: 'Beauty & Personal Care', stock: 70, rating: 4.6, brand: 'GlowUp' },
    // Books
    { id: 'prod12', name: 'The Alchemist by Paulo Coelho', description: 'A classic novel about following your dreams.', price: 250, imageUrl: 'https://picsum.photos/seed/alchemist/300/300', categoryId: 'books', categoryName: 'Books & Media', stock: 100, rating: 4.8, brand: 'HarperCollins' },
];
