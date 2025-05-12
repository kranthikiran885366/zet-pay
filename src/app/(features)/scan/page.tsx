'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, QrCode as QrCodeIcon, AlertTriangle, Zap, Loader2, CameraOff, Camera, ShieldCheck, ShieldAlert, Flag, UserPlus, RefreshCw, ShieldQuestion, Wallet, Fingerprint, MessageSquare, EyeOff, Eye, VolumeX, Volume2, Check, Minus, Plus, Search, Star, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { getCurrentUserProfile } from '@/services/user';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ZetChat } from '@/components/zet-chat';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { validateQrCodeApi, reportQrCodeApi, QrValidationResult as ApiQrValidationResult, getRecentScansApi, RecentScan } from '@/services/scan';
import { addFavoriteQrApi, getFavoriteQrsApi, removeFavoriteQrApi, FavoriteQr } from '@/services/favorites';


interface ParsedUpiData {
  payeeName?: string;
  payeeAddress?: string;
  amount?: string;
  note?: string;
  isValidUpi: boolean;
  originalData: string;
  signature?: string;
  isZetPayUser?: boolean;
}

const parseUpiUrl = (url: string): ParsedUpiData => {
    try {
        const decodedUrl = decodeURIComponent(url);
        if (!decodedUrl.startsWith('upi://pay')) {
            return { isValidUpi: false, originalData: url };
        }
        const params = new URLSearchParams(decodedUrl.substring(decodedUrl.indexOf('?') + 1));
        const isZetPay = params.get('pa')?.includes('@payfriend') || Math.random() > 0.5;
        return {
            payeeName: params.get('pn') || undefined,
            payeeAddress: params.get('pa') || undefined,
            amount: params.get('am') || undefined,
            note: params.get('tn') || undefined,
            isValidUpi: !!params.get('pa'),
            originalData: url,
            signature: params.get('sign') || undefined,
            isZetPayUser: isZetPay,
        };
    } catch (error) {
        console.error("Failed to parse UPI URL:", error);
        return { isValidUpi: false, originalData: url };
    }
};

interface QrValidationResult extends ApiQrValidationResult {
    isDuplicateRecent: boolean;
    pastPaymentSuggestions?: number[];
    isFavorite?: boolean;
    customTagName?: string;
}

const RECENT_SCANS_KEY = 'payfriend_recent_scans';
const RECENT_SCANS_MAX_LOCAL = 5; // Max local recent scans shown before API fetch
const RECENT_SCAN_COOLDOWN_MS = 15000; 

interface RecentScanEntry {
    qrDataHash: string;
    timestamp: number;
}

const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
    }
    return hash.toString();
};


