
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Bell, Lock, ShieldCheck, CreditCard, MessageSquare, Settings as SettingsIcon, LogOut, ChevronRight, QrCode, Info, Loader2, Wallet, Fingerprint } from 'lucide-react'; // Added Fingerprint
import Link from 'next/link';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { logout } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile, UserProfile, updateUserProfileSettings } from '@/services/user';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/lib/firebase'; 

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [smartWalletBridgeEnabled, setSmartWalletBridgeEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({}); 

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setUser(profile);
          setNotificationsEnabled(profile.notificationsEnabled ?? true);
          setAppLockEnabled(profile.appLockEnabled ?? false);
          setBiometricEnabled(profile.biometricEnabled ?? false);
          setSmartWalletBridgeEnabled(profile.isSmartWalletBridgeEnabled ?? false);
        } else if (auth.currentUser === null) {
          toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to view your profile." });
          router.push('/login'); 
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load your profile information.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [toast, router]);

  const handleSettingChange = async (settingKey: keyof UserProfile, value: boolean) => {
    if (!user) return;
    setIsUpdating(prev => ({ ...prev, [settingKey]: true }));

    const originalValue = user[settingKey]; 

    // Optimistic UI update
    setUser(prevUser => prevUser ? { ...prevUser, [settingKey]: value } : null);
    if (settingKey === 'notificationsEnabled') setNotificationsEnabled(value);
    if (settingKey === 'appLockEnabled') {
      setAppLockEnabled(value);
      if (!value) setBiometricEnabled(false); 
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
      if (settingKey === 'notificationsEnabled') setNotificationsEnabled(originalValue as boolean);
      if (settingKey === 'appLockEnabled') setAppLockEnabled(originalValue as boolean);
      if (settingKey === 'biometricEnabled') setBiometricEnabled(originalValue as boolean);
      if (settingKey === 'isSmartWalletBridgeEnabled') setSmartWalletBridgeEnabled(originalValue as boolean);

      toast({ variant: "destructive", title: "Update Failed", description: error.message || `Could not update ${settingKey}.` });
    } finally {
      setIsUpdating(prev => ({ ...prev, [settingKey]: false }));
    }
  };


  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logout Successful", description: "You have been logged out." });
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
    }
  };

  const handleKYCClick = () => {
    if (!user) return;
    toast({ title: `KYC Status: ${user.kycStatus || 'Not Verified'}`, description: "Manage your KYC verification here." });
  };

  const kycStatus = user?.kycStatus || 'Not Verified';

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Profile & Settings</h1>
      </header>

      <main className="flex-grow p-4 space-y-6 pb-20">
        <Card className="shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </>
            ) : user ? (
              <>
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/100/100`} alt={user.name} data-ai-hint="user profile large" />
                  <AvatarFallback>{user.name?.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Could not load profile. Please try logging in again.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-0 divide-y divide-border">
            <SettingsItem href="/profile/edit" icon={User} title="Edit Profile" description="Update your name, contact, avatar" disabled={isLoading || !user} />
            <SettingsItem href="/profile/upi" icon={CreditCard} title="UPI & Payment Settings" description="Manage linked accounts & UPI IDs" disabled={isLoading || !user} />
            <SettingsItem href="/scan?showMyQR=true" icon={QrCode} title="My UPI QR Code" description="Show your QR to receive payments" disabled={isLoading || !user} />
            <SettingsItem icon={ShieldCheck} title="KYC Verification" description={`Status: ${kycStatus}`} onClick={handleKYCClick} badgeStatus={kycStatus} disabled={isLoading || !user} />
            <SettingsItem href="/profile/security" icon={Lock} title="Security Settings" description="Change PIN, manage app lock" disabled={isLoading || !user} />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-0 divide-y divide-border">
            <SettingsSwitchItem
              icon={Bell}
              title="Notifications"
              description="Receive alerts & updates"
              checked={notificationsEnabled}
              onCheckedChange={(val) => handleSettingChange('notificationsEnabled', val)}
              disabled={isLoading || isUpdating['notificationsEnabled'] || !user}
            />
            <SettingsSwitchItem
              icon={Lock}
              title="App Lock"
              description="Use PIN/Biometric to open app"
              checked={appLockEnabled}
              onCheckedChange={(val) => handleSettingChange('appLockEnabled', val)}
              disabled={isLoading || isUpdating['appLockEnabled'] || !user}
            />
             <SettingsSwitchItem
              icon={Fingerprint}
              title="Biometric Unlock"
              description="Use fingerprint/face instead of PIN"
              checked={biometricEnabled}
              onCheckedChange={(val) => handleSettingChange('biometricEnabled', val)}
              disabled={isLoading || !appLockEnabled || isUpdating['biometricEnabled'] || !user}
            />
            <SettingsSwitchItem
              icon={Wallet}
              title="Smart Wallet Bridge"
              description="Auto-pay via Wallet if UPI limit exceeded"
              checked={smartWalletBridgeEnabled}
              onCheckedChange={(val) => handleSettingChange('isSmartWalletBridgeEnabled', val)}
              disabled={isLoading || isUpdating['isSmartWalletBridgeEnabled'] || !user}
            />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="p-0 divide-y divide-border">
            <SettingsItem href="/support" icon={MessageSquare} title="Help & Support" description="24/7 Live Chat, FAQs" disabled={isLoading || !user} />
            <SettingsItem href="/about" icon={Info} title="About PayFriend" description="App version, legal information" />
          </CardContent>
        </Card>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={isLoading || !user}>
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

interface SettingsItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  badgeStatus?: string;
  disabled?: boolean;
}

function SettingsItem({ icon: Icon, title, description, href, onClick, badgeStatus, disabled = false }: SettingsItemProps) {
  const commonClasses = "flex items-center justify-between p-4 transition-colors";
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
      <div className="flex items-center gap-2">
        {badgeStatus && (
          <Badge variant={badgeStatus === 'Verified' ? 'default' : badgeStatus === 'Pending' ? 'secondary' : 'destructive'} className={`${badgeStatus === 'Verified' ? 'bg-green-100 text-green-700' : badgeStatus === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} pointer-events-none`}>
            {badgeStatus}
          </Badge>
        )}
        {(href || onClick) && !disabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
      </div>
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
    return <button onClick={onClick} className={`${commonClasses} ${interactiveClasses} w-full text-left`} disabled={disabled}>{content}</button>
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
    } catch (error) {
      console.error("Error during switch change:", error);
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
        {(isSwitchUpdating || (disabled && !isSwitchUpdating && isUpdating[title.toLowerCase().replace(/\s+/g, '')])) && <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />}
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
