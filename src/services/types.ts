
/**
 * @fileOverview Shared type definitions for data structures used across services.
 */
import type { Timestamp } from 'firebase/firestore'; // Keep for potential backend alignment

// Replicated from user.ts - keep this as the single source of truth
export interface UserProfile {
    id: string; // Corresponds to Firebase Auth UID
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    kycStatus?: 'Verified' | 'Not Verified' | 'Pending';
    // Use simple types for client-side, backend will handle Timestamps
    createdAt?: Date | string | Timestamp; // Allow Timestamp for backend
    updatedAt?: Date | string | Timestamp;
    notificationsEnabled?: boolean;
    biometricEnabled?: boolean;
    appLockEnabled?: boolean;
    isSmartWalletBridgeEnabled?: boolean;
    smartWalletBridgeLimit?: number;
    defaultPaymentMethod?: 'upi' | 'wallet' | string;
    isSeniorCitizenMode?: boolean;
    familyGroupIds?: string[];
    upiId?: string;
    // For Zet Chat
    isZetChatUser?: boolean; // Indicates if user can participate in Zet Chat
}


export interface Transaction {
  id: string;
  userId: string;
  type: string; // Consider using a stricter enum matching backend values e.g., 'Sent' | 'Received' | 'Recharge' | 'Bill Payment' | 'Investment' | 'Service Booking' | 'Wallet Top-up' | 'Food Order' | 'Shopping' etc.
  name: string; // Payee name, Biller name, Service name, Fund name etc.
  description: string; // Transaction note, plan details, purpose
  amount: number; // Negative for debits, positive for credits/refunds
  date: Date | string | Timestamp; // Allow string initially from client, Timestamp in backend
  status: 'Completed' | 'Pending' | 'Failed' | 'Processing Activation' | 'Cancelled' | 'Refunded' | 'Refunded_To_Wallet' | 'FallbackSuccess';
  avatarSeed?: string;
  upiId?: string;
  billerId?: string;
  loanId?: string;
  ticketId?: string; // Booking ID / PNR / Support Ticket ID / Order ID
  refundEta?: string;
  blockchainHash?: string;
  paymentMethodUsed?: 'UPI' | 'Wallet' | 'Card' | 'NetBanking' | 'BNPL'; // Added BNPL
  originalTransactionId?: string;
  operatorReferenceId?: string;
  billerReferenceId?: string;
  planId?: string;
  identifier?: string;
  withdrawalRequestId?: string;
  createdAt?: Date | string | Timestamp;
  updatedAt?: Date | string | Timestamp;
  pspTransactionId?: string; 
  refundTransactionId?: string; 
  failureReason?: string; 
  stealthScan?: boolean;
}


export interface BankAccount {
  id?: string;
  bankName: string;
  accountNumber: string; // Masked number
  upiId: string;
  userId: string;
  isDefault?: boolean;
  pinLength?: 4 | 6;
  createdAt?: Date | string | Timestamp;
  accountType?: string; // Added 'SAVINGS', 'CURRENT'
  ifsc?: string; // Added IFSC
}


export interface UpiTransactionResult {
  transactionId?: string;
  amount: number;
  recipientUpiId: string;
  status: 'Pending' | 'Completed' | 'Failed' | 'FallbackSuccess';
  message?: string;
  usedWalletFallback?: boolean;
  walletTransactionId?: string;
  ticketId?: string;
  refundEta?: string;
  success?: boolean;
  errorCode?: string;
  mightBeDebited?: boolean;
  pspTransactionId?: string; // Added for direct UPI provider id
}


