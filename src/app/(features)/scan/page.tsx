'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, QrCode as QrCodeIcon, AlertTriangle, Zap, Loader2, CameraOff, Camera, ShieldCheck, ShieldAlert, Flag, UserPlus, RefreshCw, ShieldQuestion, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { getCurrentUserProfile } from '@/services/user';
import { apiClient } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input'; // Added input for report reason
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Import Dialog components


// QR Code Decoding Logic (Simulation) - Keep for upload testing
async function decodeQrCodeFromImage(file: File): Promise<string | null> {
  console.log("[Client Scan] Decoding QR from file:", file.name);
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (file.name.toLowerCase().includes("valid_upi_merchant")) {
    return "upi://pay?pa=verifiedmerchant@okaxis&pn=Good%20Foods%20Store&am=150&tn=Groceries";
  } else if (file.name.toLowerCase().includes("valid_upi_unverified")) {
    return "upi://pay?pa=unverifiedperson@okicici&pn=Some%20Person&am=20";
  } else if (file.name.toLowerCase().includes("blacklisted_upi")) {
    return "upi://pay?pa=scammer@okpaytm&pn=Suspicious%20Payee&am=1000";
  } else if (file.name.toLowerCase().includes("nonupi_qr")) {
    return "This is some plain text data from a QR code.";
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
}

const parseUpiUrl = (url: string): ParsedUpiData => {
    try {
        const decodedUrl = decodeURIComponent(url);
        if (!decodedUrl.startsWith('upi://pay')) {
            return { isValidUpi: false, originalData: url };
        }
        const params = new URLSearchParams(decodedUrl.substring(decodedUrl.indexOf('?') + 1));
        return {
            payeeName: params.get('pn') || undefined,
            payeeAddress: params.get('pa') || undefined,
            amount: params.get('am') || undefined,
            note: params.get('tn') || undefined,
            isValidUpi: !!params.get('pa'),
            originalData: url,
        };
    } catch (error) {
        console.error("Failed to parse UPI URL:", error);
        return { isValidUpi: false, originalData: url };
    }
};

interface QrValidationResult {
    isVerifiedMerchant: boolean;
    isBlacklisted: boolean;
    isDuplicateRecent: boolean; // This will now be informational
    merchantNameFromDb?: string;
    message?: string;
    upiId?: string; // Added to include UPI ID in validation result
}

const RECENT_SCANS_KEY = 'payfriend_recent_scans';
const RECENT_SCANS_MAX = 5;
const RECENT_SCAN_COOLDOWN_MS = 15000; // 15 seconds cooldown for *informational* message

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
          // Assuming profile has primary UPI ID. Fallback if not.
          upiIdToUse = (profile && profile.upiId) ? profile.upiId as string : `${currentUser.uid.substring(0, 5)}@payfriend`;
        } catch (error) {
          console.error("Failed to fetch user data for QR:", error);
          if (currentUser.uid) upiIdToUse = `${currentUser.uid.substring(0, 5)}@payfriend`;
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

  const stopCameraStream = useCallback(async () => {
    setIsScanningActive(false);
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      for (const track of tracks) {
        if (torchOn && track.kind === 'video' && 'applyConstraints' in track && (track as any).getCapabilities?.().torch) {
            try { await (track as any).applyConstraints({ advanced: [{ torch: false }] }); } catch (e) { console.warn("Error turning off torch:", e); }
        }
        track.stop();
      }
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setTorchOn(false);
      console.log("[Client Scan] Camera stream stopped.");
    }
  }, [torchOn]);

  const getCameraStream = useCallback(async () => {
    setHasCameraPermission(null);
    setTorchSupported(false);
    setTorchOn(false);
    if (streamRef.current) await stopCameraStream();

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
      }
      setIsScanningActive(true);
      // Simulate QR code detection after a delay (replace with actual library)
      setTimeout(() => {
        if (isScanningActive && streamRef.current) {
             const mockData = "upi://pay?pa=simulatedlive@okaxis&pn=Live%20Scan%20Demo&am=75&tn=LiveScanTest";
             console.log("[Client Scan] Simulated Live QR detected:", mockData);
             handleScannedData(mockData);
        }
      }, 7000);

    } catch (error: any) {
      console.error('[Client Scan] Error accessing camera:', error.name, error.message);
      setHasCameraPermission(false);
      streamRef.current = null;
      toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera. Please check permissions.'});
    }
  }, [toast, stopCameraStream, isScanningActive]); // Removed handleScannedData from deps to avoid re-triggering on its own update

  useEffect(() => {
    if (activeTab === 'scan') getCameraStream();
    else stopCameraStream();
    return () => stopCameraStream();
  }, [activeTab, getCameraStream, stopCameraStream]);

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
    } catch (err) {
      console.error('[Client Scan] Error controlling torch:', err);
      toast({ variant: "destructive", title: "Could not control torch"});
      setTorchOn(false);
    }
  }, [torchOn, torchSupported, toast]);

  const handleScannedData = useCallback(async (data: string) => {
    stopCameraStream();
    setIsProcessingScan(true);
    setRawScannedText(data);

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
    const isRecentlyScanned = recentScans.some(scan => scan.qrDataHash === qrHash && (Date.now() - scan.timestamp) < RECENT_SCAN_COOLDOWN_MS);

    if (isRecentlyScanned) {
        // Informational toast, does not block flow
        // toast({ variant: "default", title: "Duplicate Scan Info", description: "This QR was scanned recently.", duration: 3000 });
    }

    const updatedRecentScans = [{ qrDataHash: qrHash, timestamp: Date.now() }, ...recentScans].slice(0, RECENT_SCANS_MAX);
    localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updatedRecentScans));

    try {
      const validation: QrValidationResult = await apiClient('/scan/validate', {
        method: 'POST',
        body: JSON.stringify({ qrData: data, userId: auth.currentUser?.uid }),
      });
      setValidationResult({...validation, isDuplicateRecent: isRecentlyScanned, upiId: parsedData.payeeAddress });
      if (validation.merchantNameFromDb && parsedData.payeeName !== validation.merchantNameFromDb) {
          setScannedUpiData(prev => prev ? ({...prev, payeeName: validation.merchantNameFromDb}) : null);
      }
      if (validation.isBlacklisted) {
        toast({ variant: "destructive", title: "Warning: Suspicious QR", description: validation.message || "This QR code is flagged as suspicious." });
      } else if (!validation.isVerifiedMerchant && !isRecentlyScanned) { // Only show unverified toast if not a recent duplicate warning
        toast({ variant: "default", title: "Unverified Payee", description: "Payee is not a verified merchant. Proceed with caution.", duration: 5000 });
      }
    } catch (error: any) {
      console.error("QR Validation Error:", error);
      toast({ variant: "destructive", title: "Validation Error", description: error.message || "Could not validate QR code." });
      setValidationResult({isBlacklisted: false, isVerifiedMerchant: false, isDuplicateRecent: isRecentlyScanned}); // Default to not blacklisted, not verified
    } finally {
      setIsProcessingScan(false);
    }
  }, [stopCameraStream, toast]); // Removed getCameraStream

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingUpload(true);
      setScannedUpiData(null);
      setValidationResult(null);
      setRawScannedText(null);
      await stopCameraStream();
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
         if (activeTab === 'scan' && !streamRef.current) getCameraStream();
      }
    }
  }, [toast, stopCameraStream, activeTab, getCameraStream, handleScannedData]);

  const proceedToPayment = () => {
    if (!scannedUpiData || !scannedUpiData.isValidUpi || !scannedUpiData.payeeAddress || validationResult?.isBlacklisted) {
        toast({variant: "destructive", title: "Cannot Proceed", description: validationResult?.isBlacklisted ? "Payment blocked for suspicious QR." : "Invalid payment details."});
        return;
    }
    const query = new URLSearchParams();
    query.set('pa', scannedUpiData.payeeAddress);
    if (scannedUpiData.payeeName) query.set('pn', scannedUpiData.payeeName);
    if (scannedUpiData.amount) query.set('am', scannedUpiData.amount);
    if (scannedUpiData.note) query.set('tn', scannedUpiData.note);
    // Add original QR data for backend verification if needed
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
        setReportReason(""); // Clear reason
        // Optionally mark this QR as reported locally to prevent repeated reports on same session
    } catch (error: any) {
        toast({ variant: "destructive", title: "Report Failed", description: error.message || "Could not submit report." });
    }
  };

  const handleSaveContact = () => {
    if (!scannedUpiData || !scannedUpiData.payeeAddress || validationResult?.isBlacklisted) {
        toast({variant: "destructive", title: "Cannot Save", description: validationResult?.isBlacklisted ? "Cannot save suspicious contact." : "Invalid contact details."});
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

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <QrCodeIcon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Scan & Pay / My QR</h1>
      </header>

      <main className="flex-grow p-4">
        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); resetScanState(); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="scan">Scan QR</TabsTrigger>
            <TabsTrigger value="myQR">My QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Scan UPI QR Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isProcessingScan && (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2"/>
                        <p className="text-muted-foreground">Validating QR Code...</p>
                    </div>
                )}

                {validationResult && scannedUpiData?.isValidUpi && (
                    <Card className={cn("p-4", validationResult.isBlacklisted ? "border-destructive bg-destructive/10" : !validationResult.isVerifiedMerchant ? "border-yellow-500 bg-yellow-50" : "border-green-500 bg-green-50")}>
                        <div className="flex items-center gap-2 mb-2">
                            {validationResult.isBlacklisted ? <ShieldAlert className="h-6 w-6 text-destructive"/> :
                             !validationResult.isVerifiedMerchant ? <ShieldQuestion className="h-6 w-6 text-yellow-600"/> :
                             <ShieldCheck className="h-6 w-6 text-green-600"/>}
                            <p className="font-semibold text-lg">
                                {validationResult.isBlacklisted ? "Suspicious QR!" :
                                 !validationResult.isVerifiedMerchant ? "Unverified Payee" : "Verified Merchant"}
                            </p>
                        </div>
                        {validationResult.message && <p className="text-sm mb-1">{validationResult.message}</p>}
                        <p className="text-base font-medium">{scannedUpiData.payeeName || validationResult.merchantNameFromDb || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{scannedUpiData.payeeAddress}</p>
                        {scannedUpiData.amount && <p className="text-xl font-bold">Amount: ₹{scannedUpiData.amount}</p>}
                        {scannedUpiData.note && <p className="text-sm">Note: {scannedUpiData.note}</p>}
                         {validationResult.isDuplicateRecent && !validationResult.isBlacklisted && (
                            <Badge variant="outline" className="mt-2 text-xs text-muted-foreground">Scanned recently</Badge>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-4">
                             <Button onClick={proceedToPayment} className="flex-1 bg-green-600 hover:bg-green-700" disabled={validationResult.isBlacklisted}>
                                <Wallet className="mr-2 h-4 w-4"/>Pay Now
                            </Button>
                            <Button variant="outline" onClick={resetScanState} className="flex-1">
                                <RefreshCw className="mr-2 h-4 w-4"/>Rescan
                            </Button>
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs">
                            <Button variant="link" size="sm" onClick={() => setShowReportDialog(true)} className="text-destructive hover:text-destructive/80 p-0 h-auto" disabled={validationResult.isBlacklisted}><Flag className="h-3 w-3 mr-1"/> Report QR</Button>
                            <Button variant="link" size="sm" onClick={handleSaveContact} disabled={validationResult.isBlacklisted} className="p-0 h-auto"><UserPlus className="h-3 w-3 mr-1"/> Save Contact</Button>
                        </div>
                    </Card>
                )}

                {rawScannedText && !scannedUpiData?.isValidUpi && !isProcessingScan && (
                    <Alert variant="default" className="mt-4">
                        <AlertTriangle className="h-4 w-4 text-yellow-500"/>
                        <AlertTitle>Scanned Data (Non-UPI/Invalid)</AlertTitle>
                        <AlertDescription className="break-all text-xs">
                           {rawScannedText}
                        </AlertDescription>
                         <Button variant="link" size="sm" onClick={resetScanState} className="mt-2 p-0 h-auto">Scan Again</Button>
                    </Alert>
                )}

                {!validationResult && !rawScannedText && !isProcessingScan && (
                  <>
                    <div className="relative aspect-video sm:aspect-auto sm:h-80 bg-muted rounded-md overflow-hidden border border-border">
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                      {hasCameraPermission === false && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 text-center">
                             <CameraOff className="w-12 h-12 text-yellow-400 mb-2" />
                             <p className="font-semibold">Camera Access Required</p>
                             <p className="text-sm">Please grant camera permission to scan QR codes.</p>
                             <Button variant="secondary" size="sm" className="mt-4" onClick={getCameraStream}>Retry Permissions</Button>
                          </div>
                      )}
                       {hasCameraPermission === null && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                             <Loader2 className="h-6 w-6 animate-spin mr-2" /> Initializing Camera...
                          </div>
                       )}
                       {hasCameraPermission === true && (
                           <div className="absolute inset-0 border-[10vw] sm:border-[5vw] border-black/30 pointer-events-none">
                               <div className="absolute top-1/2 left-1/2 w-3/5 aspect-square transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-primary opacity-75 rounded-md"></div>
                                 {torchSupported && (
                                    <Button
                                        variant={torchOn ? "default" : "secondary"}
                                        size="icon"
                                        className="absolute bottom-4 right-4 rounded-full pointer-events-auto z-10 shadow-lg opacity-80 hover:opacity-100"
                                        onClick={toggleTorch}
                                        aria-pressed={torchOn}
                                    >
                                        <Zap className={cn("h-5 w-5", torchOn ? "text-yellow-300 fill-yellow-300" : "")}/>
                                        <span className="sr-only">{torchOn ? 'Turn Torch Off' : 'Turn Torch On'}</span>
                                    </Button>
                                )}
                           </div>
                       )}
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isProcessingUpload}>
                        {isProcessingUpload ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isProcessingUpload ? 'Processing...' : 'Upload QR from Gallery'}
                    </Button>
                    <input id="qr-upload-input" type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="sr-only" disabled={isProcessingUpload}/>
                  </>
                )}
              </CardContent>
            </Card>
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

      {/* Report QR Dialog */}
       <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Report Suspicious QR Code</DialogTitle>
             <DialogDescription>
               Help us keep the platform safe. Please provide a reason for reporting this QR code.
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
             <Button variant="outline" onClick={() => {setShowReportDialog(false); setReportReason('');}}>Cancel</Button>
             <Button onClick={handleConfirmReport} disabled={!reportReason.trim()}>Submit Report</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </div>
  );
}
