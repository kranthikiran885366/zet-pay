'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wallet, Save, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserProfile, UserProfile, updateUserProfileSettings } from '@/services/user';
import { Slider } from '@/components/ui/slider';

const MAX_FALLBACK_LIMIT = 5000; // Max allowable fallback limit
const MIN_FALLBACK_LIMIT = 0; // Min can be 0 (effectively disabled without KYC check)

export default function SmartWalletLimitPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [smartWalletLimit, setSmartWalletLimit] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setUser(profile);
          setSmartWalletLimit(profile.smartWalletBridgeLimit ?? 0);
        } else {
          toast({ variant: "destructive", title: "Error", description: "Could not load profile. Please log in." });
          router.push('/login');
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load your profile information." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [toast, router]);

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (smartWalletLimit > MAX_FALLBACK_LIMIT) {
        toast({ variant: "destructive", title: "Limit Exceeded", description: `Fallback limit cannot exceed ₹${MAX_FALLBACK_LIMIT}.`});
        return;
    }
    if (smartWalletLimit < MIN_FALLBACK_LIMIT) {
        toast({ variant: "destructive", title: "Invalid Limit", description: `Fallback limit must be at least ₹${MIN_FALLBACK_LIMIT}.`});
        return;
    }

    // KYC check if enabling or increasing limit with bridge active
    if (user.isSmartWalletBridgeEnabled && smartWalletLimit > 0 && user.kycStatus !== 'Verified') {
        toast({ variant: "destructive", title: "KYC Required", description: "Please complete KYC verification to set a Smart Wallet Bridge limit." });
        return;
    }


    setIsSaving(true);
    try {
      await updateUserProfileSettings({ smartWalletBridgeLimit: smartWalletLimit });
      toast({ title: "Limit Updated", description: `Smart Wallet fallback limit set to ₹${smartWalletLimit}.` });
      setUser(prev => prev ? { ...prev, smartWalletBridgeLimit: smartWalletLimit } : null);
      router.push('/profile/security');
    } catch (error: any) {
      console.error("Failed to save limit:", error);
      toast({ variant: "destructive", title: "Save Failed", description: error.message || "Could not save the limit." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setSmartWalletLimit(value[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) value = 0;
    if (value < MIN_FALLBACK_LIMIT) value = MIN_FALLBACK_LIMIT;
    if (value > MAX_FALLBACK_LIMIT) value = MAX_FALLBACK_LIMIT;
    setSmartWalletLimit(value);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Could not load user profile. Please try again.</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/profile/security" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Wallet className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Configure Smart Wallet Limit</h1>
      </header>

      <main className="flex-grow p-4">
        <form onSubmit={handleSaveLimit}>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Set Fallback Limit</CardTitle>
              <CardDescription>
                Define the maximum amount (up to ₹{MAX_FALLBACK_LIMIT}) PayFriend can use from your wallet if your UPI transaction limit is exceeded.
                Requires KYC verification and Smart Wallet Bridge to be enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               {user.kycStatus !== 'Verified' && user.isSmartWalletBridgeEnabled && (
                    <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-700 text-sm flex items-center gap-2">
                        <Info className="h-5 w-5"/>
                        <span>KYC verification is required to use this feature. Current Limit: ₹0.</span>
                    </div>
               )}
              
              <div className="space-y-2">
                <Label htmlFor="limitAmount" className="text-center block text-2xl font-bold">₹{smartWalletLimit}</Label>
                <Slider
                  id="limitAmountSlider"
                  value={[smartWalletLimit]}
                  onValueChange={handleSliderChange}
                  max={MAX_FALLBACK_LIMIT}
                  step={100}
                  disabled={isSaving || (user.isSmartWalletBridgeEnabled && user.kycStatus !== 'Verified')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="limitInput">Enter Limit Manually (₹0 - ₹{MAX_FALLBACK_LIMIT})</Label>
                <Input
                  id="limitInput"
                  type="number"
                  value={smartWalletLimit}
                  onChange={handleInputChange}
                  min={MIN_FALLBACK_LIMIT}
                  max={MAX_FALLBACK_LIMIT}
                  step={100}
                  disabled={isSaving || (user.isSmartWalletBridgeEnabled && user.kycStatus !== 'Verified')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving || (user.isSmartWalletBridgeEnabled && user.kycStatus !== 'Verified')}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Limit'}
              </Button>

              {!user.isSmartWalletBridgeEnabled && (
                 <p className="text-xs text-muted-foreground text-center">Note: Smart Wallet Bridge is currently disabled. Enable it in Security Settings to use this limit.</p>
              )}
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
