'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, QrCode as QrCodeIcon, AlertTriangle, Zap, Loader2, CameraOff, Camera, ShieldCheck, ShieldAlert, Flag, UserPlus, RefreshCw, ShieldQuestion, Wallet, Fingerprint, MessageSquare, EyeOff, Eye, VolumeX, Volume2, Check, Minus, Plus, Search, Star, Edit, Trash2, Share2 } from 'lucide-react'; // Added Share2
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
import { validateQrCodeApi, reportQrCodeApi, ApiQrValidationResult, getRecentScansApi, RecentScan } from '@/services/scan';
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
        const isZetPay = params.get('pa')?.includes('@zetpay') || params.get('pa')?.includes('@payfriend') || Math.random() > 0.5;
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

const RECENT_SCANS_KEY = 'payfriend_recent_scans_local';
const RECENT_SCANS_MAX_LOCAL = 5;
const RECENT_SCAN_COOLDOWN_MS = 15000; // 15 seconds

interface RecentScanEntry {
    qrDataHash: string;
    timestamp: number;
}

const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
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
  const [validationResult, setValidationResult] = useState<ApiQrValidationResult | null>(null);
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
      let finalUserQRCodeUrl = '';

      if (currentUser) {
        try {
          const profile = await getCurrentUserProfile();
          nameToUse = profile?.name || currentUser.displayName || "PayFriend User";
          upiIdToUse = profile?.upiId || (currentUser.uid ? `${currentUser.uid.substring(0,10)}@payfriend` : `guest@payfriend`);
        } catch (error) {
          console.error("Failed to fetch user data for QR:", error);
          if (currentUser.uid) upiIdToUse = `${currentUser.uid.substring(0,10)}@payfriend`;
        }
      }
      setUserName(nameToUse);
      setUserUpiId(upiIdToUse);
      // Ensure upiIdToUse and nameToUse are defined before encoding
      finalUserQRCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(upiIdToUse || '')}&pn=${encodeURIComponent(nameToUse || '')}&mc=0000`;
      setUserQRCodeUrl(finalUserQRCodeUrl);
      setIsQrLoading(false);
    };

    if (activeTab === 'myQR') {
      fetchUserDataForQR();
    } else {
      setIsQrLoading(false); // Ensure loading is false if not on myQR tab
    }
  }, [activeTab]);

  useEffect(() => {
      if (activeTab === 'scan' && auth.currentUser) {
          fetchRecentScans();
          fetchFavoriteQrs();
      }
  }, [activeTab]);

  const fetchRecentScans = async () => {
      if (!auth.currentUser) return;
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
      if (!auth.currentUser) return;
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
    if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.pause();
        videoRef.current.srcObject = null; // Release the stream
    }
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      for (const track of tracks) {
        if (turnOffTorchIfOn && torchOn && track.kind === 'video' && 'applyConstraints' in track && (track as any).getCapabilities?.().torch) {
            try { await (track as any).applyConstraints({ advanced: [{ torch: false }] }); } catch (e) { console.warn("Error turning off torch:", e); }
        }
        track.stop();
      }
      streamRef.current = null;
      if (turnOffTorchIfOn) setTorchOn(false);
      console.log("[Client Scan] Camera stream stopped.");
    }
  }, [torchOn]);

  const handleScannedData = useCallback(async (data: string) => {
    if (!auth.currentUser) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in to scan and pay." });
        setIsProcessingScan(false);
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
    const localRecentScans: RecentScanEntry[] = JSON.parse(localStorage.getItem(RECENT_SCANS_KEY) || '[]');
    const isLocallyRecent = localRecentScans.some(scan => scan.qrDataHash === qrHash && (Date.now() - scan.timestamp) < RECENT_SCAN_COOLDOWN_MS);
    const updatedLocalRecentScans = [{ qrDataHash: qrHash, timestamp: Date.now() }, ...localRecentScans.filter(s => s.qrDataHash !== qrHash)].slice(0, RECENT_SCANS_MAX_LOCAL);
    localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updatedLocalRecentScans));

    if (isLocallyRecent && !isStealthSilentMode && !isStealthMode) {
        toast({description: "This QR was scanned locally recently. Proceed with caution if this is unexpected.", duration: 4000});
    }

    try {
      const validation: ApiQrValidationResult = await validateQrCodeApi(data, parsedData.signature, isStealthMode);
      setValidationResult(validation);
      
      if (validation.merchantNameFromDb && parsedData.payeeName !== validation.merchantNameFromDb) {
          setScannedUpiData(prev => prev ? ({...prev, payeeName: validation.merchantNameFromDb}) : null);
      }
      
      const favMatch = favoriteQrs.find(f => f.qrDataHash === qrHash);
      if (favMatch) {
          setValidationResult(prev => prev ? { ...prev, isFavorite: true, customTagName: favMatch.customTagName } : null);
      }
      
      if (validation.pastPaymentSuggestions && validation.pastPaymentSuggestions.length > 0 && !isStealthMode) {
          setShowRepeatSuggestionModal(true);
      }

      if (!isStealthSilentMode) {
        if (validation.isBlacklisted) {
          toast({ variant: "destructive", title: "Warning: Suspicious QR", description: validation.message || "This QR code is flagged as suspicious.", duration: 7000 });
        } else if (validation.isReportedPreviously) {
          toast({ variant: "destructive", title: "Warning: Reported QR", description: "This QR code has been reported by other users. Proceed with extreme caution.", duration: 7000 });
        } else if (!validation.isVerifiedMerchant && !validation.hasValidSignature && !isLocallyRecent && !isStealthMode) {
          toast({ variant: "default", title: "Unverified Payee", description: "Payee is not a verified merchant and QR signature is missing/invalid. Proceed with caution.", duration: 7000 });
        } else if (!validation.isVerifiedMerchant && !isLocallyRecent && !isStealthMode){
          toast({ variant: "default", title: "Unverified Payee", description: "Payee is not a verified merchant. Proceed with caution.", duration: 5000 });
        } else {
          toast({ title: "QR Validated", description: "Details fetched successfully." });
        }
      }
    } catch (error: any) {
      console.error("QR Validation Error:", error);
      if (!isStealthSilentMode) toast({ variant: "destructive", title: "Validation Error", description: error.message || "Could not validate QR code." });
      setValidationResult({isBlacklisted: false, isVerifiedMerchant: false, hasValidSignature: false, isReportedPreviously: false, upiId: parsedData.payeeAddress}); 
    } finally {
      setIsProcessingScan(false);
      if(auth.currentUser) fetchRecentScans();
    }
  }, [toast, stopCameraStream, isStealthMode, isStealthSilentMode, isProcessingScan, favoriteQrs]);

  const getCameraStream = useCallback(async () => {
    setHasCameraPermission(null);
    setTorchSupported(false);
    setIsScanningActive(false);

    if (streamRef.current) await stopCameraStream(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
                videoRef.current.play().then(() => {
                    console.log("[Client Scan] Video play started.");
                    setIsScanningActive(true); 
                }).catch(e => {
                    console.error("Error playing video:", e);
                    toast({variant: "destructive", title: "Camera Play Error", description: "Could not start camera preview."});
                    setIsScanningActive(false);
                });
            }
        };
         if (videoRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) { // Use HTMLMediaElement constants
             videoRef.current.play().then(() => {
                 console.log("[Client Scan] Video play started (readyState).");
                 setIsScanningActive(true);
             }).catch(e => {
                 console.error("Error playing video (readyState):", e);
                 toast({variant: "destructive", title: "Camera Play Error", description: "Could not start camera preview on readyState."});
                 setIsScanningActive(false);
             });
         }
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
                if(!isStealthSilentMode && !isStealthMode) toast({ description: "Low light, torch auto-activated." });
            } catch(e) { console.warn("Error auto-activating torch:", e); }
        }
      }

      const scanInterval = setInterval(async () => {
        if (!auth.currentUser) {
            clearInterval(scanInterval);
            return;
        }
        if (isScanningActive && streamRef.current && !isProcessingScan && document.visibilityState === 'visible') {
            if (Math.random() < 0.03) { 
                 const mockQrData = Math.random() > 0.5
                    ? "upi://pay?pa=demomerchant@okbank&pn=Demo%20Store&am=100&tn=TestPayment&sign=MOCK_SIGNATURE_VALID"
                    : "upi://pay?pa=anotheruser@okupi&pn=Another%20User";
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
  }, [toast, stopCameraStream, handleScannedData, torchOn, isStealthMode, isStealthSilentMode, activeTab, isProcessingScan]);

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
        stopCameraStream(true); 
        if (cleanupScanInterval) cleanupScanInterval();
    };
  }, [activeTab, stopCameraStream, scannedUpiData, isProcessingScan, getCameraStream]);

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
      if (!isStealthSilentMode && !isStealthMode) toast({ description: `Torch ${newTorchState ? 'ON' : 'OFF'}` });
    } catch (err) {
      console.error('[Client Scan] Error controlling torch:', err);
      if (!isStealthSilentMode && !isStealthMode) toast({ variant: "destructive", title: "Could not control torch"});
      setTorchOn(false);
    }
  }, [torchOn, torchSupported, toast, isStealthSilentMode, isStealthMode]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!auth.currentUser) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in to upload QR." });
        if (event.target) event.target.value = '';
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockDecodedData = `upi://pay?pa=uploaded.${file.name.split('.')[0].replace(/\s+/g, '_')}@okbank&pn=Uploaded%20Merchant&am=50`;
        await handleScannedData(mockDecodedData);

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
  }, [toast, stopCameraStream, activeTab, handleScannedData, scannedUpiData, isStealthSilentMode, getCameraStream]);

  const proceedToPayment = (amountToPay?: number) => {
    if (!scannedUpiData || !scannedUpiData.isValidUpi || !scannedUpiData.payeeAddress) {
        if (!isStealthSilentMode || isStealthMode) toast({variant: "destructive", title: "Cannot Proceed", description: "Invalid payment details."});
        return;
    }
    if (validationResult?.isBlacklisted || validationResult?.isReportedPreviously) {
        if (!isStealthSilentMode || isStealthMode) toast({variant: "destructive", title: "Payment Blocked", description: "Cannot proceed with suspicious or reported QR."});
        return;
    }

    const query = new URLSearchParams();
    query.set('pa', scannedUpiData.payeeAddress);
    if (scannedUpiData.payeeName || validationResult?.merchantNameFromDb) {
        query.set('pn', validationResult?.merchantNameFromDb || scannedUpiData.payeeName!);
    }

    const finalAmount = amountToPay !== undefined ? amountToPay.toString() : scannedUpiData.amount;
    if (finalAmount && !(isStealthMode && hideAmountInStealth)) query.set('am', finalAmount);

    if (scannedUpiData.note) query.set('tn', scannedUpiData.note);
    query.set('qrData', scannedUpiData.originalData);
    if (validationResult?.scanLogId) query.set('scanLogId', validationResult.scanLogId); // Pass scanLogId
    if (isStealthMode) query.set('stealth', 'true');
    router.push(`/pay?${query.toString()}`);
  };

  const handleConfirmReport = async () => {
    if (!rawScannedText || !reportReason.trim()) {
        toast({variant: "destructive", title: "Report Error", description: "Reason for reporting is required."});
        return;
    }
    if (!auth.currentUser) {
        toast({variant: "destructive", title: "Not Authenticated", description: "Please log in to report QR."});
        return;
    }
    setShowReportDialog(false);
    try {
        await reportQrCodeApi(rawScannedText, reportReason);
        toast({ title: "QR Reported", description: "Thank you for helping keep PayFriend safe." });
        setReportReason("");
        if(validationResult && rawScannedText) {
            setValidationResult(prev => prev ? {...prev, isReportedPreviously: true} : null);
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Report Failed", description: error.message || "Could not submit report." });
    }
  };

  const handleSaveContact = () => {
    if (!scannedUpiData || !scannedUpiData.payeeAddress || !auth.currentUser) {
        toast({variant: "destructive", title: "Cannot Save", description: "Invalid contact details or not logged in."});
        return;
    }
     if (validationResult?.isBlacklisted || validationResult?.isReportedPreviously) {
        toast({variant: "destructive", title: "Cannot Save", description: "Cannot save suspicious contact."});
        return;
    }
    router.push(`/send/bank?upiId=${encodeURIComponent(scannedUpiData.payeeAddress)}&name=${encodeURIComponent(validationResult?.merchantNameFromDb || scannedUpiData.payeeName || '')}&type=bank&action=add`);
  };

  const resetScanState = useCallback(() => {
    setScannedUpiData(null);
    setRawScannedText(null);
    setValidationResult(null);
    setIsProcessingScan(false);
    setShowRepeatSuggestionModal(false);
    if (activeTab === 'scan' && !streamRef.current && hasCameraPermission !== false) {
        getCameraStream();
    }
  },[activeTab, hasCameraPermission, getCameraStream]);

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
    if (!auth.currentUser) {
        toast({variant: "destructive", title: "Login Required", description: "Please log in to chat."});
        return;
    }
    if (scannedUpiData?.isZetPayUser && scannedUpiData.payeeAddress) {
        setChatRecipient({
            id: scannedUpiData.payeeAddress,
            name: validationResult?.merchantNameFromDb || scannedUpiData.payeeName || "Payee",
        });
        setShowChatModal(true);
    } else {
        if (!isStealthSilentMode && !isStealthMode) toast({ description: "Chat is only available with other Zet Pay users." });
    }
  };

  const handleFavoriteAction = async () => {
    if (!scannedUpiData || !scannedUpiData.payeeAddress || !auth.currentUser) {
         toast({variant: "destructive", title: "Action Failed", description: "Cannot manage favorites. Ensure QR is valid and you are logged in."});
        return;
    }
    const qrHash = simpleHash(scannedUpiData.originalData);
    if (validationResult?.isFavorite) {
        try {
            await removeFavoriteQrApi(qrHash);
            toast({ title: "Removed from Favorites" });
            setValidationResult(prev => prev ? { ...prev, isFavorite: false, customTagName: undefined } : null);
            fetchFavoriteQrs();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to remove favorite", description: error.message });
        }
    } else {
        setFavoriteTagName(validationResult?.merchantNameFromDb || scannedUpiData.payeeName || '');
        setFavoriteDefaultAmount(scannedUpiData.amount || '');
        setShowAddFavoriteDialog(true);
    }
  };

  const handleSaveFavorite = async () => {
    if (!scannedUpiData || !scannedUpiData.payeeAddress || !auth.currentUser) {
        toast({variant: "destructive", title: "Save Failed", description: "Cannot save favorite. Ensure QR is valid and you are logged in."});
        return;
    }
    try {
        await addFavoriteQrApi({
            qrData: scannedUpiData.originalData,
            payeeUpi: scannedUpiData.payeeAddress,
            payeeName: validationResult?.merchantNameFromDb || scannedUpiData.payeeName || 'Unnamed Favorite',
            customTagName: favoriteTagName || undefined,
            defaultAmount: favoriteDefaultAmount ? Number(favoriteDefaultAmount) : undefined,
        });
        toast({ title: "Added to Favorites" });
        setValidationResult(prev => prev ? { ...prev, isFavorite: true, customTagName: favoriteTagName || undefined } : null);
        fetchFavoriteQrs();
        setShowAddFavoriteDialog(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to add favorite", description: error.message });
    }
  };

  const handlePayFromFavorite = (fav: FavoriteQr) => {
      if (!auth.currentUser) {
          toast({variant: "destructive", title: "Login Required"});
          return;
      }
      const parsed = parseUpiUrl(fav.qrData);
      if (parsed.isValidUpi && parsed.payeeAddress) {
          setRawScannedText(fav.qrData);
          setScannedUpiData(parsed);
          setValidationResult({
              scanLogId: undefined, // No direct scan log for paying from favorite
              isVerifiedMerchant: true, 
              isBlacklisted: false, 
              isReportedPreviously: false,
              merchantNameFromDb: fav.payeeName,
              upiId: fav.payeeUpi,
              isFavorite: true,
              customTagName: fav.customTagName,
              pastPaymentSuggestions: fav.defaultAmount ? [fav.defaultAmount] : [],
              hasValidSignature: true, 
          });
           const amountToPay = fav.defaultAmount || (parsed.amount ? Number(parsed.amount) : undefined);
           proceedToPayment(amountToPay);
      } else {
          toast({variant: "destructive", title: "Invalid Favorite QR Data"});
      }
  }

  const handleShareQrCode = async () => {
    if (!userUpiId || !userName || !userQRCodeUrl) {
        toast({ title: "QR Not Loaded", description: "Please wait for QR code to load.", variant: "destructive" });
        return;
    }

    const shareText = `Pay me using my UPI ID: ${userUpiId}\nOr scan my QR code.`;
    const shareTitle = `My Zet Pay UPI QR Code - ${userName}`;

    if (navigator.share) {
        try {
            const response = await fetch(userQRCodeUrl);
            if (!response.ok) throw new Error(`Failed to fetch QR image: ${response.statusText}`);
            const blob = await response.blob();
            const file = new File([blob], `${userName.replace(/\s+/g, '_')}_UPI_QR.png`, { type: blob.type });

            await navigator.share({
                title: shareTitle,
                text: shareText,
                files: [file],
            });
            toast({ title: "QR Code Shared", description: "Successfully opened share dialog." });
        } catch (error: any) {
            console.warn("Sharing with file failed, falling back to text/URL share:", error);
            try {
                 await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: userQRCodeUrl,
                });
                toast({ title: "QR Code Link Shared", description: "Successfully opened share dialog." });
            } catch (fallbackError: any) {
                 console.error("Error sharing QR code (text/URL fallback):", fallbackError);
                if (fallbackError.name !== 'AbortError') { 
                    toast({ title: "Share Failed", description: "Could not share QR code.", variant: "destructive" });
                }
            }
        }
    } else {
        navigator.clipboard.writeText(`My UPI ID is ${userUpiId}. You can also scan my QR: ${userQRCodeUrl}`)
            .then(() => {
                toast({ title: "UPI ID &amp; QR Link Copied!", description: "Share it with your contacts." });
            })
            .catch(() => {
                toast({ title: "Copy Failed", description: "Could not copy UPI ID to clipboard.", variant: "destructive" });
            });
    }
};


  const scanAreaClasses = cn(
    "relative aspect-square w-full max-w-sm mx-auto sm:max-w-md md:max-w-lg bg-black rounded-md overflow-hidden border-2 border-primary/30 shadow-inner",
    isStealthMode && "sm:h-40 !border-transparent shadow-xl"
  );

  const cameraOverlayClasses = cn(
      "absolute inset-0 border-[calc(50%-min(40%,120px))] sm:border-[calc(50%-min(35%,150px))] border-black/50 pointer-events-none",
      isStealthMode && "border-[2vw] sm:border-[1vw] border-primary/30"
  );
  const cameraGuidelineClasses = cn(
      "absolute top-1/2 left-1/2 w-[min(80%,240px)] aspect-square transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-primary opacity-50 rounded-md",
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
                {isProcessingScan && !validationResult && (
                    <div className="flex flex-col items-center justify-center p-6 space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Processing QR...</p>
                    </div>
                )}
                {validationResult && scannedUpiData?.isValidUpi && (
                    <Card className={cn("p-4", isStealthMode ? "border-primary/50 bg-background" : "border-border", validationResult.isBlacklisted || validationResult.isReportedPreviously ? "border-destructive bg-destructive/10" : validationResult.isVerifiedMerchant ? "border-green-500 bg-green-50" : "bg-muted/50")}>
                         <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-base mb-1 break-all">Pay to: {validationResult.merchantNameFromDb || scannedUpiData.payeeName || scannedUpiData.payeeAddress}</CardTitle>
                                <CardDescription className="text-xs break-all">UPI ID: {scannedUpiData.payeeAddress}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFavoriteAction} disabled={isProcessingScan}>
                                <Star className={cn("h-5 w-5", validationResult.isFavorite ? "text-yellow-500 fill-yellow-400" : "text-muted-foreground")}/>
                            </Button>
                         </div>
                         {getVerificationBadge()}
                         {validationResult.customTagName && <Badge variant="outline" className="mt-1 text-xs">Tag: {validationResult.customTagName}</Badge>}
                         {scannedUpiData.note && <p className="text-sm mt-2">Note: {scannedUpiData.note}</p>}

                         {isStealthMode && hideAmountInStealth && scannedUpiData.amount && (
                            <p className="text-xl font-bold mt-2">Amount: Hidden (Tap to Pay)</p>
                         )}
                         {(!isStealthMode || !hideAmountInStealth) && scannedUpiData.amount && <p className="text-xl font-bold mt-2">Amount: ₹{scannedUpiData.amount}</p>}

                        <div className={cn("grid grid-cols-2 gap-2 mt-4", isStealthMode && "grid-cols-1")}>
                             <Button onClick={() => proceedToPayment()} className={cn("flex-1 bg-green-600 hover:bg-green-700", isStealthMode && "h-10 text-sm")} disabled={validationResult.isBlacklisted || validationResult.isReportedPreviously || isProcessingScan}>
                                {isProcessingScan ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wallet className="mr-2 h-4 w-4"/>} Pay Now
                            </Button>
                            {!isStealthMode && <Button variant="outline" onClick={resetScanState} className="flex-1" disabled={isProcessingScan}><RefreshCw className="mr-2 h-4 w-4"/>Rescan</Button>}
                        </div>
                        {!isStealthMode && (
                             <div className="grid grid-cols-3 gap-2 mt-2">
                                 <Button variant="link" size="sm" className="text-xs" onClick={() => setShowReportDialog(true)} disabled={!rawScannedText || isProcessingScan}><Flag className="mr-1 h-3 w-3"/>Report</Button>
                                 <Button variant="link" size="sm" className="text-xs" onClick={openChat} disabled={!scannedUpiData?.isZetPayUser || isProcessingScan}><MessageSquare className="mr-1 h-3 w-3"/>Chat</Button>
                                 <Button variant="link" size="sm" className="text-xs" onClick={handleSaveContact} disabled={!scannedUpiData?.payeeAddress || validationResult?.isBlacklisted || validationResult?.isReportedPreviously || isProcessingScan}><UserPlus className="mr-1 h-3 w-3"/>Save</Button>
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
                                            {scan.lastAmountPaid && <p className="text-xs text-muted-foreground">Paid ₹{scan.lastAmountPaid?.toFixed(2)} on {new Date(scan.lastPaidDate).toLocaleDateString()}</p>}
                                        </div>
                                        <Button variant="ghost" size="xs">Pay Again</Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

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
                 <Button variant="outline" onClick={handleShareQrCode} disabled={isQrLoading || !userQRCodeUrl}>
                    <Share2 className="mr-2 h-4 w-4" /> Share QR / UPI ID
                 </Button>
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

         <Dialog open={showRepeatSuggestionModal} onOpenChange={setShowRepeatSuggestionModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pay Again?</DialogTitle>
                    <DialogDescription>You've paid <span className="font-semibold">{validationResult?.merchantNameFromDb || scannedUpiData?.payeeName || scannedUpiData?.payeeAddress}</span> before.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <p className="text-sm">Previous payment amounts:</p>
                    <div className="flex flex-wrap gap-2">
                        {validationResult?.pastPaymentSuggestions?.map((amt, idx) => (
                            <Button key={idx} variant="outline" onClick={() => { proceedToPayment(amt); setShowRepeatSuggestionModal(false); }}>
                                Pay ₹{amt.toFixed(2)}
                            </Button>
                        ))}
                         {(validationResult?.pastPaymentSuggestions?.length || 0) === 0 && <p className="text-xs text-muted-foreground">No specific past amounts recorded for suggestions.</p>}
                    </div>
                    <Separator className="my-3"/>
                    <Button className="w-full" onClick={() => { proceedToPayment(scannedUpiData?.amount ? Number(scannedUpiData.amount) : undefined ); setShowRepeatSuggestionModal(false);}}>
                        Pay {scannedUpiData?.amount ? `₹${scannedUpiData.amount}` : 'Scanned Amount / New Amount'}
                    </Button>
                </div>
                 <DialogFooter>
                     <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
