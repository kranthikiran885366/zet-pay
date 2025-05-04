
'use client';

import { useState, useEffect } from 'react'; // Import useEffect
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Lock, Key, Fingerprint, ChevronRight, Wallet, Info, Loader2 } from 'lucide-react'; // Added Wallet, Info, Loader2
import Link from 'next/link';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserProfile, UserProfile, updateSmartWalletBridgeSettings } from '@/services/user'; // Import user services
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

export default function SecuritySettingsPage() {
  const [appLock, setAppLock] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [smartWalletBridgeEnabled, setSmartWalletBridgeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Loading state for profile fetch
  const [isUpdating, setIsUpdating] = useState(false); // State for async updates
  const { toast } = useToast();

    // Fetch user profile settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const profile = await getCurrentUserProfile();
                if (profile) {
                    // Set initial state from profile (replace mock data)
                    setAppLock(profile.appLockEnabled ?? false); // Assuming these exist on profile
                    setBiometric(profile.biometricEnabled ?? false); // Assuming these exist on profile
                    setSmartWalletBridgeEnabled(profile.isSmartWalletBridgeEnabled ?? false);
                } else {
                     toast({ variant: "destructive", title: "Error", description: "Could not load user settings." });
                }
            } catch (error) {
                console.error("Failed to fetch user settings:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load settings." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [toast]);


   const handleAppLockChange = (checked: boolean) => {
        setAppLock(checked);
        // TODO: Call API to update app lock setting
        toast({ title: `App Lock ${checked ? 'Enabled' : 'Disabled'}` });
        if (!checked) {
             setBiometric(false); // Disable biometric if app lock is turned off
             // TODO: Call API to disable biometric too if needed
        }
   };

    const handleBiometricChange = (checked: boolean) => {
        if (checked && !appLock) {
            toast({ variant: "destructive", title: "Enable App Lock First", description: "Biometric unlock requires App Lock to be enabled." });
            return;
        }
        setBiometric(checked);
        // TODO: Call API to update biometric setting
        toast({ title: `Biometric Unlock ${checked ? 'Enabled' : 'Disabled'}` });
   };

   // Handle Smart Wallet Bridge Toggle
   const handleSmartWalletBridgeChange = async (checked: boolean) => {
       setIsUpdating(true);
       setSmartWalletBridgeEnabled(checked); // Optimistic UI update
       try {
            const currentProfile = await getCurrentUserProfile();
            if (checked && currentProfile?.kycStatus !== 'Verified') {
                 toast({ variant: "destructive", title: "KYC Required", description: "Please complete KYC verification to enable Smart Wallet Bridge." });
                 setSmartWalletBridgeEnabled(false); // Revert optimistic update
                 return;
            }

           // Fetch current limit to send it back, or use a default/null
           const currentLimit = currentProfile?.smartWalletBridgeLimit; // Get current limit

           await updateSmartWalletBridgeSettings({ isSmartWalletBridgeEnabled: checked, smartWalletBridgeLimit: currentLimit });
           toast({ title: `Smart Wallet Bridge ${checked ? 'Enabled' : 'Disabled'}` });
       } catch (error: any) {
           console.error("Failed to update Smart Wallet Bridge setting:", error);
           setSmartWalletBridgeEnabled(!checked); // Revert UI on error
           toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update setting." });
       } finally {
           setIsUpdating(false);
       }
   };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/profile" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Lock className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Security Settings</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-6 pb-20">
        {isLoading ? (
            <Card className="shadow-md"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ) : (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>App Security</CardTitle>
                    <CardDescription>Manage how you secure the PayFriend app.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Link to UPI PIN management */}
                     <Link href="/profile/upi" passHref legacyBehavior>
                        <SettingsItem
                            icon={Key}
                            title="Manage UPI PIN"
                            description="Set or reset your UPI transaction PIN"
                        />
                     </Link>
                    <Separator className="my-0" />

                    {/* App Lock Switch */}
                     <SettingsSwitchItem
                        icon={Lock}
                        title="App Lock"
                        description="Require PIN or Biometric to open app"
                        checked={appLock}
                        onCheckedChange={handleAppLockChange}
                        disabled={isUpdating}
                    />
                    <Separator className="my-0" />

                    {/* Biometric Lock Switch */}
                     <SettingsSwitchItem
                        icon={Fingerprint} // Represents fingerprint/face
                        title="Biometric Unlock"
                        description="Use fingerprint/face instead of PIN"
                        checked={biometric}
                        onCheckedChange={handleBiometricChange}
                        disabled={!appLock || isUpdating} // Disable if app lock is off or updating
                    />
                </CardContent>
            </Card>
        )}


          {/* Smart Wallet Bridge Section */}
          {isLoading ? (
              <Card className="shadow-md"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ) : (
            <Card className="shadow-md">
                 <CardHeader>
                    <CardTitle>Smart Wallet Bridge</CardTitle>
                    <CardDescription>Auto-pay via Wallet if UPI limit exceeded.</CardDescription>
                 </CardHeader>
                 <CardContent className="p-0">
                     <SettingsSwitchItem
                        icon={Wallet}
                        title="Enable Smart Wallet Bridge"
                        description="Allows fallback to wallet for UPI limit issues (KYC required)"
                        checked={smartWalletBridgeEnabled}
                        onCheckedChange={handleSmartWalletBridgeChange}
                        disabled={isUpdating} // Disable while any update is processing
                    />
                     <div className="p-4 text-xs text-muted-foreground flex items-start gap-2">
                         <Info className="h-4 w-4 mt-0.5 shrink-0" />
                         <span>If your daily UPI limit (₹1 Lakh) is reached, payments will automatically use your Zet Pay Wallet balance (up to ₹5,000 fallback limit, requires KYC). The amount will be auto-recovered from your bank account after midnight.</span>
                     </div>
                     {/* TODO: Add UI to configure the fallback limit (smartWalletBridgeLimit) */}
                 </CardContent>
            </Card>
         )}


         {/* Add other security sections if needed, e.g., */}
        {/* <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Device Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                 <SettingsItem icon={Smartphone} title="Manage Logged-in Devices" onClick={() => alert("Show devices")} />
            </CardContent>
        </Card> */}

      </main>
    </div>
  );
}


// Reusable Setting Item Component
interface SettingsItemProps {
    icon: React.ElementType;
    title: string;
    description: string;
    onClick?: () => void; // Keep onClick optional if it's a link
}

function SettingsItem({ icon: Icon, title, description, onClick }: SettingsItemProps) {
  const Comp = onClick ? 'button' : 'div'; // Use button if onClick is provided
  const commonClasses = "flex items-center justify-between p-4 hover:bg-accent transition-colors w-full text-left";
  const cursorClass = onClick ? "cursor-pointer" : "";

  return (
    <Comp
      className={`${commonClasses} ${cursorClass}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className="flex items-center gap-4">
            <Icon className="h-5 w-5 text-primary" />
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
        {onClick && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </Comp>
  );
}


// Reusable Setting Item with Switch Component
interface SettingsSwitchItemProps {
    icon: React.ElementType;
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}

function SettingsSwitchItem({ icon: Icon, title, description, checked, onCheckedChange, disabled = false }: SettingsSwitchItemProps) {
    const id = title.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className={`flex items-center justify-between p-4 ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-4">
                <Icon className="h-5 w-5 text-primary" />
                <div>
                    <Label htmlFor={id} className={`text-sm font-medium ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>{title}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="flex items-center">
                {disabled && isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground"/>}
                <Switch
                    id={id}
                    checked={checked}
                    onCheckedChange={onCheckedChange}
                    aria-label={title}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}
