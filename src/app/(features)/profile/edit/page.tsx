'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Save, Loader2, Camera as CameraIcon } from 'lucide-react'; // Added CameraIcon
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserProfile, upsertUserProfile, UserProfile } from '@/services/user';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  // const [avatarFile, setAvatarFile] = useState<File | null>(null); // For file upload
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
          setName(profile.name || '');
          setPhone(profile.phone || '');
          setAvatarUrl(profile.avatarUrl || `https://picsum.photos/seed/${profile.id}/200/200`);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // setAvatarFile(file);
      // Display preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ description: "Avatar preview updated. Save changes to upload."});
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    const updatedProfileData: Partial<UserProfile> = { name, phone };

    // TODO: Implement actual avatar file upload to Firebase Storage or other service
    // If avatarFile is set, upload it and get the new URL
    // For now, we'll assume avatarUrl is directly updatable if changed (e.g. from a URL input or a placeholder update)
    if (avatarUrl !== (user.avatarUrl || `https://picsum.photos/seed/${user.id}/200/200`)) {
        updatedProfileData.avatarUrl = avatarUrl;
    }
    
    try {
      await upsertUserProfile(updatedProfileData);
      toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
      // Optionally refetch profile or update local state more deeply
      setUser(prev => prev ? { ...prev, ...updatedProfileData } : null);
      router.push('/profile'); // Navigate back to profile page
    } catch (error: any) {
      console.error("Failed to save profile:", error);
      toast({ variant: "destructive", title: "Save Failed", description: error.message || "Could not save your profile." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
          <Button variant="ghost" size="icon" disabled><ArrowLeft className="h-5 w-5" /></Button>
          <User className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Edit Profile</h1>
        </header>
        <main className="flex-grow p-4">
          <Card className="shadow-md">
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-8 w-32" />
              </div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Could not load user profile. Please try again.</p>
        </div>
    ); // Or a more specific error component
  }


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/profile" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <User className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Edit Profile</h1>
      </header>

      <main className="flex-grow p-4">
        <form onSubmit={handleSaveProfile}>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Update Your Information</CardTitle>
              <CardDescription>Changes will be reflected across the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <Avatar className="h-24 w-24 text-4xl">
                    <AvatarImage src={avatarUrl} alt={name} data-ai-hint="user custom avatar" />
                    <AvatarFallback>{name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <Label htmlFor="avatar-upload" className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <CameraIcon className="h-6 w-6 text-white" />
                  </Label>
                </div>
                <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <Button type="button" variant="link" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>Change Photo</Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Cannot be changed)</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
