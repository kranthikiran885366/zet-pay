import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
// Assuming these functions exist - removed unused imports
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge"; // Import Badge component
import {
  ArrowLeft,
  Landmark,
  PlusCircle,
  Trash2,
  CheckCircle,
  Copy,
  Loader2,
  Smartphone,
  Tv,
  Bolt,
  Droplet,
  ShieldCheck,
  RadioTower,
  Banknote,
  Tag,
  LifeBuoy,
  Wifi,
  FileText,
  Bus,
  Ticket,
  Clapperboard,
  TramFront,
  Train,
  MapPin,
  UtensilsCrossed,
  Gamepad2,
  HardDrive,
  Power,
  Mailbox,
  CreditCard,
  Settings,
  Info,
  History,
  ParkingMeter, // Corrected icon
  Fuel, // Corrected icon
  Taxi as TaxiIcon,
  MoreHorizontal, // Keep one import
   PhoneCall,
    Plane,
    ShoppingBag,
    Gift as GiftIcon, //Alias Gift to avoid conflict
    Home // Added Temple icon (using Home as placeholder)

} from "lucide-react"; // Added specific icons
import Image from 'next/image';
import { useEffect, useState } from 'react'; // Import useEffect and useState