export default function ScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showMyQROnLoad = searchParams.get('showMyQR') === 'true';
  const [activeTab, setActiveTab] = useState(showMyQROnLoad ? 'myQR' : 'scan');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedUpiData, setScannedUpiData] = useState<ParsedUpiData | null>(null);
  const [rawScannedText, setRawScannedText] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<QrValidationResult | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [userName, setUserName] = useState<string>("Your Name");
  const [userUpiId, setUserUpiId] = useState<string>("defaultuser@payfriend");
  const [userQRCodeUrl, setUserQRCodeUrl] = useState<string>('');
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [ambientLight, setAmbientLight] = useState<'bright' | 'dim' | 'unknown'>('unknown');

  const [isStealthMode, setIsStealthMode] = useState(false);
  const [isStealthSilentMode, setIsStealthSilentMode] = useState(false);
  const [hideAmountInStealth, setHideAmountInStealth] = useState(true);

  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  // Smart QR Memory State
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [favoriteQrs, setFavoriteQrs] = useState<FavoriteQr[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [showAddFavoriteDialog, setShowAddFavoriteDialog] = useState(false);
  const [favoriteTagName, setFavoriteTagName] = useState('');
  const [favoriteDefaultAmount, setFavoriteDefaultAmount] = useState('');
  const [showRepeatSuggestionModal, setShowRepeatSuggestionModal] = useState(false);


  useEffect(() => {
    const fetchUserDataForQR = async () => {
      setIsQrLoading(true);
      const currentUser = auth.currentUser;
      let nameToUse = "Your Name";
      let upiIdToUse = "defaultuser@payfriend";

      if (currentUser) {
        try {
          const profile = await getCurrentUserProfile();
          nameToUse = profile?.name || currentUser.displayName || "PayFriend User";
          upiIdToUse = (profile as any)?.primaryUpiId || `${currentUser.uid.substring(0,5)}@payfriend`;
        } catch (error) {
          console.error("Failed to fetch user data for QR:", error);
          if (currentUser.uid) upiIdToUse = `${currentUser.uid.substring(0,5)}@payfriend`;
        }
      }
      setUserName(nameToUse);
      setUserUpiId(upiIdToUse);
      setUserQRCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(upiIdToUse)}&pn=${encodeURIComponent(nameToUse)}&mc=0000`);
      setIsQrLoading(false);
    };

    if (activeTab === 'myQR') {
      fetchUserDataForQR();
    } else {
      setIsQrLoading(false);
    }
  }, [activeTab]);

  // Fetch Recent and Favorite QRs on mount/tab change
  useEffect(() => {
      if (activeTab === 'scan' && auth.currentUser) {
          fetchRecentScans();
          fetchFavoriteQrs();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchRecentScans = async () => {
      setIsLoadingRecents(true);
      try {
          const recents = await getRecentScansApi();
          setRecentScans(recents);
      } catch (error) {
          console.error("Failed to fetch recent scans:", error);
          toast({ variant: "destructive", title: "Could not load recent scans" });
      } finally {
          setIsLoadingRecents(false);
      }
  };

  const fetchFavoriteQrs = async () => {
      setIsLoadingFavorites(true);
      try {
          const favorites = await getFavoriteQrsApi();
          setFavoriteQrs(favorites);
      } catch (error) {
          console.error("Failed to fetch favorite QRs:", error);
          toast({ variant: "destructive", title: "Could not load favorite QRs" });
      } finally {
          setIsLoadingFavorites(false);
      }
  };


  const stopCameraStream = useCallback(async (turnOffTorchIfOn = true) => {
    setIsScanningActive(false);
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      for (const track of tracks) {
        if (turnOffTorchIfOn && torchOn && track.kind === 'video' && 'applyConstraints' in track && (track as any).getCapabilities?.().torch) {
            try { await (track as any).applyConstraints({ advanced: [{ torch: false }] }); } catch (e) { console.warn("Error turning off torch:", e); }
        }
        track.stop();
      }
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      if (turnOffTorchIfOn) setTorchOn(false);
      console.log("[Client Scan] Camera stream stopped.");
    }
  }, [torchOn]);

  const handleScannedData = useCallback(async (data: string) => {
    if (!auth.currentUser) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in to scan and pay." });
        setIsProcessingScan(false); // Reset processing scan if not authenticated
        return;
    }
    if (isProcessingScan) return; 

    await stopCameraStream(false); 
    setIsProcessingScan(true);
    setRawScannedText(data);
    if (!isStealthSilentMode) toast({ title: "QR Code Scanned", description: "Validating details..." });

    const parsedData = parseUpiUrl(data);
    setScannedUpiData(parsedData);

    if (!parsedData.isValidUpi || !parsedData.payeeAddress) {
        if (!isStealthSilentMode) toast({ variant: "destructive", title: "Invalid QR Code", description: "This QR code is not a valid UPI payment code." });
        setValidationResult(null);
        setIsProcessingScan(false);
        return;
    }

    const qrHash = simpleHash(data);
    // Local recent scan check (visual cue or soft block)
    const localRecentScans: RecentScanEntry[] = JSON.parse(localStorage.getItem(RECENT_SCANS_KEY) || '[]');
    const isLocallyRecent = localRecentScans.some(scan => scan.qrDataHash === qrHash && (Date.now() - scan.timestamp) < RECENT_SCAN_COOLDOWN_MS);
    const updatedLocalRecentScans = [{ qrDataHash: qrHash, timestamp: Date.now() }, ...localRecentScans.filter(s => s.qrDataHash !== qrHash)].slice(0, RECENT_SCANS_MAX_LOCAL);
    localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updatedLocalRecentScans));
    if (isLocallyRecent && !isStealthSilentMode) toast({description: "This QR was scanned locally recently.", duration: 3000});


    try {
      const validation: QrValidationResult = await validateQrCodeApi(data, parsedData.signature, isStealthMode);
      setValidationResult({...validation, isDuplicateRecent: isLocallyRecent, upiId: parsedData.payeeAddress });
      
      if (validation.merchantNameFromDb && parsedData.payeeName !== validation.merchantNameFromDb) {
          setScannedUpiData(prev => prev ? ({...prev, payeeName: validation.merchantNameFromDb}) : null);
      }
      
      if (validation.pastPaymentSuggestions && validation.pastPaymentSuggestions.length > 0 && !isStealthMode) {
          setShowRepeatSuggestionModal(true);
      }


      if (!isStealthSilentMode) {
        if (validation.isBlacklisted) {
          toast({ variant: "destructive", title: "Warning: Suspicious QR", description: validation.message || "This QR code is flagged as suspicious.", duration: 7000 });
        } else if (validation.isReportedPreviously) {
          toast({ variant: "destructive", title: "Warning: Reported QR", description: "This QR code has been reported by other users. Proceed with extreme caution.", duration: 7000 });
        } else if (!validation.isVerifiedMerchant && !validation.hasValidSignature && !isLocallyRecent) {
          toast({ variant: "default", title: "Unverified Payee", description: "Payee is not a verified merchant and QR signature is missing/invalid. Proceed with caution.", duration: 7000 });
        } else if (!validation.isVerifiedMerchant && !isLocallyRecent){
          toast({ variant: "default", title: "Unverified Payee", description: "Payee is not a verified merchant. Proceed with caution.", duration: 5000 });
        } else {
          toast({ title: "QR Validated", description: "Details fetched successfully." });
        }
      }
    } catch (error: any) {
      console.error("QR Validation Error:", error);
      if (!isStealthSilentMode) toast({ variant: "destructive", title: "Validation Error", description: error.message || "Could not validate QR code." });
      setValidationResult({isBlacklisted: false, isVerifiedMerchant: false, isDuplicateRecent: isLocallyRecent, hasValidSignature: false, isReportedPreviously: false});
    } finally {
      setIsProcessingScan(false);
      fetchRecentScans(); // Refresh recent scans list
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopCameraStream, toast, isStealthMode, isStealthSilentMode, router, isProcessingScan]);

  const getCameraStream = useCallback(async () => {
    setHasCameraPermission(null);
    setTorchSupported(false);

    if (streamRef.current) await stopCameraStream(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.error("Video play error:", e));
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'getCapabilities' in videoTrack) {
        const capabilities = (videoTrack as any).getCapabilities();
        setTorchSupported(!!capabilities?.torch);
        const hour = new Date().getHours();
        const currentAmbientLight = (hour < 7 || hour > 19) ? 'dim' : 'bright';
        setAmbientLight(currentAmbientLight);

        if (currentAmbientLight === 'dim' && !!capabilities?.torch && !torchOn && (isStealthMode || activeTab === 'scan')) {
            try {
                await (videoTrack as any).applyConstraints({ advanced: [{ torch: true }] });
                setTorchOn(true);
                if(!isStealthSilentMode) toast({ description: "Low light, torch auto-activated." });
            } catch(e) { console.warn("Error auto-activating torch:", e); }
        }
      }
      setIsScanningActive(true);

      const scanInterval = setInterval(async () => { 
        if (!auth.currentUser) { // Check auth before simulating scan
            console.log("[Client Scan] Simulated Live QR detection skipped: User not authenticated.");
            clearInterval(scanInterval);
            return;
        }
        if (isScanningActive && streamRef.current && !isProcessingScan) { 
            if (Math.random() < 0.05) { 
                 const mockQrData = Math.random() > 0.5
                    ? "upi://pay?pa=demomerchant@okbank&pn=Demo%20Store&am=100&tn=TestPayment&sign=MOCK_SIGNATURE_VALID"
                    : "upi://pay?pa=anotheruser@okupi&pn=Another%20User";
                 console.log("[Client Scan] Simulated Live QR detected:", mockQrData);
                 await handleScannedData(mockQrData); 
                 clearInterval(scanInterval); 
            }
        } else if (!isScanningActive || !streamRef.current) {
            clearInterval(scanInterval);
        }
      }, 2000); 

      return () => clearInterval(scanInterval);

    } catch (error: any) {
      console.error('[Client Scan] Error accessing camera:', error.name, error.message);
      setHasCameraPermission(false);
      streamRef.current = null;
      if (!isStealthSilentMode) toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera. Please check permissions.'});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, stopCameraStream, isScanningActive, handleScannedData, torchOn, isStealthMode, isStealthSilentMode, activeTab, isProcessingScan]);

  useEffect(() => {
    if (activeTab === 'scan' && isScanningActive && ambientLight === 'dim' && torchSupported && !torchOn && !isStealthMode && !isStealthSilentMode) {
      toast({ description: "Low light detected. Use the torch icon if needed.", duration: 3000 });
    }
  }, [ambientLight, activeTab, isScanningActive, torchSupported, torchOn, toast, isStealthMode, isStealthSilentMode]);

  useEffect(() => {
    let cleanupScanInterval: (() => void) | undefined;
    if (activeTab === 'scan' && !scannedUpiData && !isProcessingScan) { 
        getCameraStream().then(cleanup => { cleanupScanInterval = cleanup; });
    } else {
        stopCameraStream();
    }
    return () => {
        stopCameraStream();
        if (cleanupScanInterval) cleanupScanInterval();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, getCameraStream, stopCameraStream, scannedUpiData, isProcessingScan]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported) {
      if (!isStealthSilentMode) toast({ variant: "destructive", title: "Torch Not Available"});
      return;
    }
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const newTorchState = !torchOn;
    try {
      await (videoTrack as any).applyConstraints({ advanced: [{ torch: newTorchState }] });
      setTorchOn(newTorchState);
      if (!isStealthSilentMode) toast({ description: `Torch ${newTorchState ? 'ON' : 'OFF'}` });
    } catch (err) {
      console.error('[Client Scan] Error controlling torch:', err);
      if (!isStealthSilentMode) toast({ variant: "destructive", title: "Could not control torch"});
      setTorchOn(false);
    }
  }, [torchOn, torchSupported, toast, isStealthSilentMode]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!auth.currentUser) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in to upload QR." });
        if (event.target) event.target.value = ''; // Clear file input
        return;
    }
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingUpload(true);
      setScannedUpiData(null);
      setValidationResult(null);
      setRawScannedText(null);
      await stopCameraStream();
      if (!isStealthSilentMode) toast({ title: "Processing Image...", description: "Attempting to decode QR code." });
      try {
        const qrReader = new FileReader();
        qrReader.onload = async (e) => {
            const image = new window.Image();
            image.src = e.target?.result as string;
            image.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error("Could not get canvas context");
                }
                ctx.drawImage(image, 0, 0);
                // In a real app, use a QR decoding library like jsQR or Zxing-js here
                // For mock, simulate detection from filename
                const mockDecodedData = `upi://pay?pa=uploaded.${file.name.split('.')[0]}@okbank&pn=Uploaded%20Merchant&am=50`;
                if (mockDecodedData) {
                    await handleScannedData(mockDecodedData);
                } else {
                    if (!isStealthSilentMode) toast({ variant: "destructive", title: "No QR Code Found", description: "Could not find a QR code in the image." });
                }
            };
        };
        qrReader.readAsDataURL(file);
      } catch(error) {
        console.error("Error processing uploaded QR:", error);
        if (!isStealthSilentMode) toast({ variant: "destructive", title: "Processing Error", description: "Failed to process the image." });
      } finally {
         setIsProcessingUpload(false);
         if (event.target) event.target.value = '';
         if (activeTab === 'scan' && !streamRef.current && !scannedUpiData) {
            getCameraStream();
         }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, stopCameraStream, activeTab, getCameraStream, handleScannedData, scannedUpiData, isStealthSilentMode]);

  const proceedToPayment = (amountToPay?: number) => {
    if (!scannedUpiData || !scannedUpiData.isValidUpi || !scannedUpiData.payeeAddress || validationResult?.isBlacklisted || validationResult?.isReportedPreviously) {
        if (!isStealthSilentMode || isStealthMode) toast({variant: "destructive", title: "Cannot Proceed", description: validationResult?.isBlacklisted || validationResult?.isReportedPreviously ? "Payment blocked for suspicious or reported QR." : "Invalid payment details."});
        return;
    }
    const query = new URLSearchParams();
    query.set('pa', scannedUpiData.payeeAddress);
    if (scannedUpiData.payeeName) query.set('pn', scannedUpiData.payeeName);
    
    const finalAmount = amountToPay !== undefined ? amountToPay.toString() : scannedUpiData.amount;
    if (finalAmount && !(isStealthMode && hideAmountInStealth)) query.set('am', finalAmount);
    
    if (scannedUpiData.note) query.set('tn', scannedUpiData.note);
    query.set('qrData', scannedUpiData.originalData);
    if (isStealthMode) query.set('stealth', 'true');
    router.push(`/pay?${query.toString()}`);
  };

  const handleConfirmReport = async () => {
    if (!rawScannedText || !reportReason.trim()) {
        toast({variant: "destructive", title: "Report Error", description: "Reason for reporting is required."});
        return;
    }
    setShowReportDialog(false);
    try {
        await reportQrCodeApi(rawScannedText, reportReason);
        toast({ title: "QR Reported", description: "Thank you for helping keep PayFriend safe." });
        setReportReason("");
    } catch (error: any) {
        toast({ variant: "destructive", title: "Report Failed", description: error.message || "Could not submit report." });
    }
  };

  const handleSaveContact = () => {
    if (!scannedUpiData || !scannedUpiData.payeeAddress || validationResult?.isBlacklisted || validationResult?.isReportedPreviously) {
        toast({variant: "destructive", title: "Cannot Save", description: validationResult?.isBlacklisted || validationResult?.isReportedPreviously ? "Cannot save suspicious contact." : "Invalid contact details."});
        return;
    }
    router.push(`/send/bank?upiId=${encodeURIComponent(scannedUpiData.payeeAddress)}&name=${encodeURIComponent(scannedUpiData.payeeName || validationResult?.merchantNameFromDb || '')}&type=bank&action=add`);
  };

  const resetScanState = useCallback(() => {
    setScannedUpiData(null);
    setRawScannedText(null);
    setValidationResult(null);
    setIsProcessingScan(false);
    setShowRepeatSuggestionModal(false);
    if (activeTab === 'scan' && !streamRef.current) {
        getCameraStream();
    }
  },[activeTab, getCameraStream]);

  const getVerificationBadge = () => {
    if (!validationResult) return null;
    const baseClasses = "mt-2 text-xs flex items-center gap-1";
    if (validationResult.isBlacklisted) {
        return <Badge variant="destructive" className={cn(baseClasses)}><ShieldAlert className="h-3 w-3"/>Blacklisted: {validationResult.message}</Badge>;
    }
    if (validationResult.isReportedPreviously) {
        return <Badge variant="destructive" className={cn(baseClasses)}><Flag className="h-3 w-3"/>Previously Reported. High Risk!</Badge>;
    }
    if (validationResult.isVerifiedMerchant && validationResult.hasValidSignature) {
        return <Badge variant="default" className={cn(baseClasses, "bg-green-100 text-green-700")}><ShieldCheck className="h-3 w-3"/>Verified Merchant &amp; QR</Badge>;
    }
    if (validationResult.isVerifiedMerchant) {
        return <Badge variant="default" className={cn(baseClasses, "bg-green-100 text-green-700")}><ShieldCheck className="h-3 w-3"/>Verified Merchant</Badge>;
    }
    if (validationResult.hasValidSignature) {
        return <Badge variant="secondary" className={cn(baseClasses, "bg-blue-100 text-blue-700")}><Fingerprint className="h-3 w-3"/>Authentic QR</Badge>;
    }
    return <Badge variant="outline" className={cn(baseClasses, "text-yellow-700 border-yellow-500")}><ShieldQuestion className="h-3 w-3"/>Unverified Payee/QR</Badge>;
  };

  const openChat = () => {
    if (scannedUpiData?.isZetPayUser && scannedUpiData.payeeAddress) {
        setChatRecipient({
            id: scannedUpiData.payeeAddress,
            name: scannedUpiData.payeeName || validationResult?.merchantNameFromDb || "Payee",
        });
        setShowChatModal(true);
    } else {
        if (!isStealthSilentMode) toast({ description: "Chat is only available with other Zet Pay users." });
    }
  };

  const handleFavoriteAction = async () => {
    if (!scannedUpiData || !scannedUpiData.payeeAddress) return;
    if (validationResult?.isFavorite) { // Unfavorite
        try {
            await removeFavoriteQrApi(simpleHash(scannedUpiData.originalData));
            toast({ title: "Removed from Favorites" });
            setValidationResult(prev => prev ? { ...prev, isFavorite: false, customTagName: undefined } : null);
            fetchFavoriteQrs();
        } catch (error) {
            toast({ variant: "destructive", title: "Failed to remove favorite" });
        }
    } else { // Add to favorite
        setFavoriteTagName(scannedUpiData.payeeName || validationResult?.merchantNameFromDb || '');
        setFavoriteDefaultAmount(scannedUpiData.amount || '');
        setShowAddFavoriteDialog(true);
    }
  };

  const handleSaveFavorite = async () => {
    if (!scannedUpiData || !scannedUpiData.payeeAddress) return;
    try {
        await addFavoriteQrApi({
            qrData: scannedUpiData.originalData,
            payeeUpi: scannedUpiData.payeeAddress,
            payeeName: scannedUpiData.payeeName || validationResult?.merchantNameFromDb || 'Unnamed Favorite',
            customTagName: favoriteTagName || undefined,
            defaultAmount: favoriteDefaultAmount ? Number(favoriteDefaultAmount) : undefined,
        });
        toast({ title: "Added to Favorites" });
        setValidationResult(prev => prev ? { ...prev, isFavorite: true, customTagName: favoriteTagName || undefined } : null);
        fetchFavoriteQrs();
        setShowAddFavoriteDialog(false);
    } catch (error) {
        toast({ variant: "destructive", title: "Failed to add favorite" });
    }
  };
  
  const handlePayFromFavorite = (fav: FavoriteQr) => {
      const parsed = parseUpiUrl(fav.qrData); // Assume qrData is stored in favorite
      if (parsed.isValidUpi && parsed.payeeAddress) {
          setScannedUpiData(parsed);
          setValidationResult({ // Simulate a basic valid result for favorite
              isVerifiedMerchant: true, // Assume favorites are generally trusted
              isBlacklisted: false,
              isDuplicateRecent: false,
              merchantNameFromDb: fav.payeeName,
              upiId: fav.payeeUpi,
              isFavorite: true,
              customTagName: fav.customTagName,
              pastPaymentSuggestions: fav.defaultAmount ? [fav.defaultAmount] : [],
          });
          // Proceed to payment or show confirmation
           const amountToPay = fav.defaultAmount || (parsed.amount ? Number(parsed.amount) : undefined);
           proceedToPayment(amountToPay);
      } else {
          toast({variant: "destructive", title: "Invalid Favorite QR Data"});
      }
  }


  const scanAreaClasses = cn(
    "relative aspect-square w-full max-w-sm mx-auto sm:aspect-video sm:max-w-md md:max-w-lg bg-muted rounded-md overflow-hidden border border-border",
    isStealthMode && "sm:h-40 aspect-square !border-transparent shadow-xl"
  );

  const cameraOverlayClasses = cn(
      "absolute inset-0 border-[10vw] sm:border-[5vw] border-black/30 pointer-events-none",
      isStealthMode && "border-[2vw] sm:border-[1vw] border-primary/30"
  );
  const cameraGuidelineClasses = cn(
      "absolute top-1/2 left-1/2 w-3/5 aspect-square transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-primary opacity-75 rounded-md",
      isStealthMode && "w-4/5 border-primary/70"
  );

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <QrCodeIcon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Scan &amp; Pay / My QR</h1>
      </header>

      <main className="flex-grow p-4">
        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); resetScanState(); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="scan">Scan QR</TabsTrigger>
            <TabsTrigger value="myQR">My QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <div className="space-y-4">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>Scan UPI QR Code</CardTitle>
                    {isStealthMode && <CardDescription className="text-xs text-primary">Stealth Mode Active</CardDescription>}
                </div>
                <div className="flex items-center space-x-2">
                     <Label htmlFor="stealth-mode-toggle" className="text-xs">Stealth</Label>
                     <Switch id="stealth-mode-toggle" checked={isStealthMode} onCheckedChange={setIsStealthMode} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isProcessingScan && (
                    <div className="flex flex-col items-center justify-center p-6 space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Processing QR...</p>
                    </div>
                )}
                {validationResult && scannedUpiData?.isValidUpi && (
                    <Card className={cn("p-4", isStealthMode ? "border-primary/50 bg-background" : "border-border", validationResult.isBlacklisted || validationResult.isReportedPreviously ? "border-destructive bg-destructive/10" : validationResult.isVerifiedMerchant ? "border-green-500 bg-green-50" : "bg-muted/50")}>
                         <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-base mb-1 break-all">Pay to: {scannedUpiData.payeeName || validationResult.merchantNameFromDb || scannedUpiData.payeeAddress}</CardTitle>
                                <CardDescription className="text-xs break-all">UPI ID: {scannedUpiData.payeeAddress}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFavoriteAction}>
                                <Star className={cn("h-5 w-5", validationResult.isFavorite ? "text-yellow-500 fill-yellow-400" : "text-muted-foreground")}/>
                            </Button>
                         </div>
                         {getVerificationBadge()}
                         {validationResult.customTagName && <Badge variant="outline" className="mt-1 text-xs">Tag: {validationResult.customTagName}</Badge>}
                         {scannedUpiData.note && <p className="text-sm mt-2">Note: {scannedUpiData.note}</p>}

                         {isStealthMode && hideAmountInStealth && scannedUpiData.amount && (
                            <p className="text-xl font-bold mt-2">Amount: Hidden (Tap to Pay)</p>
                         )}
                         {!isStealthMode && scannedUpiData.amount && <p className="text-xl font-bold mt-2">Amount: ₹{scannedUpiData.amount}</p>}

                        <div className={cn("grid grid-cols-2 gap-2 mt-4", isStealthMode && "grid-cols-1")}>
                             <Button onClick={() => proceedToPayment()} className={cn("flex-1 bg-green-600 hover:bg-green-700", isStealthMode && "h-10 text-sm")} disabled={validationResult.isBlacklisted || validationResult.isReportedPreviously}>
                                <Wallet className="mr-2 h-4 w-4"/>Pay Now
                            </Button>
                            {!isStealthMode && <Button variant="outline" onClick={resetScanState} className="flex-1"><RefreshCw className="mr-2 h-4 w-4"/>Rescan</Button>}
                        </div>
                        {!isStealthMode && (
                             <div className="grid grid-cols-3 gap-2 mt-2">
                                 <Button variant="link" size="sm" className="text-xs" onClick={() => setShowReportDialog(true)} disabled={!rawScannedText}><Flag className="mr-1 h-3 w-3"/>Report</Button>
                                 <Button variant="link" size="sm" className="text-xs" onClick={openChat} disabled={!scannedUpiData?.isZetPayUser}><MessageSquare className="mr-1 h-3 w-3"/>Chat</Button>
                                 <Button variant="link" size="sm" className="text-xs" onClick={handleSaveContact} disabled={!scannedUpiData?.payeeAddress || validationResult?.isBlacklisted || validationResult?.isReportedPreviously}><UserPlus className="mr-1 h-3 w-3"/>Save</Button>
                             </div>
                        )}
                    </Card>
                )}
                 {!scannedUpiData?.isValidUpi && rawScannedText && !isProcessingScan && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Invalid QR Code</AlertTitle>
                        <AlertDescription>The scanned QR code is not a valid UPI payment code. Content: "{rawScannedText.substring(0,100)}{rawScannedText.length > 100 ? '...' : ''}"</AlertDescription>
                         <Button variant="outline" onClick={resetScanState} className="mt-3 w-full">Scan Again</Button>
                    </Alert>
                 )}

                {!validationResult && !rawScannedText && !isProcessingScan && (
                  <>
                    <div className={scanAreaClasses}>
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                      {hasCameraPermission === false && (
                         <Alert variant="destructive" className="absolute inset-2 sm:inset-4 flex flex-col items-center justify-center text-center bg-background/90">
                            <CameraOff className="h-10 w-10 mb-2" />
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>Please enable camera permissions in your browser settings to use QR scan.</AlertDescription>
                            <Button onClick={getCameraStream} className="mt-3">Retry Camera</Button>
                         </Alert>
                      )}
                      {hasCameraPermission === null && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <p className="text-muted-foreground text-sm">Initializing camera...</p>
                         </div>
                      )}
                      {hasCameraPermission === true && (
                           <div className={cameraOverlayClasses}>
                               <div className={cameraGuidelineClasses}></div>
                                {torchSupported && (
                                    <Button
                                        variant={torchOn ? "default" : "secondary"}
                                        size="icon"
                                        className={cn("absolute rounded-full pointer-events-auto z-10 shadow-lg opacity-80 hover:opacity-100", isStealthMode ? "bottom-2 right-2 h-8 w-8" : "bottom-4 right-4 h-10 w-10")}
                                        onClick={toggleTorch}
                                        aria-pressed={torchOn}
                                    >
                                        <Zap className={cn("h-5 w-5", torchOn ? "text-yellow-300 fill-yellow-300" : "", isStealthMode && "h-4 w-4")}/>
                                        <span className="sr-only">{torchOn ? 'Turn Torch Off' : 'Turn Torch On'}</span>
                                    </Button>
                                )}
                                {isStealthMode && (
                                    <div className="absolute top-2 left-2 space-x-1 pointer-events-auto z-10">
                                        <Button variant={isStealthSilentMode ? "destructive" : "secondary"} size="icon" className="h-7 w-7 rounded-full opacity-80" onClick={() => setIsStealthSilentMode(!isStealthSilentMode)}>
                                            {isStealthSilentMode ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}
                                        </Button>
                                        <Button variant={hideAmountInStealth ? "destructive" : "secondary"} size="icon" className="h-7 w-7 rounded-full opacity-80" onClick={() => setHideAmountInStealth(!hideAmountInStealth)}>
                                            {hideAmountInStealth ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                        </Button>
                                    </div>
                                )}
                           </div>
                       )}
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isProcessingUpload}>
                        {isProcessingUpload ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isProcessingUpload ? 'Processing...' : 'Upload QR from Gallery'}</Button>
                    <input id="qr-upload-input" type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="sr-only" disabled={isProcessingUpload}/>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recent Scans Section */}
            <Card className="shadow-md">
                <CardHeader><CardTitle className="text-base">Recently Scanned</CardTitle></CardHeader>
                <CardContent>
                    {isLoadingRecents && <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>}
                    {!isLoadingRecents && recentScans.length === 0 && <p className="text-xs text-muted-foreground text-center">No recent scans with payments.</p>}
                    {!isLoadingRecents && recentScans.length > 0 && (
                        <ScrollArea className="h-32">
                            <div className="space-y-2">
                                {recentScans.map(scan => (
                                    <div key={scan.qrDataHash} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => handleScannedData(scan.qrData)}>
                                        <div>
                                            <p className="text-sm font-medium truncate">{scan.payeeName || scan.payeeUpi}</p>
                                            <p className="text-xs text-muted-foreground">Paid ₹{scan.lastAmountPaid?.toFixed(2)} on {new Date(scan.lastPaidDate).toLocaleDateString()}</p>
                                        </div>
                                        <Button variant="ghost" size="xs">Pay Again</Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

             {/* Favorite QRs Section */}
            <Card className="shadow-md">
                <CardHeader><CardTitle className="text-base">Favorite Payees</CardTitle></CardHeader>
                <CardContent>
                     {isLoadingFavorites && <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>}
                     {!isLoadingFavorites && favoriteQrs.length === 0 && <p className="text-xs text-muted-foreground text-center">No favorite QRs yet. Add some after scanning!</p>}
                     {!isLoadingFavorites && favoriteQrs.length > 0 && (
                         <ScrollArea className="h-40">
                             <div className="grid grid-cols-2 gap-2">
                                {favoriteQrs.map(fav => (
                                    <Card key={fav.qrDataHash} className="p-2 text-center cursor-pointer hover:border-primary" onClick={() => handlePayFromFavorite(fav)}>
                                         <QrCodeIcon className="h-8 w-8 mx-auto mb-1 text-primary"/>
                                         <p className="text-xs font-medium truncate">{fav.customTagName || fav.payeeName}</p>
                                         <p className="text-[10px] text-muted-foreground truncate">{fav.payeeUpi}</p>
                                         {fav.defaultAmount && <Badge variant="outline" className="mt-1 text-[9px]">₹{fav.defaultAmount}</Badge>}
                                    </Card>
                                ))}
                            </div>
                         </ScrollArea>
                     )}
                </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="myQR">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Your UPI QR Code</CardTitle>
                <CardDescription>Show this to receive payments directly via UPI.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                 {isQrLoading ? (
                     <div className="flex flex-col items-center justify-center h-56">
                         <Loader2 className="h-10 w-10 animate-spin text-primary mb-4"/>
                         <p className="text-muted-foreground text-sm">Generating QR Code...</p>
                     </div>
                 ) : userQRCodeUrl ? (
                    <div className="bg-white p-4 rounded-lg border border-border">
                        <Image src={userQRCodeUrl} alt="Your UPI QR Code" width={200} height={200} data-ai-hint="user upi qr code" priority />
                    </div>
                 ) : (
                    <p className="text-muted-foreground text-center py-10">Could not generate QR code. Please ensure you have a linked account.</p>
                 )}
                 <p className="text-base font-medium">{userName}</p>
                 <p className="text-sm text-muted-foreground">{userUpiId}</p>
                 <Button variant="outline" onClick={() => alert("Share QR functionality to be implemented.")}>Share QR Code</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

       <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Report Suspicious QR Code</DialogTitle>
             <DialogDescription>
               Please provide a reason for reporting this QR code. This will help us investigate.
             </DialogDescription>
           </DialogHeader>
           <div className="py-4">
             <Label htmlFor="reportReason" className="sr-only">Reason</Label>
             <Input
               id="reportReason"
               placeholder="e.g., Fake merchant, incorrect details, scam..."
               value={reportReason}
               onChange={(e) => setReportReason(e.target.value)}
             />
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
             <Button onClick={handleConfirmReport} disabled={!reportReason.trim()}>Submit Report</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

        {chatRecipient && (
             <ZetChat
                isOpen={showChatModal}
                onClose={() => setShowChatModal(false)}
                recipientId={chatRecipient.id}
                recipientName={chatRecipient.name}
                recipientAvatar={chatRecipient.avatar}
             />
        )}

        {/* Add Favorite Dialog */}
         <Dialog open={showAddFavoriteDialog} onOpenChange={setShowAddFavoriteDialog}>
             <DialogContent>
                 <DialogHeader>
                     <DialogTitle>Add to Favorites</DialogTitle>
                      <DialogDescription>Save this QR for quick payments. You can add a custom tag and default amount.</DialogDescription>
                 </DialogHeader>
                 <div className="py-4 space-y-3">
                     <div>
                         <Label htmlFor="fav-tag">Custom Tag (Optional)</Label>
                         <Input id="fav-tag" value={favoriteTagName} onChange={e => setFavoriteTagName(e.target.value)} placeholder="e.g., Home Rent, Chaiwala"/>
                     </div>
                      <div>
                         <Label htmlFor="fav-amount">Default Amount (₹, Optional)</Label>
                         <Input id="fav-amount" type="number" value={favoriteDefaultAmount} onChange={e => setFavoriteDefaultAmount(e.target.value)} placeholder="e.g., 100"/>
                     </div>
                 </div>
                 <DialogFooter>
                     <Button variant="outline" onClick={() => setShowAddFavoriteDialog(false)}>Cancel</Button>
                     <Button onClick={handleSaveFavorite}>Save Favorite</Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>

          {/* Repeat Payment Suggestion Modal */}
         <Dialog open={showRepeatSuggestionModal} onOpenChange={setShowRepeatSuggestionModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pay Again?</DialogTitle>
                    <DialogDescription>You've paid <span className="font-semibold">{scannedUpiData?.payeeName || validationResult?.merchantNameFromDb || scannedUpiData?.payeeAddress}</span> before.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <p className="text-sm">Previous payment amounts:</p>
                    <div className="flex flex-wrap gap-2">
                        {validationResult?.pastPaymentSuggestions?.map((amt, idx) => (
                            <Button key={idx} variant="outline" onClick={() => { proceedToPayment(amt); setShowRepeatSuggestionModal(false); }}>
                                Pay ₹{amt.toFixed(2)}
                            </Button>
                        ))}
                    </div>
                    <Separator className="my-3"/>
                    <Button className="w-full" onClick={() => { proceedToPayment(scannedUpiData?.amount ? Number(scannedUpiData.amount) : undefined ); setShowRepeatSuggestionModal(false);}}>
                        Pay {scannedUpiData?.amount ? `₹${scannedUpiData.amount}` : 'Scanned Amount / New Amount'}
                    </Button>
                </div>
                 <DialogFooter>
                     <Button variant="ghost" onClick={() => setShowRepeatSuggestionModal(false)}>Close</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>


    </div>
  );
}

    