export interface Payee {
  id: string;
  userId: string;
  name: string;
  identifier: string;
  type: 'mobile' | 'bank' | 'dth' | 'fastag' | 'upi'; // Added 'upi'
  avatarSeed?: string;
  upiId?: string;
  accountNumber?: string;
  ifsc?: string;
  isFavorite?: boolean;
  isVerified?: boolean; 
  isZetChatUser?: boolean; // Added for Zet Chat
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface PayeeClient extends Omit<Payee, 'createdAt' | 'updatedAt'> {
    isVerified?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// --- Offer Types ---
export interface Offer {
  id?: string;
  offerId: string;
  description: string;
  imageUrl: string;
  offerType: 'Cashback' | 'Coupon' | 'Discount' | 'Partner';
  terms?: string;
  validUntil?: Date | string | Timestamp;
  category?: string;
  isActive: boolean;
  createdAt?: Date | string | Timestamp;
  redemptionLimitPerUser?: number; // Added
  title?: string; // Added
}

// --- Loyalty Types ---
export interface LoyaltyStatus {
    userId: string;
    points: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    benefits: string[];
    lastUpdated: Date | string | Timestamp;
    createdAt?: Date | string | Timestamp; // Added
    updatedAt?: Date | string | Timestamp; // Added
    pointsToNextTier?: number; // Added
}

// --- Referral Types ---
export interface ReferralStatus {
    userId: string;
    referralCode: string;
    successfulReferrals: number;
    pendingReferrals: number;
    totalEarnings: number;
    createdAt?: Date | string | Timestamp; // Added
    updatedAt?: Date | string | Timestamp; // Added
}

// --- Scratch Card Types ---
export interface ScratchCardData {
    id?: string;
    userId: string;
    isScratched: boolean;
    rewardAmount?: number;
    rewardType?: 'Cashback' | 'CouponCode' | 'Points'; // Added
    couponCodeValue?: string; // Added
    expiryDate: Date | string | Timestamp;
    message: string;
    sourceOfferId?: string;
    createdAt: Date | string | Timestamp;
    scratchedAt?: Date | string | Timestamp; // Added
}

// --- Card Types ---
export interface CardDetails {
    id: string;
    userId: string;
    gatewayToken?: string;
    cardIssuer?: string;
    bankName?: string;
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    cardHolderName?: string;
    cardType: 'Credit' | 'Debit';
    isPrimary?: boolean;
    createdAt?: Timestamp | Date | string;
}

export interface CardPaymentResult {
    success: boolean;
    transactionId?: string; 
    gatewayTransactionId?: string; 
    message: string;
    usedWalletFallback?: boolean;
    walletTransactionId?: string;
    retryWithDifferentMethod?: boolean;
    errorCode?: string;
}

// --- Autopay Mandate Types ---
export interface Mandate {
    id?: string; 
    userId: string;
    merchantName: string;
    upiId: string; 
    maxAmount: number;
    frequency: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | 'As Presented';
    startDate: Date | string | Timestamp;
    validUntil: Date | string | Timestamp;
    status: 'Active' | 'Paused' | 'Cancelled' | 'Failed' | 'Pending Approval';
    createdAt?: Date | string | Timestamp;
    updatedAt?: Date | string | Timestamp;
    mandateUrn?: string; 
    pspReferenceId?: string; 
}

// --- BNPL Types ---
export interface BnplDetails {
    userId: string;
    isActive: boolean;
    creditLimit: number;
    providerName?: string;
    partnerBank?: string;
    activationDate?: Timestamp | Date | string;
    lastUpdated?: Timestamp | Date | string;
    usedLimit?: number; 
}

export interface BnplStatement {
    id?: string;
    userId: string;
    statementId: string;
    statementPeriodStart: Timestamp | Date | string;
    statementPeriodEnd: Timestamp | Date | string;
    dueDate: Timestamp | Date | string;
    dueAmount: number;
    minAmountDue: number;
    isPaid: boolean;
    paidDate?: Timestamp | Date | string;
    transactions?: BnplTransaction[];
    lastPaymentAmount?: number; 
    lastPaymentDate?: Timestamp | Date | string; 
    lastPaymentMethod?: string; 
    updatedAt?: Timestamp | Date | string; 
}

export interface BnplTransaction {
    id?: string;
    userId: string;
    statementId: string;
    originalTransactionId: string; 
    date: Timestamp | Date | string;
    merchantName: string;
    amount: number;
}

// --- Cash Withdrawal Types ---
export interface ZetAgent {
    id: string;
    name: string;
    address: string;
    distanceKm: number;
    operatingHours: string;
    lat?: number; 
    lon?: number; 
    maxWithdrawalLimit?: number; // Added
}
export interface WithdrawalDetails {
    id?: string;
    userId: string;
    agentId: string;
    agentName?: string;
    amount: number;
    otp: string;
    qrData: string;
    status: 'Pending Confirmation' | 'Completed' | 'Expired' | 'Cancelled' | 'Failed';
    createdAt: Timestamp | Date | string;
    expiresAt: Timestamp | Date | string;
    completedAt?: Timestamp | Date | string;
    failureReason?: string;
    transactionId?: string;
    updatedAt?: Timestamp | Date | string;
    expiresInSeconds?: number;
    holdTransactionId?: string;
}

// --- Wallet Recovery Types ---
export interface RecoveryTask {
    id?: string;
    userId: string;
    amount: number;
    originalRecipientUpiId: string;
    recoveryStatus: 'Scheduled' | 'Processing' | 'Completed' | 'Failed';
    scheduledTime: Timestamp | Date | string; 
    createdAt: Timestamp | Date | string;
    updatedAt: Timestamp | Date | string;
    failureReason?: string;
    bankUpiId?: string;
    recoveryTransactionId?: string;
    walletCreditTransactionId?: string;
}

// --- Booking Types ---
export interface BookingSearchResult {
    id: string;
    name: string; 
    type: 'movie' | 'bus' | 'train' | 'flight' | 'event' | 'marriage' | 'car' | 'bike'; 
    imageUrl?: string;
    priceRange?: string; 
    rating?: number;
    location?: string; 
    capacity?: number; 
    description?: string; 
    amenities?: string[]; 
    price?: number; 
    transmission?: string;
    fuelType?: string;
    seats?: number;
    pricePerDay?: number; 
    pricePerHour?: number; 
    kmsLimit?: string;
    isAvailable?: boolean; 
    availability?: 'Available' | 'In Use' | 'Low Battery'; 
    batteryPercent?: number; 
    requiresHelmet?: boolean; 
}
export interface FlightListing extends BookingSearchResult {
    airline: string;
    flightNumber: string;
    departureAirport: string;
    arrivalAirport: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    stops: number;
    refundable?: boolean;
    baggage: { cabin: string; checkin: string };
}

export interface CarListing extends BookingSearchResult {
    // Type already ensures transmission, fuelType, seats, pricePerDay, kmsLimit, isAvailable exist
}

export interface BikeListing extends BookingSearchResult {
    // Type already ensures pricePerHour, pricePerDay, availability, batteryPercent, requiresHelmet exist
}

export interface BookingConfirmation {
    status: Transaction['status'] | 'Pending Approval' | 'Confirmed' | 'Completed';
    message?: string;
    transactionId?: string;
    bookingId?: string;
    bookingDetails?: {
        pnr?: string;
        seatNumbers?: string;
        providerMessage?: string;
        flightDetails?: Pick<FlightListing, 'airline' | 'flightNumber' | 'departureTime' | 'arrivalTime' | 'departureAirport' | 'arrivalAirport'>;
        providerConfirmationId?: string; 
    } | null;
}

interface AddonServiceOption {
    id: string;
    name: string;
    price: number;
    description?: string;
}

export interface MarriageVenue extends BookingSearchResult {
    city: string;
    requiresApproval?: boolean;
    bookingFee?: number;
    contact?: string;
    hallType?: 'Banquet' | 'Outdoor' | 'Convention Center' | 'Garden';
    hasParking?: boolean;
    parkingCapacity?: number;
    nearMetro?: boolean;
    cateringOptions?: AddonServiceOption[];
    decorationPackages?: AddonServiceOption[];
    rulesAndPolicies?: string;
    reviews?: Array<{ reviewer: string; rating: number; comment: string; date: string }>;
    cancellationPolicy?: string;
    simulatedBookedDates?: string[]; // Array of "YYYY-MM-DD"
}

export interface MarriageBookingDetails { 
    venueId: string;
    venueName: string;
    city: string;
    date: string; 
    guestCount?: string;
    userName: string;
    userContact: string;
    userEmail: string;
    specialRequests?: string;
    totalAmount?: number; 
    userId?: string; 
    paymentTransactionId?: string; 
    status?: 'Pending Approval' | 'Confirmed' | 'Cancelled' | 'Completed'; 
    createdAt?: Timestamp | Date | string; 
    selectedAddons?: {
        catering?: string; // ID of selected catering option
        decor?: string; // ID of selected decor package
    };
    appliedPromoCode?: string;
}


// --- UPI Lite ---
export interface UpiLiteDetails {
    isEnabled: boolean;
    balance: number;
    maxBalance: number;
    maxTxnAmount: number;
    linkedAccountUpiId?: string;
}

// --- Pocket Money ---
export interface ChildAccountConfig {
    id: string;
    name: string;
    avatarSeed: string;
    balance: number;
    allowanceAmount?: number;
    allowanceFrequency?: 'Daily' | 'Weekly' | 'Monthly' | 'None';
    lastAllowanceDate?: Date | string | Timestamp;
    spendingLimitPerTxn?: number;
    linkedSchoolBillerId?: string;
}
export interface PocketMoneyConfig {
    userId: string;
    children: ChildAccountConfig[];
}
export interface PocketMoneyTransaction {
    id: string;
    userId: string; 
    childId: string;
    description: string;
    amount: number; 
    date: Date | string | Timestamp;
}

// --- Micro Loan Types ---
export interface MicroLoanEligibility {
    eligible: boolean;
    limit: number;
    message?: string;
}
export interface MicroLoanStatus {
    hasActiveLoan: boolean;
    loanId?: string;
    amountDue?: number;
    dueDate?: Date | string | Timestamp;
    purpose?: 'General' | 'Education';
}
export interface MicroLoanApplicationResult {
    success: boolean;
    loanId?: string;
    dueDate?: Date; 
    message?: string;
}
export interface MicroLoanRepaymentResult {
    success: boolean;
    message?: string;
}

// --- AI Gifting Assistant Types ---
export interface GiftSuggestionInput {
  occasion: string;
  relationship: string;
  interests: string[]; 
  budget?: string; 
  ageRange?: string; 
  additionalInfo?: string; 
}

export interface GiftSuggestion {
  id: string;
  name: string;
  category: string;
  priceRange: string;
  description: string; 
  relevance?: number; 
  imageUrl: string;
  dataAiHint?: string; 
  purchaseLink?: string; 
}

export interface GiftSuggestionOutput {
  suggestions: GiftSuggestion[];
}

// --- Zet Chat Types ---
export interface ChatMessage {
    id: string; // Firestore document ID
    chatId: string; // ID of the chat session
    senderId: string; // UserID of the sender
    senderName?: string; // Display name of sender
    receiverId: string; // UserID of the receiver
    text?: string; // Message text content
    imageUrl?: string; // URL if message is an image
    invoiceId?: string; // ID if message is an invoice/receipt
    paymentRequestId?: string; // ID if message is a payment request
    timestamp: Timestamp | Date | string; // Timestamp of the message
    isRead?: boolean;
    type: 'text' | 'image' | 'voice' | 'payment_request' | 'payment_receipt' | 'system'; // Added system type
}

export interface ChatSession {
    id: string; // Firestore document ID (e.g., combination of user IDs)
    participants: string[]; // Array of UserIDs
    participantNames: { [userId: string]: string }; // Map UserID to display name
    lastMessage?: ChatMessage; // Snippet of the last message
    updatedAt: Timestamp | Date | string;
    unreadCounts?: { [userId: string]: number }; // Unread count for each participant
    isZetChatUser?: boolean; // If chat involves a verified merchant or special support agent
    associatedTransactionId?: string;
}

// --- Voucher Purchase Types ---
export interface VoucherPurchasePayload {
    brandId: string;
    amount: number;
    playerId?: string;
    recipientMobile?: string;
    billerName?: string;
    voucherType: 'gaming' | 'digital';
}

// --- Food Ordering Types ---
export interface Restaurant {
    id: string;
    name: string;
    cuisine: string[];
    rating: number;
    deliveryTimeMinutes: number;
    priceForTwo: number;
    imageUrl: string;
    offers?: string[];
    isPureVeg?: boolean;
    distanceKm?: number;
    isPromoted?: boolean;
    isTrending?: boolean;
}
export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    isVeg: boolean;
    isBestSeller?: boolean;
    imageUrl?: string;
}
export interface RestaurantDetails extends Restaurant {
    address: string;
    timings: string;
    menuCategories: string[];
    menuItems: MenuItem[];
}
export interface OrderItem { // From shopping service, can be reused
    productId: string; // Or itemId for food
    quantity: number;
    price: number; // Price at the time of order
}

export interface FoodOrderItem { // Specific for food orders
    itemId: string; // Corresponds to MenuItem.id
    name?: string; // Denormalized for logging/display
    quantity: number;
    price: number; // Price per item at time of order
    customizations?: any; // For future
}

export interface FoodOrderPayload {
    restaurantId: string;
    items: FoodOrderItem[];
    totalAmount: number;
    deliveryAddress: { line1: string; city: string; pincode: string; line2?: string; landmark?: string; contactNumber?: string; };
    paymentMethod?: 'wallet' | 'upi' | 'card';
    specialInstructions?: string;
}

export interface FoodOrderConfirmation extends Transaction { // Extends Transaction for consistency
    orderId: string; // Specific food order ID from provider/system
    restaurantName?: string;
    estimatedDeliveryTime?: string; // e.g., "30-40 minutes"
    deliveryPartnerInfo?: { name: string; contact: string; vehicleNo?: string; };
}


// --- Shopping Types ---
export interface ShoppingCategory {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface ShoppingProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    categoryId: string;
    categoryName?: string;
    stock?: number;
    rating?: number;
    brand?: string;
    offer?: string;
}

export interface ShoppingOrderPayload { // Renamed from OrderDetails
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: { line1: string; city: string; pincode: string; state?: string; country?: string; name?: string; contactNumber?: string; };
    paymentMethod?: 'wallet' | 'upi' | 'card';
}

export interface ShoppingOrder extends Transaction {
    orderId: string;
    shippingAddressUsed: any; // Store the address used for this order
    trackingLink?: string;
}

// --- Healthcare Types ---
export interface Doctor {
    id: string; name: string; specialty: string; location: string; consultationFee: number;
    availability: { [date: string]: string[] }; imageUrl?: string; experience?: string; qualifications?: string;
}
export interface LabTest {
    id: string; name: string; price: number; description?: string; preparation?: string;
}
export interface Medicine {
    id: string; name: string; price: number; requiresPrescription?: boolean; description?: string; manufacturer?: string; imageUrl?: string;
}
export interface FitnessTrainer {
    id: string; name: string; specialties: string[]; location: string; priceRange: string; imageUrl?: string; rating?: number;
}
export interface HealthPackage {
    id: string; name: string; labName: string; price: number; testsIncluded: string[]; description?: string; imageUrl?: string;
}

export interface HealthAppointment {
    userId: string; doctorId: string; doctorName: string; slotTime: string; date: string; // Date as YYYY-MM-DD
    appointmentType: 'In-Clinic' | 'Video'; consultationFee?: number; status: 'Confirmed' | 'Cancelled' | 'Completed';
    bookingId?: string; // Provider booking ID
    notes?: string;
}
export interface LabTestBooking {
     userId: string; labId: string; labName: string; testId: string; testName: string;
     slotTime?: string; date: string; collectionType: 'Home' | 'Lab Visit'; price: number; status: 'Confirmed' | 'SampleCollected' | 'ReportReady';
     bookingId?: string; reportUrl?: string;
}
export interface MedicineOrder {
    userId: string; orderId: string; items: Array<{ medicineId: string; name: string; quantity: number; price: number }>;
    totalAmount: number; deliveryAddress: any; prescriptionId?: string; status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
}
export interface MedicineSubscription {
     userId: string; subscriptionId: string; medicineId: string; medicineName: string; quantity: number;
     frequency: 'Weekly' | 'Monthly' | 'Bi-Monthly' | 'Quarterly'; startDate: string; deliveryAddress: any; status: 'Active' | 'Paused' | 'Cancelled';
}

// --- Hyperlocal Service Types ---
export interface HyperlocalProvider {
    id: string; name: string; rating?: number; basePrice?: number; area?: string; contact?: string; logoUrl?: string;
    distance?: string; // Added distance
}
export interface HyperlocalServiceType {
    type: string; displayName: string; icon?: string; // lucide-react icon name string
    description?: string;
    availableProviders?: number; // Count of providers for this service type
    providers?: HyperlocalProvider[]; // List of actual providers if fetched for a specific type
}
export interface HyperlocalServiceDetails extends HyperlocalProvider { // A provider's details for a service
    serviceType: string;
    slots?: string[]; // Available time slots for a given date
}

export interface HyperlocalBookingPayload {
    serviceType: string; // e.g., 'AC Repair', 'Plumber'
    providerId: string;
    slotTime: string; // e.g., '10:00 AM'
    address: { line1: string; city: string; pincode: string; line2?: string; landmark?: string; };
    description?: string; // User's description of the issue/need
    estimatedCost: number;
    paymentMethod?: string;
    // Backend infers userId
    paymentTransactionId?: string;
}

export interface HyperlocalBookingConfirmation { // Extends Transaction
    status: 'Confirmed' | 'Failed' | 'Pending Confirmation'; bookingId?: string; message?: string; providerContact?: string;
}


// EV Station
export interface EVStationConnector {
    type: string; // e.g., 'CCS2', 'CHAdeMO', 'Type 2 AC'
    power: string; // e.g., '50kW DC', '22kW AC'
    status: 'Available' | 'In Use' | 'Offline' | 'Unknown';
}
export interface EVStation {
    id: string;
    name: string;
    address: string;
    distance: string; // e.g., "1.2 km"
    connectors: EVStationConnector[];
    price?: string; // e.g., "₹18/kWh"
    amenities?: string[]; // e.g., ['Cafe', 'Restroom']
    imageUrl?: string;
    latitude?: number; // For map display
    longitude?: number; // For map display
    operator?: string;
}

// Rest Stop
export interface RestStopService {
    name: string; // e.g., 'EV Charging', 'Restaurant', 'Fuel Pump'
    available: boolean;
    details?: string; // e.g., "Tata Power 25kW DC" for EV Charging
}
export interface RestStop {
    id: string;
    name: string;
    highway: string; // e.g., "NH48 (Delhi-Mumbai)"
    locationDesc: string; // e.g., "Near Mile Marker 120, XYZ Village"
    amenities: string[]; // e.g., ['Food Court', 'Clean Restrooms', 'Parking']
    services?: RestStopService[];
    rating?: number;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
}
