'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, QrCode as QrCodeIcon, AlertTriangle, Zap, Loader2, CameraOff, Camera, ShieldCheck, ShieldAlert, Flag, UserPlus, RefreshCw, ShieldQuestion, Wallet, Fingerprint, MessageSquare } from 'lucide-react'; // Added MessageSquare
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ZetChat } from '@/components/zet-chat'; // Import ZetChat

// QR Code Decoding Logic (Simulation) - Keep for upload testing
async function decodeQrCodeFromImage(file: File): Promise<string | null> {
  console.log("[Client Scan] Decoding QR from file:", file.name);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  if (file.name.toLowerCase().includes("valid_upi_merchant")) {
    return "upi://pay?pa=verifiedmerchant@okaxis&pn=Good%20Foods%20Store&am=150&tn=Groceries&sign=VALID_SIGNATURE_XYZ"; // Added mock signature
  } else if (file.name.toLowerCase().includes("valid_upi_unverified")) {
    return "upi://pay?pa=unverifiedperson@okicici&pn=Some%20Person&am=20";
  } else if (file.name.toLowerCase().includes("blacklisted_upi")) {
    return "upi://pay?pa=scammer@okpaytm&pn=Suspicious%20Payee&am=1000";
  } else if (file.name.toLowerCase().includes("nonupi_qr")) {
    return "This is some plain text data from a QR code.";
  } else if (file.name.toLowerCase().includes("reported_qr")) {
    return "upi://pay?pa=reporteduser@okaxis&pn=Previously%20Reported";
  }
  return null;
}

interface ParsedUpiData {
  payeeName?: string;
  payeeAddress?: string;
  amount?: string;
  note?: string;
  isValidUpi: boolean;
  originalData: string;
  signature?: string; 
  isZetPayUser?: boolean; // Added to simulate if payee is a ZetPay user
}

const parseUpiUrl = (url: string): ParsedUpiData => {
    try {
        const decodedUrl = decodeURIComponent(url);
        if (!decodedUrl.startsWith('upi://pay')) {
            return { isValidUpi: false, originalData: url };
        }
        const params = new URLSearchParams(decodedUrl.substring(decodedUrl.indexOf('?') + 1));
        // Simulate checking if payee is a ZetPay user
        const isZetPay = params.get('pa')?.includes('@payfriend') || Math.random() &gt; 0.5; // Example logic
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

interface QrValidationResult {
    isVerifiedMerchant: boolean;
    isBlacklisted: boolean;
    isDuplicateRecent: boolean;
    merchantNameFromDb?: string;
    message?: string;
    upiId?: string;
    hasValidSignature?: boolean; 
    isReportedPreviously?: boolean; 
}

const RECENT_SCANS_KEY = 'payfriend_recent_scans';
const RECENT_SCANS_MAX = 5;
const RECENT_SCAN_COOLDOWN_MS = 15000; // 15 seconds cooldown for same QR

interface RecentScanEntry {
    qrDataHash: string;
    timestamp: number;
}

const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i &lt; str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash &lt;&lt; 5) - hash) + char;
        hash |= 0; 
    }
    return hash.toString();
};

