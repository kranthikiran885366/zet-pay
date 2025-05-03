
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Bell, Lock, ShieldCheck, CreditCard, MessageSquare, Settings as SettingsIcon, LogOut, ChevronRight, QrCode, Info } from 'lucide-react'; // Added Info icon
import Link from 'next/link';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge"; // Import Badge
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

   const handleLogout = () => {
     // TODO: Implement actual logout logic (clear tokens, redirect)
     console.log("Logging out...");
     alert("Logout Successful (Simulated)");
     // router.push('/login');
   };

  const handleKYCClick = () => {
      // TODO: Navigate to KYC verification flow or show status details
      alert(`KYC Status: ${user.kycStatus}`);
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
      <main className="flex-grow p-4 space-y-6">
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
            <CardContent className="p-0">
                 {/* UPI Settings */}
                <SettingsItem href="/profile/upi" icon={CreditCard} title="UPI & Payment Settings" description="Manage linked accounts & UPI IDs" />
                <Separator className="my-0" />
                 {/* My QR Code */}
                <SettingsItem href="/scan?showMyQR=true" icon={QrCode} title="My UPI QR Code" description="Show your QR to receive payments" />
                <Separator className="my-0" />
                {/* KYC Status */}
                 <SettingsItem icon={ShieldCheck} title="KYC Verification" description={`Status: ${user.kycStatus}`} onClick={handleKYCClick} badgeStatus={user.kycStatus} />
                <Separator className="my-0" />
                {/* Security */}
                <SettingsItem href="/profile/security" icon={Lock} title="Security Settings" description="Change PIN, manage app lock" />
            </CardContent>
        </Card>

        <Card className="shadow-md">
             <CardContent className="p-0">
                {/* Notifications */}
                <SettingsSwitchItem
                    icon={Bell}
                    title="Notifications"
                    description="Receive alerts & updates"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                />
                <Separator className="my-0" />
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
             <CardContent className="p-0">
                {/* Help & Support */}
                <SettingsItem href="/support" icon={MessageSquare} title="Help & Support" description="Contact us, FAQs" />
                 <Separator className="my-0" />
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
  const content = (
    <div className="flex items-center justify-between p-4 hover:bg-accent transition-colors cursor-pointer">
        <div className="flex items-center gap-4">
            <Icon className="h-5 w-5 text-primary" />
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
         {badgeStatus && (
            <Badge variant={badgeStatus === 'Verified' ? 'default' : 'secondary'} className={badgeStatus === 'Verified' ? 'bg-green-100 text-green-700' : ''}>
                {badgeStatus}
            </Badge>
         )}
         {(href || onClick) && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </div>
  );

  if (href) {
    return <Link href={href} passHref>{content}</Link>;
  }

  if (onClick) {
     return <div onClick={onClick}>{content}</div>
  }

  return content; // Non-interactive item
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

// Placeholder pages for navigation targets
// These should be moved to separate files eventually
export function UPISettingsPage() { return <div className="p-4">UPI Settings Page Content</div> }
export function SecuritySettingsPage() { return <div className="p-4">Security Settings Page Content</div> }
export function SupportPage() { return <div className="p-4">Support Page Content</div> }
export function AboutPage() { return <div className="p-4">About Page Content</div> }
