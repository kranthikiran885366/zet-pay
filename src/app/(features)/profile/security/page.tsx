'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Lock, Key, Fingerprint, ChevronRight, Wallet, Info, Loader2, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserProfile, UserProfile, updateUserProfileSettings } from '@/services/user';
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from '@/lib/firebase'; // For checking initial auth state

export default function SecuritySettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [smartWalletBridgeEnabled, setSmartWalletBridgeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setUser(profile);
          setAppLockEnabled(profile.appLockEnabled ?? false);
          setBiometricEnabled(profile.biometricEnabled ?? false);
          setSmartWalletBridgeEnabled(profile.isSmartWalletBridgeEnabled ?? false);
        } else {
          toast({ variant: "destructive", title: "Error", description: "Could not load user settings. Please log in." });
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

  const handleSettingChange = async (settingKey: keyof UserProfile, value: boolean) => {
    if (!user) return;
    setIsUpdating(prev => ({ ...prev, [settingKey]: true }));

    const originalValue = user[settingKey];

    // Optimistic UI update
    setUser(prevUser => prevUser ? { ...prevUser, [settingKey]: value } : null);
    if (settingKey === 'appLockEnabled') {
        setAppLockEnabled(value);
        if (!value) { // If app lock is turned off, biometric must also be turned off
            setBiometricEnabled(false);
            // If biometric was on, update it on backend too
            if (user.biometricEnabled) {
                await updateUserProfileSettings({ biometricEnabled: false });
            }
        }
    }
    if (settingKey === 'biometricEnabled') setBiometricEnabled(value);
    if (settingKey === 'isSmartWalletBridgeEnabled') setSmartWalletBridgeEnabled(value);

    try {
      if (settingKey === 'isSmartWalletBridgeEnabled' && value && user.kycStatus !== 'Verified') {
        toast({ variant: "destructive", title: "KYC Required", description: "Please complete KYC verification to enable Smart Wallet Bridge." });
        setUser(prevUser => prevUser ? { ...prevUser, [settingKey]: originalValue } : null);
        setSmartWalletBridgeEnabled(false);
        setIsUpdating(prev => ({ ...prev, [settingKey]: false }));
        return;
      }
      
      await updateUserProfileSettings({ [settingKey]: value });
      toast({ title: "Settings Updated", description: `${String(settingKey).replace(/([A-Z])/g, ' $1').trim()} ${value ? 'enabled' : 'disabled'}.` });
    } catch (error: any) {
      console.error(`Failed to update ${settingKey}:`, error);
      setUser(prevUser => prevUser ? { ...prevUser, [settingKey]: originalValue } : null);
      if (settingKey === 'appLockEnabled') setAppLockEnabled(originalValue as boolean);
      if (settingKey === 'biometricEnabled') setBiometricEnabled(originalValue as boolean);
      if (settingKey === 'isSmartWalletBridgeEnabled') setSmartWalletBridgeEnabled(originalValue as boolean);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || `Could not update ${settingKey}.` });
    } finally {
      setIsUpdating(prev => ({ ...prev, [settingKey]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/profile" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Lock className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Security Settings</h1>
      </header>

      <main className="flex-grow p-4 space-y-6 pb-20">
        {isLoading ? (
          <>
            <Card className="shadow-md"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
            <Card className="shadow-md"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          </>
        ) : (
          <>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>App Security</CardTitle>
                <CardDescription>Manage how you secure the PayFriend app.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SettingsItem href="/profile/upi" icon={Key} title="Manage UPI PIN" description="Set or reset your UPI transaction PIN" />
                <Separator className="my-0" />
                <SettingsSwitchItem
                  icon={Lock}
                  title="App Lock"
                  description="Require PIN or Biometric to open app"
                  checked={appLockEnabled}
                  onCheckedChange={(val) => handleSettingChange('appLockEnabled', val)}
                  disabled={isUpdating['appLockEnabled']}
                />
                <Separator className="my-0" />
                <SettingsSwitchItem
                  icon={Fingerprint}
                  title="Biometric Unlock"
                  description="Use fingerprint/face instead of PIN"
                  checked={biometricEnabled}
                  onCheckedChange={(val) => handleSettingChange('biometricEnabled', val)}
                  disabled={!appLockEnabled || isUpdating['biometricEnabled']}
                />
              </CardContent>
            </Card>

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
                  onCheckedChange={(val) => handleSettingChange('isSmartWalletBridgeEnabled', val)}
                  disabled={isUpdating['isSmartWalletBridgeEnabled']}
                />
                <div className="p-4 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>If your daily UPI limit is reached, payments will automatically use your Zet Pay Wallet balance (up to your set limit, KYC required). The amount will be auto-recovered from your bank account after midnight.</span>
                </div>
                {/* Link to configure limit - for future enhancement */}
                <SettingsItem href="/profile/security/smart-wallet-limit" icon={SettingsIcon} title="Configure Fallback Limit" description={`Current Limit: ₹${user?.smartWalletBridgeLimit || 0}`} />
              </CardContent>
            </Card>
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Device Management</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                     <SettingsItem icon={Smartphone} title="Manage Logged-in Devices" onClick={() => toast({title: "Coming Soon!", description: "This feature will allow you to see and manage devices."})} />
                </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

interface SettingsItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

function SettingsItem({ icon: Icon, title, description, href, onClick, disabled = false }: SettingsItemProps) {
  const commonClasses = "flex items-center justify-between p-4 transition-colors w-full text-left";
  const interactiveClasses = !disabled ? "hover:bg-accent cursor-pointer" : "opacity-50 cursor-not-allowed";

  const content = (
    <>
      <div className="flex items-center gap-4">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {(href || onClick) && !disabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} passHref legacyBehavior>
        <a className={`${commonClasses} ${interactiveClasses}`}>{content}</a>
      </Link>
    );
  }
  if (onClick && !disabled) {
    return <button onClick={onClick} className={commonClasses} disabled={disabled}>{content}</button>;
  }
  return <div className={`${commonClasses} ${disabled ? 'opacity-50' : ''}`}>{content}</div>;
}

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
  const [isSwitchUpdating, setIsSwitchUpdating] = useState(false);

  const handleChange = async (newChecked: boolean) => {
    if (disabled || isSwitchUpdating) return;
    setIsSwitchUpdating(true);
    try {
      await onCheckedChange(newChecked);
    } finally {
      setIsSwitchUpdating(false);
    }
  };

  return (
    <div className={`flex items-center justify-between p-4 ${disabled && !isSwitchUpdating ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-4">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <Label htmlFor={id} className={`text-sm font-medium ${disabled && !isSwitchUpdating ? 'cursor-not-allowed' : 'cursor-pointer'}`}>{title}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center">
        {(isSwitchUpdating || (disabled && !isSwitchUpdating)) && <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />}
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={handleChange}
          aria-label={title}
          disabled={disabled || isSwitchUpdating}
        />
      </div>
    </div>
  );
}
