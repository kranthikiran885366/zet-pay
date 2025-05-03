
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Lock, Key, Fingerprint, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Mock security state (replace with actual state/settings)
const securitySettings = {
  appLockEnabled: true,
  biometricEnabled: false,
  pinSet: true, // Assume PIN is initially set
};

export default function SecuritySettingsPage() {
  const [appLock, setAppLock] = useState(securitySettings.appLockEnabled);
  const [biometric, setBiometric] = useState(securitySettings.biometricEnabled);
  const { toast } = useToast();

   const handleAppLockChange = (checked: boolean) => {
        setAppLock(checked);
        // TODO: Call API to update app lock setting
        toast({ title: `App Lock ${checked ? 'Enabled' : 'Disabled'}` });
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

   const handleChangePin = () => {
       // TODO: Navigate to Change PIN flow
       alert("Navigate to Change PIN screen (not implemented).");
       // router.push('/profile/security/change-pin');
   };

   const handleSetPin = () => {
        // TODO: Navigate to Set PIN flow
       alert("Navigate to Set PIN screen (not implemented).");
       // router.push('/profile/security/set-pin');
   }

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
      <main className="flex-grow p-4 space-y-6">
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>App Security</CardTitle>
                <CardDescription>Manage how you secure the PayFriend app.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {/* Change UPI PIN */}
                <SettingsItem
                    icon={Key}
                    title={securitySettings.pinSet ? "Change UPI PIN" : "Set UPI PIN"}
                    description="Secure your UPI transactions"
                    onClick={securitySettings.pinSet ? handleChangePin : handleSetPin}
                />
                <Separator className="my-0" />

                {/* App Lock Switch */}
                 <SettingsSwitchItem
                    icon={Lock}
                    title="App Lock"
                    description="Require PIN or Biometric to open app"
                    checked={appLock}
                    onCheckedChange={handleAppLockChange}
                />
                <Separator className="my-0" />

                {/* Biometric Lock Switch */}
                 <SettingsSwitchItem
                    icon={Fingerprint} // Represents fingerprint/face
                    title="Biometric Unlock"
                    description="Use fingerprint/face instead of PIN"
                    checked={biometric}
                    onCheckedChange={handleBiometricChange}
                    disabled={!appLock} // Disable if app lock is off
                />
            </CardContent>
        </Card>

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
    onClick?: () => void;
}

function SettingsItem({ icon: Icon, title, description, onClick }: SettingsItemProps) {
  return (
    <div
      className="flex items-center justify-between p-4 hover:bg-accent transition-colors cursor-pointer"
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
    </div>
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
            <Switch
                id={id}
                checked={checked}
                onCheckedChange={onCheckedChange}
                aria-label={title}
                disabled={disabled}
            />
        </div>
    );
}
