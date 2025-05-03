
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Bell, Lock, ShieldCheck, CreditCard, MessageSquare, Settings as SettingsIcon, LogOut, ChevronRight, QrCode, Info } from 'lucide-react';
import Link from 'next/link';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { logout } from '@/services/auth'; // Import the logout service
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useRouter } from 'next/navigation'; // Import useRouter

// Mock user data (replace with actual user state/context)
const user = {
  name: "Chandra Sekhar",
  email: "chandra.sekhar@example.com",
  phone: "+91 12345 67890",
  avatarUrl: "https://picsum.photos/seed/user/100/100",
  kycStatus: "Verified", // Could be 'Not Verified', 'Pending'
  upiIds: ["sekhar@payfriend", "1234567890@pfbank"],
  notificationsEnabled: true,
  biometricEnabled: false,
};


export default function ProfilePage() {
  const [notifications, setNotifications] = useState(user.notificationsEnabled);
  const [biometric, setBiometric] = useState(user.biometricEnabled);
  const { toast } = useToast();
  const router = useRouter(); // Initialize router

   const handleLogout = async () => {
     try {
        await logout(); // Call the service function
        toast({ title: "Logout Successful", description: "You have been logged out." });
        // Redirect to login page after successful logout
        router.push('/login'); // Assuming '/login' is the login route
     } catch (error) {
        console.error("Logout failed:", error);
         toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
     }
   };

  const handleKYCClick = () => {
      // TODO: Navigate to KYC verification flow or show status details
      toast({ title: `KYC Status: ${user.kycStatus}`, description: "This is your current KYC verification status." });
  }


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Profile & Settings</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-6 pb-20"> {/* Added pb-20 for bottom nav */}
        {/* User Info Card */}
        <Card className="shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="user profile large"/>
              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground">{user.phone}</p>
            </div>
             {/* Optional: Edit Profile Button */}
             {/* <Button variant="ghost" size="icon" className="ml-auto text-muted-foreground"> <Edit className="h-4 w-4" /> </Button> */}
          </CardContent>
        </Card>

        {/* Settings Sections */}
        <Card className="shadow-md">
            <CardContent className="p-0 divide-y divide-border"> {/* Added divide-y */}
                 {/* UPI Settings */}
                <SettingsItem href="/profile/upi" icon={CreditCard} title="UPI & Payment Settings" description="Manage linked accounts & UPI IDs" />
                {/* <Separator className="my-0" /> */}
                 {/* My QR Code */}
                <SettingsItem href="/scan?showMyQR=true" icon={QrCode} title="My UPI QR Code" description="Show your QR to receive payments" />
                {/* <Separator className="my-0" /> */}
                {/* KYC Status */}
                 <SettingsItem icon={ShieldCheck} title="KYC Verification" description={`Status: ${user.kycStatus}`} onClick={handleKYCClick} badgeStatus={user.kycStatus} />
                {/* <Separator className="my-0" /> */}
                {/* Security */}
                <SettingsItem href="/profile/security" icon={Lock} title="Security Settings" description="Change PIN, manage app lock" />
            </CardContent>
        </Card>

        <Card className="shadow-md">
             <CardContent className="p-0 divide-y divide-border"> {/* Added divide-y */}
                {/* Notifications */}
                <SettingsSwitchItem
                    icon={Bell}
                    title="Notifications"
                    description="Receive alerts & updates"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                />
                {/* <Separator className="my-0" /> */}
                {/* Biometric Lock */}
                 <SettingsSwitchItem
                    icon={User} // Using User icon as placeholder for fingerprint/face
                    title="Biometric Lock"
                    description="Use fingerprint/face unlock"
                    checked={biometric}
                    onCheckedChange={setBiometric}
                />
            </CardContent>
        </Card>


         <Card className="shadow-md">
             <CardContent className="p-0 divide-y divide-border"> {/* Added divide-y */}
                {/* Help & Support */}
                <SettingsItem href="/support" icon={MessageSquare} title="Help & Support" description="Contact us, FAQs" />
                 {/* <Separator className="my-0" /> */}
                {/* About */}
                 <SettingsItem href="/about" icon={Info} title="About PayFriend" description="App version, legal information" />
             </CardContent>
         </Card>

        {/* Logout Button */}
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to log out of PayFriend?
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">Logout</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </main>
    </div>
  );
}


// Helper Component for Settings Items
interface SettingsItemProps {
    icon: React.ElementType;
    title: string;
    description: string;
    href?: string;
    onClick?: () => void;
    badgeStatus?: string;
}

function SettingsItem({ icon: Icon, title, description, href, onClick, badgeStatus }: SettingsItemProps) {
    const commonClasses = "flex items-center justify-between p-4 hover:bg-accent transition-colors";
    const content = (
        <>
            <div className="flex items-center gap-4">
                <Icon className="h-5 w-5 text-primary" />
                <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {badgeStatus && (
                    <Badge variant={badgeStatus === 'Verified' ? 'default' : 'secondary'} className={`${badgeStatus === 'Verified' ? 'bg-green-100 text-green-700' : ''} pointer-events-none`}>
                        {badgeStatus}
                    </Badge>
                )}
                {(href || onClick) && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </div>
        </>
    );

  if (href) {
     // Use an anchor tag directly inside Link for better accessibility & event handling
    return (
        <Link href={href} passHref legacyBehavior>
           <a className={`${commonClasses} cursor-pointer`}>{content}</a>
        </Link>
    );
  }

  if (onClick) {
     // Use a button for accessibility if it performs an action
     return <button onClick={onClick} className={`${commonClasses} cursor-pointer w-full text-left`}>{content}</button>
  }

  // Non-interactive item (div)
  return <div className={commonClasses}>{content}</div>;
}


// Helper Component for Settings Items with a Switch
interface SettingsSwitchItemProps {
    icon: React.ElementType;
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

function SettingsSwitchItem({ icon: Icon, title, description, checked, onCheckedChange }: SettingsSwitchItemProps) {
    const id = title.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <Icon className="h-5 w-5 text-primary" />
                <div>
                    <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{title}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                aria-label={title}
            />
        </div>
    );
}

// Placeholder pages for navigation targets - these should exist as separate files
// Example: /app/profile/upi/page.tsx, /app/profile/security/page.tsx etc.
// export function UPISettingsPage() { return <div className="p-4">UPI Settings Page Content</div> }
// export function SecuritySettingsPage() { return <div className="p-4">Security Settings Page Content</div> }
// export function SupportPage() { return <div className="p-4">Support Page Content</div> }
// export function AboutPage() { return <div className="p-4">About Page Content</div> }

