'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, QrCode as QrCodeIcon, AlertTriangle, Zap, Loader2, CameraOff } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase'; // Import auth
import { getCurrentUserProfile } from '@/services/user'; // To get user's name for QR

// Placeholder for QR decoding library - in real app, use jsQR, zxing-js, etc.
// Simulating jsQR-like behavior
interface QrCodeResult {
  data: string;
  // Other properties like location might be available
}

async function decodeQrCodeFromImage(file: File): Promise<string | null> {
  console.log("[Client Scan] Simulating QR decode for file:", file.name);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        // Simulate some delay for processing
        setTimeout(() => {
          if (file.name.toLowerCase().includes("valid_upi")) {
            resolve("upi://pay?pa=image-scan@payfriend&pn=Scanned%20From%20Image&am=50&tn=ImageUploadTest");
          } else if (file.name.toLowerCase().includes("nonupi_qr")) {
            resolve("This is some plain text data from a QR code.");
          } else if (file.name.toLowerCase().includes("invalid_upi")) {
            resolve("upi://pay?pn=InvalidQR"); // Missing 'pa'
          } else {
            resolve(null); // Simulate no QR found or error
          }
        }, 1000);
      };
      img.onerror = () => resolve(null); // Error loading image
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null); // Error reading file
    reader.readAsDataURL(file);
  });
}

// Helper to parse UPI URL (from pay page)
const parseUpiUrl = (url: string): { payeeName?: string; payeeAddress?: string; amount?: string, note?: string } => {
    try {
        const decodedUrl = decodeURIComponent(url);
        const params = new URLSearchParams(decodedUrl.substring(decodedUrl.indexOf('?') + 1));
        return {
            payeeName: params.get('pn') || undefined,
            payeeAddress: params.get('pa') || undefined,
            amount: params.get('am') || undefined,
            note: params.get('tn') || undefined,
        };
    } catch (error) {
        console.error("Failed to parse UPI URL:", error);
        return {};
    }
};


