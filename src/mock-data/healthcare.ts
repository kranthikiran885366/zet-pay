
// src/mock-data/healthcare.ts

export interface Doctor {
    id: string;
    name: string;
    specialty: string;
    location: string;
    consultationFee: number;
    availability: { [date: string]: string[] }; // e.g., { "2024-08-15": ["10:00 AM", "11:00 AM"] }
    imageUrl?: string;
    experience?: string; // e.g., "10+ years"
    qualifications?: string; // e.g., "MBBS, MD"
}

export interface LabTest {
    id: string;
    name: string;
    price: number;
    description?: string;
    preparation?: string; // e.g., "Fasting required for 10-12 hours"
}

export interface Lab {
    id: string;
    name: string;
    city: string;
    address?: string;
    availableTests?: string[]; // Array of test IDs
}

export interface Medicine {
    id: string;
    name: string;
    price: number;
    requiresPrescription?: boolean;
    description?: string;
    manufacturer?: string;
    imageUrl?: string;
}

export interface FitnessTrainer {
    id: string;
    name: string;
    specialties: string[]; // e.g., ["Yoga", "Zumba", "Personal Training"]
    location: string;
    priceRange: string; // e.g., "₹500-₹1500/session"
    imageUrl?: string;
    rating?: number;
}

export interface HealthPackage {
    id: string;
    name: string;
    labName: string; // Name of the lab/hospital offering it
    price: number;
    testsIncluded: string[];
    description?: string;
    imageUrl?: string;
}

export const mockDoctorsData: Doctor[] = [
    { id: 'doc1', name: 'Dr. Priya Sharma', specialty: 'General Physician', location: 'Koramangala, Bangalore', consultationFee: 500, availability: {'2024-08-15': ['10:00 AM', '11:00 AM'], '2024-08-16': ['03:00 PM']}, imageUrl: "https://picsum.photos/seed/drpriya/200/200", experience: "12 years", qualifications: "MBBS, MD (General Medicine)" },
    { id: 'doc2', name: 'Dr. Arjun Mehta', specialty: 'Dentist', location: 'Indiranagar, Bangalore', consultationFee: 700, availability: {'2024-08-15': ['02:00 PM', '03:00 PM']}, imageUrl: "https://picsum.photos/seed/drarjun/200/200", experience: "8 years", qualifications: "BDS, MDS (Orthodontics)" },
    { id: 'doc3', name: 'Dr. Sunita Reddy', specialty: 'Pediatrician', location: 'Jayanagar, Bangalore', consultationFee: 600, availability: {'2024-08-17': ['09:00 AM', '10:30 AM', '11:30 AM']}, imageUrl: "https://picsum.photos/seed/drsunita/200/200", experience: "15 years", qualifications: "MBBS, DCH" },
    { id: 'doc4', name: 'Dr. Vikram Singh', specialty: 'Cardiologist', location: 'MG Road, Bangalore', consultationFee: 1200, availability: {'2024-08-18': ['04:00 PM', '05:00 PM']}, imageUrl: "https://picsum.photos/seed/drvikram/200/200", experience: "20 years", qualifications: "MBBS, MD, DM (Cardiology)" },
];

export const mockLabsData: Lab[] = [
    { id: 'lab1', name: 'Apollo Diagnostics', city: 'Bangalore', address: '12 Main St, Koramangala', availableTests: ['test1', 'test2', 'test3'] },
    { id: 'lab2', name: 'Metropolis Healthcare', city: 'Bangalore', address: '45 Park Rd, Indiranagar', availableTests: ['test1', 'test4'] },
];

export const mockLabTestsData: LabTest[] = [
    { id: 'test1', name: 'Complete Blood Count (CBC)', price: 300, description: "Measures different components of your blood.", preparation: "No special preparation needed." },
    { id: 'test2', name: 'Lipid Profile', price: 600, description: "Measures cholesterol and triglycerides.", preparation: "10-12 hours fasting required." },
    { id: 'test3', name: 'Thyroid Profile (T3, T4, TSH)', price: 750, description: "Checks thyroid gland function.", preparation: "Inform doctor about medications." },
    { id: 'test4', name: 'Random Blood Sugar (RBS)', price: 150, description: "Checks blood glucose level.", preparation: "No fasting required." },
];

export const mockMedicinesData: Medicine[] = [
    { id: 'med1', name: 'Paracetamol 500mg Tablet', price: 20, manufacturer: 'GSK', imageUrl: "https://picsum.photos/seed/paracetamol/200/200" },
    { id: 'med2', name: 'Amoxicillin 250mg Capsule', price: 75, requiresPrescription: true, manufacturer: 'Cipla', imageUrl: "https://picsum.photos/seed/amoxicillin/200/200" },
    { id: 'med3', name: 'Vitamin C 500mg Chewable', price: 120, manufacturer: 'Abbott', imageUrl: "https://picsum.photos/seed/vitaminc/200/200" },
    { id: 'med4', name: 'Antacid Syrup 170ml', price: 90, manufacturer: 'Pfizer', imageUrl: "https://picsum.photos/seed/antacid/200/200" },
];

export const mockFitnessTrainersData: FitnessTrainer[] = [
    { id: 'ft1', name: 'Ravi Fitness Studio', specialties: ['Yoga', 'Zumba', 'Personal Training'], location: 'Indiranagar', priceRange: '₹500 - ₹1500/session', imageUrl: "https://picsum.photos/seed/ravifit/200/200", rating: 4.8 },
    { id: 'ft2', name: 'Wellness Warriors', specialties: ['Pilates', 'Meditation', 'Strength Training'], location: 'Koramangala', priceRange: '₹700 - ₹2000/session', imageUrl: "https://picsum.photos/seed/wellnessw/200/200", rating: 4.5 },
];

export const mockHealthPackagesData: HealthPackage[] = [
    { id: 'hp1', name: 'Full Body Checkup Basic', labName: 'Apollo Health', price: 1999, testsIncluded: ['CBC', 'Lipid Profile', 'Thyroid Profile', 'Blood Sugar', 'Urine R/M'], description: 'Comprehensive basic health screening.', imageUrl: "https://picsum.photos/seed/healthpkg1/200/200" },
    { id: 'hp2', name: 'Advanced Cardiac Package', labName: 'Metropolis Labs', price: 4999, testsIncluded: ['ECG', 'ECHO', 'TMT', 'Lipid Profile Extended', 'HsCRP'], description: 'Detailed heart health assessment.', imageUrl: "https://picsum.photos/seed/healthpkg2/200/200" },
];