export default function ScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showMyQROnLoad = searchParams.get('showMyQR') === 'true';
  const [activeTab, setActiveTab] = useState(showMyQROnLoad ? 'myQR' : 'scan');
  const videoRef = useRef&lt;HTMLVideoElement&gt;(null);
  const streamRef = useRef&lt;MediaStream | null&gt;(null);
  const [hasCameraPermission, setHasCameraPermission] = useState&lt;boolean | null&gt;(null);
  const [scannedUpiData, setScannedUpiData] = useState&lt;ParsedUpiData | null&gt;(null);
  const [rawScannedText, setRawScannedText] = useState&lt;string | null&gt;(null);
  const [validationResult, setValidationResult] = useState&lt;QrValidationResult | null&gt;(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const fileInputRef = useRef&lt;HTMLInputElement&gt;(null);
  const { toast } = useToast();

  const [userName, setUserName] = useState&lt;string&gt;("Your Name");
  const [userUpiId, setUserUpiId] = useState&lt;string&gt;("defaultuser@payfriend");
  const [userQRCodeUrl, setUserQRCodeUrl] = useState&lt;string&gt;('');
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [isScanningActive, setIsScanningActive] = useState(false); 
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [ambientLight, setAmbientLight] = useState&lt;'bright' | 'dim' | 'unknown'&gt;('unknown');

  // Zet Chat states
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState&lt;{ id: string; name: string; avatar?: string } | null&gt;(null);


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
      setUserQRCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(upiIdToUse)}&pn=${encodeURIComponent(nameToUse)}`);
      setIsQrLoading(false);
    };

    if (activeTab === 'myQR') {
      fetchUserDataForQR();
    } else {
      setIsQrLoading(false); 
    }
  }, [activeTab]);


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
    await stopCameraStream(false);
    setIsProcessingScan(true);
    setRawScannedText(data);
    toast({ title: "QR Code Scanned", description: "Validating details..." });

    const parsedData = parseUpiUrl(data);
    setScannedUpiData(parsedData);

    if (!parsedData.isValidUpi || !parsedData.payeeAddress) {
        toast({ variant: "destructive", title: "Invalid QR Code", description: "This QR code is not a valid UPI payment code." });
        setValidationResult(null);
        setIsProcessingScan(false);
        return;
    }

    const qrHash = simpleHash(data);
    const recentScans: RecentScanEntry[] = JSON.parse(localStorage.getItem(RECENT_SCANS_KEY) || '[]');
    const isRecentlyScanned = recentScans.some(scan =&gt; scan.qrDataHash === qrHash && (Date.now() - scan.timestamp) &lt; RECENT_SCAN_COOLDOWN_MS);

    if (isRecentlyScanned) {
        toast({ variant: "default", title: "Duplicate Scan", description: "This QR code was scanned recently. Proceed if intended.", duration: 5000 });
    }
    const updatedRecentScans = [{ qrDataHash: qrHash, timestamp: Date.now() }, ...recentScans].slice(0, RECENT_SCANS_MAX);
    localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updatedRecentScans));


    try {
      const validation: QrValidationResult = await apiClient('/scan/validate', {
        method: 'POST',
        body: JSON.stringify({ qrData: data, userId: auth.currentUser?.uid, signature: parsedData.signature }), 
      });
      setValidationResult({...validation, isDuplicateRecent: isRecentlyScanned, upiId: parsedData.payeeAddress }); 
      if (validation.merchantNameFromDb && parsedData.payeeName !== validation.merchantNameFromDb) {
          setScannedUpiData(prev =&gt; prev ? ({...prev, payeeName: validation.merchantNameFromDb}) : null);
      }
      if (validation.isBlacklisted) {
        toast({ variant: "destructive", title: "Warning: Suspicious QR", description: validation.message || "This QR code is flagged as suspicious.", duration: 7000 });
      } else if (validation.isReportedPreviously) {
        toast({ variant: "destructive", title: "Warning: Reported QR", description: "This QR code has been reported by other users. Proceed with extreme caution.", duration: 7000 });
      } else if (!validation.isVerifiedMerchant && !isRecentlyScanned && !validation.hasValidSignature) {
        toast({ variant: "default", title: "Unverified Payee", description: "Payee is not a verified merchant and QR signature is missing/invalid. Proceed with caution.", duration: 7000 });
      } else if (!validation.isVerifiedMerchant && !isRecentlyScanned){
        toast({ variant: "default", title: "Unverified Payee", description: "Payee is not a verified merchant. Proceed with caution.", duration: 5000 });
      }
       else {
        toast({ title: "QR Validated", description: "Details fetched successfully." });
      }
    } catch (error: any) {
      console.error("QR Validation Error:", error);
      toast({ variant: "destructive", title: "Validation Error", description: error.message || "Could not validate QR code." });
      setValidationResult({isBlacklisted: false, isVerifiedMerchant: false, isDuplicateRecent: isRecentlyScanned, hasValidSignature: false, isReportedPreviously: false}); 
    } finally {
      setIsProcessingScan(false);
    }
  }, [stopCameraStream, toast]);


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
        await videoRef.current.play().catch(e =&gt; console.error("Video play error:", e));
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'getCapabilities' in videoTrack) {
        const capabilities = (videoTrack as any).getCapabilities();
        setTorchSupported(!!capabilities?.torch);
        const hour = new Date().getHours();
        if (hour &lt; 7 || hour &gt; 19) setAmbientLight('dim'); else setAmbientLight('bright');
      }
      setIsScanningActive(true); 
      
      const scanInterval = setInterval(() => {
        if (isScanningActive && streamRef.current) { 
            if (Math.random() &lt; 0.05) { 
                 const mockQrData = "upi://pay?pa=simulatedlive@okaxis&pn=Live%20Scan%20Demo&am=75&tn=LiveScanTest&sign=MOCK_SIGNATURE_LIVE";
                 console.log("[Client Scan] Simulated Live QR detected:", mockQrData);
                 handleScannedData(mockQrData); 
                 clearInterval(scanInterval); 
            }
        } else {
            clearInterval(scanInterval); 
        }
      }, 2000); 

      return () => clearInterval(scanInterval); 

    } catch (error: any) {
      console.error('[Client Scan] Error accessing camera:', error.name, error.message);
      setHasCameraPermission(false);
      streamRef.current = null; 
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera. Please check permissions.'});
    }
  }, [toast, stopCameraStream, isScanningActive, handleScannedData]); 

  useEffect(() => {
    if (activeTab === 'scan' && isScanningActive && ambientLight === 'dim' && torchSupported && !torchOn) {
      toast({ description: "Low light detected. Use the torch icon if needed.", duration: 3000 });
    }
  }, [ambientLight, activeTab, isScanningActive, torchSupported, torchOn, toast]);


  useEffect(() => {
    let cleanupScanInterval: (() =&gt; void) | undefined;
    if (activeTab === 'scan' && !scannedUpiData) { 
        getCameraStream().then(cleanup =&gt; { cleanupScanInterval = cleanup; });
    } else {
        stopCameraStream(); 
    }
    return () => {
        stopCameraStream();
        if (cleanupScanInterval) cleanupScanInterval();
    };
  }, [activeTab, getCameraStream, stopCameraStream, scannedUpiData]); 


  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported) {
      toast({ variant: "destructive", title: "Torch Not Available"});
      return;
    }
    const videoTrack = streamRef.current.getVideoTracks()[0];
    const newTorchState = !torchOn;
    try {
      await (videoTrack as any).applyConstraints({ advanced: [{ torch: newTorchState }] });
      setTorchOn(newTorchState);
      toast({ description: `Torch ${newTorchState ? 'ON' : 'OFF'}` });
    } catch (err) {
      console.error('[Client Scan] Error controlling torch:', err);
      toast({ variant: "destructive", title: "Could not control torch"});
      setTorchOn(false); 
    }
  }, [torchOn, torchSupported, toast]);


  const handleFileUpload = useCallback(async (event: React.ChangeEvent&lt;HTMLInputElement&gt;) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingUpload(true);
      setScannedUpiData(null); 
      setValidationResult(null);
      setRawScannedText(null);
      await stopCameraStream(); 
      toast({ title: "Processing Image...", description: "Attempting to decode QR code." });
      try {
        const decodedData = await decodeQrCodeFromImage(file); 
        if (decodedData) {
          await handleScannedData(decodedData); 
        } else {
          toast({ variant: "destructive", title: "No QR Code Found", description: "Could not find a QR code in the image." });
        }
      } catch(error) {
        console.error("Error processing uploaded QR:", error);
        toast({ variant: "destructive", title: "Processing Error", description: "Failed to process the image." });
      } finally {
         setIsProcessingUpload(false);
         if (event.target) event.target.value = '';
         if (activeTab === 'scan' && !streamRef.current && !scannedUpiData) getCameraStream(); 
      }
    }
  }, [toast, stopCameraStream, activeTab, getCameraStream, handleScannedData, scannedUpiData]); 

  const proceedToPayment = () => {
    if (!scannedUpiData || !scannedUpiData.isValidUpi || !scannedUpiData.payeeAddress || validationResult?.isBlacklisted || validationResult?.isReportedPreviously) {
        toast({variant: "destructive", title: "Cannot Proceed", description: validationResult?.isBlacklisted || validationResult?.isReportedPreviously ? "Payment blocked for suspicious or reported QR." : "Invalid payment details."});
        return;
    }
    const query = new URLSearchParams();
    query.set('pa', scannedUpiData.payeeAddress);
    if (scannedUpiData.payeeName) query.set('pn', scannedUpiData.payeeName);
    if (scannedUpiData.amount) query.set('am', scannedUpiData.amount);
    if (scannedUpiData.note) query.set('tn', scannedUpiData.note);
    query.set('qrData', scannedUpiData.originalData); 
    router.push(`/pay?${query.toString()}`);
  };

  const handleConfirmReport = async () => {
    if (!rawScannedText || !reportReason.trim()) {
        toast({variant: "destructive", title: "Report Error", description: "Reason for reporting is required."});
        return;
    }
    setShowReportDialog(false);
    try {
        await apiClient('/scan/report', {
            method: 'POST',
            body: JSON.stringify({ qrData: rawScannedText, userId: auth.currentUser?.uid, reason: reportReason }),
        });
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
    router.push(`/contacts/add?upiId=${encodeURIComponent(scannedUpiData.payeeAddress)}&name=${encodeURIComponent(scannedUpiData.payeeName || validationResult?.merchantNameFromDb || '')}`);
  }

  const resetScanState = () => {
    setScannedUpiData(null);
    setRawScannedText(null);
    setValidationResult(null);
    setIsProcessingScan(false); 
    if (activeTab === 'scan' && !streamRef.current) { 
        getCameraStream();
    }
  };

  const getVerificationBadge = () => {
    if (!validationResult) return null;

    if (validationResult.isBlacklisted) {
        return &lt;Badge variant="destructive" className="mt-2 text-xs flex items-center gap-1"&gt;&lt;ShieldAlert className="h-3 w-3"/&gt;Blacklisted: {validationResult.message}&lt;/Badge&gt;;
    }
    if (validationResult.isReportedPreviously) {
        return &lt;Badge variant="destructive" className="mt-2 text-xs flex items-center gap-1"&gt;&lt;Flag className="h-3 w-3"/&gt;Previously Reported. High Risk!&lt;/Badge&gt;;
    }
    if (validationResult.isVerifiedMerchant && validationResult.hasValidSignature) {
        return &lt;Badge variant="default" className="mt-2 text-xs flex items-center gap-1 bg-green-100 text-green-700"&gt;&lt;ShieldCheck className="h-3 w-3"/&gt;Verified Merchant &amp; QR&lt;/Badge&gt;;
    }
    if (validationResult.isVerifiedMerchant) {
        return &lt;Badge variant="default" className="mt-2 text-xs flex items-center gap-1 bg-green-100 text-green-700"&gt;&lt;ShieldCheck className="h-3 w-3"/&gt;Verified Merchant&lt;/Badge&gt;;
    }
    if (validationResult.hasValidSignature) {
        return &lt;Badge variant="secondary" className="mt-2 text-xs flex items-center gap-1 bg-blue-100 text-blue-700"&gt;&lt;Fingerprint className="h-3 w-3"/&gt;Authentic QR (Signature Valid)&lt;/Badge&gt;;
    }
    return &lt;Badge variant="outline" className="mt-2 text-xs flex items-center gap-1 text-yellow-700 border-yellow-500"&gt;&lt;ShieldQuestion className="h-3 w-3"/&gt;Unverified Payee/QR&lt;/Badge&gt;;
  }

  const openChat = () => {
    if (scannedUpiData?.isZetPayUser && scannedUpiData.payeeAddress) {
        setChatRecipient({
            id: scannedUpiData.payeeAddress, // Use UPI ID as recipient ID for chat
            name: scannedUpiData.payeeName || validationResult?.merchantNameFromDb || "Payee",
            // avatar: optional payee avatar from contacts or backend
        });
        setShowChatModal(true);
    } else {
        toast({ description: "Chat is only available with other Zet Pay users." });
    }
  };


  return (
    &lt;div className="min-h-screen bg-secondary flex flex-col"&gt;
      &lt;header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md"&gt;
        &lt;Link href="/" passHref&gt;
          &lt;Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80"&gt;
            &lt;ArrowLeft className="h-5 w-5" /&gt;
          &lt;/Button&gt;
        &lt;/Link&gt;
        &lt;QrCodeIcon className="h-6 w-6" /&gt;
        &lt;h1 className="text-lg font-semibold"&gt;Scan &amp; Pay / My QR&lt;/h1&gt;
      &lt;/header&gt;

      &lt;main className="flex-grow p-4"&gt;
        &lt;Tabs value={activeTab} onValueChange={(value) =&gt; { setActiveTab(value); resetScanState(); }} className="w-full"&gt;
          &lt;TabsList className="grid w-full grid-cols-2 mb-4"&gt;
            &lt;TabsTrigger value="scan"&gt;Scan QR&lt;/TabsTrigger&gt;
            &lt;TabsTrigger value="myQR"&gt;My QR Code&lt;/TabsTrigger&gt;
          &lt;/TabsList&gt;

          &lt;TabsContent value="scan"&gt;
            &lt;Card className="shadow-md"&gt;
              &lt;CardHeader&gt;
                &lt;CardTitle&gt;Scan UPI QR Code&lt;/CardTitle&gt;
              &lt;/CardHeader&gt;
              &lt;CardContent className="space-y-4"&gt;
                {isProcessingScan && (
                    &lt;div className="flex flex-col items-center justify-center p-4 text-center"&gt;
                        &lt;Loader2 className="h-8 w-8 animate-spin text-primary mb-2"/&gt;
                        &lt;p className="text-muted-foreground"&gt;Validating QR Code...&lt;/p&gt;
                    &lt;/div&gt;
                )}

                {validationResult && scannedUpiData?.isValidUpi && (
                    &lt;Card className={cn("p-4", 
                        validationResult.isBlacklisted ? "border-destructive bg-destructive/10" : 
                        validationResult.isReportedPreviously ? "border-destructive bg-destructive/10" :
                        !validationResult.isVerifiedMerchant && !validationResult.hasValidSignature ? "border-yellow-500 bg-yellow-50" : 
                        "border-green-500 bg-green-50")}&gt;
                        &lt;div className="flex items-center gap-2 mb-2"&gt;
                            {getVerificationBadge()}
                        &lt;/div&gt;
                        &lt;p className="text-base font-medium"&gt;{scannedUpiData.payeeName || validationResult.merchantNameFromDb || 'N/A'}&lt;/p&gt;
                        &lt;p className="text-sm text-muted-foreground"&gt;{scannedUpiData.payeeAddress}&lt;/p&gt;
                        {scannedUpiData.amount && &lt;p className="text-xl font-bold"&gt;Amount: ₹{scannedUpiData.amount}&lt;/p&gt;}
                        {scannedUpiData.note && &lt;p className="text-sm"&gt;Note: {scannedUpiData.note}&lt;/p&gt;}
                         {validationResult.isDuplicateRecent && !validationResult.isBlacklisted && !validationResult.isReportedPreviously && (
                            &lt;Badge variant="outline" className="mt-2 text-xs text-muted-foreground"&gt;Scanned recently&lt;/Badge&gt;
                        )}

                        &lt;div className="grid grid-cols-2 gap-2 mt-4"&gt;
                             &lt;Button onClick={proceedToPayment} className="flex-1 bg-green-600 hover:bg-green-700" disabled={validationResult.isBlacklisted || validationResult.isReportedPreviously}&gt;
                                &lt;Wallet className="mr-2 h-4 w-4"/&gt;Pay Now
                            &lt;/Button&gt;
                            &lt;Button variant="outline" onClick={resetScanState} className="flex-1"&gt;
                                &lt;RefreshCw className="mr-2 h-4 w-4"/&gt;Rescan
                            &lt;/Button&gt;
                        &lt;/div&gt;
                        &lt;div className="flex justify-between items-center mt-2 text-xs"&gt;
                            &lt;Button variant="link" size="sm" onClick={() =&gt; setShowReportDialog(true)} className="text-destructive hover:text-destructive/80 p-0 h-auto" disabled={validationResult.isBlacklisted}&gt;&lt;Flag className="h-3 w-3 mr-1"/&gt; Report QR&lt;/Button&gt;
                            {scannedUpiData.isZetPayUser && (
                                 &lt;Button variant="link" size="sm" onClick={openChat} className="p-0 h-auto"&gt;
                                     &lt;MessageSquare className="h-3 w-3 mr-1"/&gt; Chat with Payee
                                 &lt;/Button&gt;
                            )}
                            &lt;Button variant="link" size="sm" onClick={handleSaveContact} disabled={validationResult.isBlacklisted} className="p-0 h-auto"&gt;&lt;UserPlus className="h-3 w-3 mr-1"/&gt; Save Contact&lt;/Button&gt;
                        &lt;/div&gt;
                    &lt;/Card&gt;
                )}

                {rawScannedText && !scannedUpiData?.isValidUpi && !isProcessingScan && (
                    &lt;Alert variant="default" className="mt-4"&gt;
                        &lt;AlertTriangle className="h-4 w-4 text-yellow-500"/&gt;
                        &lt;AlertTitle&gt;Scanned Data (Non-UPI/Invalid)&lt;/AlertTitle&gt;
                        &lt;AlertDescription className="break-all text-xs"&gt;
                           {rawScannedText}
                        &lt;/AlertDescription&gt;
                         &lt;Button variant="link" size="sm" onClick={resetScanState} className="mt-2 p-0 h-auto"&gt;Scan Again&lt;/Button&gt;
                    &lt;/Alert&gt;
                )}

                {!validationResult && !rawScannedText && !isProcessingScan && (
                  &lt;&gt;
                    &lt;div className="relative aspect-video sm:aspect-auto sm:h-80 bg-muted rounded-md overflow-hidden border border-border"&gt;
                      &lt;video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted /&gt;
                      {hasCameraPermission === false && (
                          &lt;div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 text-center"&gt;
                             &lt;CameraOff className="w-12 h-12 text-yellow-400 mb-2" /&gt;
                             &lt;p className="font-semibold"&gt;Camera Access Required&lt;/p&gt;
                             &lt;p className="text-sm"&gt;Please grant camera permission to scan QR codes.&lt;/p&gt;
                             &lt;Button variant="secondary" size="sm" className="mt-4" onClick={getCameraStream}&gt;Retry Permissions&lt;/Button&gt;
                          &lt;/div&gt;
                      )}
                       {hasCameraPermission === null && ( 
                          &lt;div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white"&gt;
                             &lt;Loader2 className="h-6 w-6 animate-spin mr-2" /&gt; Initializing Camera...
                          &lt;/div&gt;
                       )}
                       {hasCameraPermission === true && ( 
                           &lt;div className="absolute inset-0 border-[10vw] sm:border-[5vw] border-black/30 pointer-events-none"&gt;
                               &lt;div className="absolute top-1/2 left-1/2 w-3/5 aspect-square transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-primary opacity-75 rounded-md"&gt;&lt;/div&gt;
                                 {torchSupported && (
                                    &lt;Button
                                        variant={torchOn ? "default" : "secondary"}
                                        size="icon"
                                        className="absolute bottom-4 right-4 rounded-full pointer-events-auto z-10 shadow-lg opacity-80 hover:opacity-100"
                                        onClick={toggleTorch}
                                        aria-pressed={torchOn}
                                    &gt;
                                        &lt;Zap className={cn("h-5 w-5", torchOn ? "text-yellow-300 fill-yellow-300" : "")}/&gt;
                                        &lt;span className="sr-only"&gt;{torchOn ? 'Turn Torch Off' : 'Turn Torch On'}&lt;/span&gt;
                                    &lt;/Button&gt;
                                )}
                           &lt;/div&gt;
                       )}
                    &lt;/div&gt;
                    &lt;Button variant="outline" className="w-full" onClick={() =&gt; fileInputRef.current?.click()} disabled={isProcessingUpload}&gt;
                        {isProcessingUpload ? &lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt; : &lt;Upload className="mr-2 h-4 w-4" /&gt;}
                        {isProcessingUpload ? 'Processing...' : 'Upload QR from Gallery'}&lt;/Button&gt;
                    &lt;input id="qr-upload-input" type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="sr-only" disabled={isProcessingUpload}/&gt;
                  &lt;/&gt;
                )}
              &lt;/CardContent&gt;
            &lt;/Card&gt;
          &lt;/TabsContent&gt;

          &lt;TabsContent value="myQR"&gt;
            &lt;Card className="shadow-md"&gt;
              &lt;CardHeader&gt;
                &lt;CardTitle&gt;Your UPI QR Code&lt;/CardTitle&gt;
                &lt;CardDescription&gt;Show this to receive payments directly via UPI.&lt;/CardDescription&gt;
              &lt;/CardHeader&gt;
              &lt;CardContent className="flex flex-col items-center justify-center space-y-4"&gt;
                 {isQrLoading ? (
                     &lt;div className="flex flex-col items-center justify-center h-56"&gt;
                         &lt;Loader2 className="h-10 w-10 animate-spin text-primary mb-4"/&gt;
                         &lt;p className="text-muted-foreground text-sm"&gt;Generating QR Code...&lt;/p&gt;
                     &lt;/div&gt;
                 ) : userQRCodeUrl ? (
                    &lt;div className="bg-white p-4 rounded-lg border border-border"&gt;
                        &lt;Image src={userQRCodeUrl} alt="Your UPI QR Code" width={200} height={200} data-ai-hint="user upi qr code" priority /&gt;
                    &lt;/div&gt;
                 ) : (
                    &lt;p className="text-muted-foreground text-center py-10"&gt;Could not generate QR code. Please ensure you have a linked account.&lt;/p&gt;
                 )}
                 &lt;p className="text-base font-medium"&gt;{userName}&lt;/p&gt;
                 &lt;p className="text-sm text-muted-foreground"&gt;{userUpiId}&lt;/p&gt;
                 &lt;Button variant="outline" onClick={() =&gt; alert("Share QR functionality to be implemented.")}&gt;Share QR Code&lt;/Button&gt;
              &lt;/CardContent&gt;
            &lt;/Card&gt;
          &lt;/TabsContent&gt;
        &lt;/Tabs&gt;
      &lt;/main&gt;

       &lt;Dialog open={showReportDialog} onOpenChange={setShowReportDialog}&gt;
         &lt;DialogContent&gt;
           &lt;DialogHeader&gt;
             &lt;DialogTitle&gt;Report Suspicious QR Code&lt;/DialogTitle&gt;
             &lt;DialogDescription&gt;
               Help us keep the platform safe. Please provide a reason for reporting this QR code.
             &lt;/DialogDescription&gt;
           &lt;/DialogHeader&gt;
           &lt;div className="py-4"&gt;
             &lt;Label htmlFor="reportReason" className="sr-only"&gt;Reason&lt;/Label&gt;
             &lt;Input
               id="reportReason"
               placeholder="e.g., Fake merchant, incorrect details, scam..."
               value={reportReason}
               onChange={(e) =&gt; setReportReason(e.target.value)}
             /&gt;
           &lt;/div&gt;
           &lt;DialogFooter&gt;
             &lt;Button variant="outline" onClick={() =&gt; {setShowReportDialog(false); setReportReason('');}}&gt;Cancel&lt;/Button&gt;
             &lt;Button onClick={handleConfirmReport} disabled={!reportReason.trim()}&gt;Submit Report&lt;/Button&gt;
           &lt;/DialogFooter&gt;
         &lt;/DialogContent&gt;
       &lt;/Dialog&gt;

        &lt;!-- Zet Chat Modal --&gt;
        {chatRecipient && (
             &lt;ZetChat
                isOpen={showChatModal}
                onClose={() =&gt; setShowChatModal(false)}
                recipientId={chatRecipient.id}
                recipientName={chatRecipient.name}
                recipientAvatar={chatRecipient.avatar}
             /&gt;
        )}
    &lt;/div&gt;
  );
}
