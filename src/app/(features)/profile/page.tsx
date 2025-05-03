
'use client';

import { useState, useEffect } from 'react'; // Import useEffect
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Bell, Lock, ShieldCheck, CreditCard, MessageSquare, Settings as SettingsIcon, LogOut, ChevronRight, QrCode, Info, Loader2 } from 'lucide-react'; // Import Loader2
import Link from 'next/link';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { logout } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile, UserProfile } from '@/services/user'; // Import user profile service
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null); // State for user profile
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [notifications, setNotifications] = useState(true); // Mock state, replace later
  const [biometric, setBiometric] = useState(false); // Mock state, replace later
  const { toast } = useToast();
  const router = useRouter();

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const profile = await getCurrentUserProfile();
        setUser(profile);
        // Set switch states based on fetched profile if available
        // setNotifications(profile?.settings?.notificationsEnabled ?? true);
        // setBiometric(profile?.settings?.biometricEnabled ?? false);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load your profile information.",
        });
        // Optionally logout or redirect if profile fetch critical and fails
        // handleLogout();
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [toast]);

   const handleLogout = async () => {
     try {
        await logout();
        toast({ title: "Logout Successful", description: "You have been logged out." });
        router.push('/login'); // Redirect to login page
     } catch (error) {
        console.error("Logout failed:", error);
         toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
     }
   };

  const handleKYCClick = () => {
      if (!user) return;
      // TODO: Navigate to KYC verification flow or show status details
      toast({ title: `KYC Status: ${user.kycStatus || 'Not Verified'}`, description: "This is your current KYC verification status." });
  }

  const kycStatus = user?.kycStatus || 'Not Verified';


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
      <main className="flex-grow p-4 space-y-6 pb-20">
        {/* User Info Card */}
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
                        <AvatarImage src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/100/100`} alt={user.name} data-ai-hint="user profile large"/>
                        <AvatarFallback>{user.name?.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-lg font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                         {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
                    </div>
                </>
             ) : (
                 <p className="text-sm text-muted-foreground">Could not load profile.</p>
             )}
          </CardContent>
        </Card>

        {/* Settings Sections */}
        <Card className="shadow-md">
            <CardContent className="p-0 divide-y divide-border">
                <SettingsItem href="/profile/upi" icon={CreditCard} title="UPI & Payment Settings" description="Manage linked accounts & UPI IDs" />
                <SettingsItem href="/scan?showMyQR=true" icon={QrCode} title="My UPI QR Code" description="Show your QR to receive payments" />
                 <SettingsItem icon={ShieldCheck} title="KYC Verification" description={`Status: ${kycStatus}`} onClick={handleKYCClick} badgeStatus={kycStatus} disabled={isLoading} />
                <SettingsItem href="/profile/security" icon={Lock} title="Security Settings" description="Change PIN, manage app lock" />
            </CardContent>
        </Card>

        <Card className="shadow-md">
             <CardContent className="p-0 divide-y divide-border">
                <SettingsSwitchItem
                    icon={Bell}
                    title="Notifications"
                    description="Receive alerts & updates"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                    disabled={isLoading}
                />
                 <SettingsSwitchItem
                    icon={User}
                    title="Biometric Lock"
                    description="Use fingerprint/face unlock"
                    checked={biometric}
                    onCheckedChange={setBiometric}
                    disabled={isLoading}
                />
            </CardContent>
        </Card>


         <Card className="shadow-md">
             <CardContent className="p-0 divide-y divide-border">
                <SettingsItem href="/support" icon={MessageSquare} title="Help & Support" description="Contact us, FAQs" />
                 <SettingsItem href="/about" icon={Info} title="About PayFriend" description="App version, legal information" />
             </CardContent>
         </Card>

        {/* Logout Button */}
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isLoading}>
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
    disabled?: boolean; // Added disabled prop
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
                    <Badge variant={badgeStatus === 'Verified' ? 'default' : 'secondary'} className={`${badgeStatus === 'Verified' ? 'bg-green-100 text-green-700' : badgeStatus === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} pointer-events-none`}>
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

  // Non-interactive item (div)
  return <div className={`${commonClasses} ${disabled ? 'opacity-50' : ''}`}>{content}</div>;
}


// Helper Component for Settings Items with a Switch
interface SettingsSwitchItemProps {
    icon: React.ElementType;
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean; // Added disabled prop
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
      