export default function ScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showMyQROnLoad = searchParams.get('showMyQR') === 'true';
  const [activeTab, setActiveTab] = useState(showMyQROnLoad ? 'myQR' : 'scan');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const { toast } = useToast();

  const [userName, setUserName] = useState<string>("Your Name"); // Default name
  const [userUpiId, setUserUpiId] = useState<string>("user@payfriend"); // Default UPI ID
  const [userQRCodeUrl, setUserQRCodeUrl] = useState<string>('');

  // Fetch user details for "My QR"
  useEffect(() => {
    const fetchUserDataForQR = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const profile = await getCurrentUserProfile(); // Assuming this fetches primary UPI ID or relevant details
          const name = profile?.name || currentUser.displayName || "PayFriend User";
          // Assuming profile or a dedicated service provides the primary UPI ID for QR
          const upiId = profile?.defaultPaymentMethod?.startsWith('upi:') ? profile.defaultPaymentMethod.split(':')[1] : (profile as any)?.upiId || `${currentUser.uid.substring(0,5)}@payfriend`;

          setUserName(name);
          setUserUpiId(upiId);
          setUserQRCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}`);
        } catch (error) {
          console.error("Failed to fetch user data for QR:", error);
          // Use default/fallback if fetch fails
          setUserQRCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(userUpiId)}&pn=${encodeURIComponent(userName)}`);
        }
      } else {
         // Fallback if no user is logged in (though ideally this page is protected)
         setUserQRCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(userUpiId)}&pn=${encodeURIComponent(userName)}`);
      }
    };

    if (activeTab === 'myQR') {
      fetchUserDataForQR();
    }
  }, [activeTab]); // Refetch if tab changes to myQR and user might have logged in


  // Get Camera Stream and Check Torch Support
  const getCameraStream = useCallback(async () => {
    setHasCameraPermission(null);
    setTorchSupported(false);
    setTorchOn(false);
    if (streamRef.current) { // Stop existing stream before starting new one
        stopCameraStream();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(playError => console.error("Video play error:", playError));
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'getCapabilities' in videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        if (capabilities?.torch) {
          setTorchSupported(true);
          videoTrack.applyConstraints({ advanced: [{ torch: false }] }).catch(e => console.warn("Could not ensure torch is off initially:", e));
        } else {
          setTorchSupported(false);
        }
      } else {
        setTorchSupported(false);
      }

      // SIMULATE real-time QR scanning logic here
      // In a real app, you'd use a library like jsQR on a canvas.
      // For demo, we'll use a timeout to simulate a scan.
      const scanInterval = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          // Simulate a scan after a few seconds for demonstration
          if (Math.random() < 0.1) { // Simulate finding a QR code 10% of the time
            const simulatedData = "upi://pay?pa=camera-scan@payfriend&pn=LiveScanPayee&am=25&tn=CameraTest";
            console.log("[Client Scan] Simulated QR code detected from camera stream:", simulatedData);
            processScannedData(simulatedData);
            // In a real app, you'd stop the interval/scanning here once a QR is found.
            // For continuous demo, we'll let it keep "scanning".
          }
        }
      }, 3000); // Check every 3 seconds

      // Store interval ID to clear it on cleanup
      (streamRef.current as any).scanIntervalId = scanInterval;


    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      streamRef.current = null;
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to scan QR codes.',
      });
    }
  }, [toast]); // Removed stopCameraStream from dependency array to avoid re-running getCameraStream when torchOn changes

   // Function to stop the camera stream
    const stopCameraStream = useCallback(() => {
        if (streamRef.current) {
             const tracks = streamRef.current.getTracks();
             console.log(`[Client Scan] Stopping ${tracks.length} camera tracks.`);
             tracks.forEach(track => {
                 if (torchOn && track.kind === 'video' && 'applyConstraints' in track) {
                    track.applyConstraints({ advanced: [{ torch: false }] }).catch(e => console.warn("Error turning off torch before stopping track:", e));
                 }
                 track.stop();
             });
             // Clear scan interval if it exists
             if ((streamRef.current as any).scanIntervalId) {
                clearInterval((streamRef.current as any).scanIntervalId);
                (streamRef.current as any).scanIntervalId = null;
             }
            streamRef.current = null;
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setTorchOn(false);
            console.log("[Client Scan] Camera stream stopped.");
        } else {
            // console.log("[Client Scan] No active camera stream to stop.");
        }
    }, [torchOn]);


  useEffect(() => {
    if (activeTab === 'scan') {
        getCameraStream();
    } else {
        stopCameraStream();
    }
    return () => { // Cleanup on component unmount
        stopCameraStream();
    };
  }, [activeTab, getCameraStream, stopCameraStream]);

  // Function to toggle torch
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) {
        toast({ variant: "destructive", title: "Torch Not Available"});
        return;
    };

    const videoTrack = streamRef.current.getVideoTracks()[0];
    const newTorchState = !torchOn;
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: newTorchState }],
      });
      setTorchOn(newTorchState);
      console.log(`[Client Scan] Torch turned ${newTorchState ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('[Client Scan] Error applying torch constraints:', err);
       toast({ variant: "destructive", title: "Could not control torch"});
        setTorchOn(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingUpload(true);
      setScannedData(null);
      console.log("[Client Scan] Processing uploaded file:", file.name);

      try {
        const decodedData = await decodeQrCodeFromImage(file);
        if (decodedData) {
            processScannedData(decodedData);
        } else {
            toast({ variant: "destructive", title: "No QR Code Found", description: "Could not find a valid QR code in the uploaded image." });
        }
      } catch(error) {
        console.error("[Client Scan] Error processing uploaded QR:", error);
        toast({ variant: "destructive", title: "Processing Error", description: "Failed to process the image." });
      } finally {
         setIsProcessingUpload(false);
         if (event.target) event.target.value = '';
      }
    }
  };

  // Processes scanned data (from camera or upload) and navigates
  const processScannedData = (data: string) => {
      if (!data) return;

      console.log("[Client Scan] Processing Scanned Data:", data);
      setScannedData(data);

      if (data.startsWith('upi://pay')) {
         const params = parseUpiUrl(data);
          const query = new URLSearchParams();
          if (params.payeeAddress) query.set('pa', params.payeeAddress);
          if (params.payeeName) query.set('pn', params.payeeName);
          if (params.amount) query.set('am', params.amount);
          if (params.note) query.set('tn', params.note);

          if (params.payeeAddress) {
             toast({ title: "UPI QR Detected", description: "Redirecting to payment..." });
             stopCameraStream();
             router.push(`/pay?${query.toString()}`);
          } else {
              toast({ variant: "destructive", title: "Invalid UPI QR", description: "Missing payee address in QR code." });
              setScannedData(null);
          }
      } else {
          toast({ title: "QR Code Scanned", description: "Data does not appear to be a UPI payment QR. Displaying raw data below." });
      }
  }

  // Simulate Scan (e.g., from camera feed)
  const simulateScan = () => {
     const simulatedUPI = "upi://pay?pa=simulated@payfriend&pn=SimulatedPayee&am=101.50&tn=Testing";
     toast({ title: "QR Code Scanned (Simulated)", description: "Navigating to payment..." });
     processScannedData(simulatedUPI);
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <QrCodeIcon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Scan & Pay / My QR</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="scan">Scan QR</TabsTrigger>
            <TabsTrigger value="myQR">My QR Code</TabsTrigger>
          </TabsList>

          {/* Scan QR Tab */}
          <TabsContent value="scan">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Scan QR Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-square sm:aspect-video bg-muted rounded-md overflow-hidden border border-border">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay/>

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
                         <Loader2 className="h-6 w-6 animate-spin mr-2" />
                         <p>Requesting camera access...</p>
                      </div>
                   )}
                   {hasCameraPermission === true && (
                       <div className="absolute inset-0 border-[10vw] sm:border-[5vw] border-black/30 pointer-events-none">
                           <div className="absolute top-1/2 left-1/2 w-3/5 aspect-square transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-primary opacity-75 rounded-md"></div>
                             {torchSupported && (
                                <Button
                                    variant={torchOn ? "default" : "secondary"}
                                    size="icon"
                                    className="absolute bottom-4 right-4 rounded-full pointer-events-auto z-10 shadow-lg"
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

                 <Button onClick={simulateScan} className="w-full" variant="secondary">Simulate Scan (Test)</Button>

                <Button variant="outline" className="w-full" asChild>
                  <label htmlFor="qr-upload" className="cursor-pointer">
                    {isProcessingUpload ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isProcessingUpload ? 'Processing Image...' : 'Upload QR from Gallery'}
                    <input
                      id="qr-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="sr-only"
                      disabled={isProcessingUpload}
                    />
                  </label>
                </Button>

                {scannedData && !scannedData.startsWith('upi://pay') && (
                    <Alert variant="default" className="mt-4">
                        <AlertTitle>Scanned Data (Non-UPI)</AlertTitle>
                        <AlertDescription className="break-all text-xs">
                           {scannedData}
                        </AlertDescription>
                    </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My QR Code Tab */}
          <TabsContent value="myQR">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Your UPI QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                 {userQRCodeUrl ? (
                    <div className="bg-white p-4 rounded-lg border border-border">
                        <Image
                        src={userQRCodeUrl}
                        alt="Your UPI QR Code"
                        width={200}
                        height={200}
                        data-ai-hint="user upi qr code"
                        priority
                        />
                    </div>
                 ) : (
                    <Loader2 className="h-10 w-10 animate-spin text-primary my-10"/>
                 )}
                 <p className="text-sm font-medium">{userName}</p>
                 <p className="text-sm text-muted-foreground">{userUpiId}</p>
                <p className="text-center text-muted-foreground text-sm">
                  Show this code to receive payments via UPI.
                </p>
                 <Button variant="outline">Share QR Code</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
