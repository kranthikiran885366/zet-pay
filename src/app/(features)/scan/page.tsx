'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Added useRouter
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, QrCode as QrCodeIcon, AlertTriangle, Zap, Loader2 } from 'lucide-react'; // Added Zap for torch, Loader2
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image'; // Import Image for QR code display
import { cn } from '@/lib/utils';

// Placeholder for QR decoding library - in real app, use jsQR, zxing-js, etc.
async function decodeQrCodeFromImage(file: File): Promise<string | null> {
  console.log("Simulating QR decode for file:", file.name);
  // Simulate successful decoding for specific filenames for demo
  if (file.name.toLowerCase().includes("valid")) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
      return "upi://pay?pa=image-scan@payfriend&pn=Scanned%20From%20Image&am=50"; // Example result
  }
  // Simulate failure
  await new Promise(resolve => setTimeout(resolve, 1500));
  return null;
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
  const router = useRouter(); // Initialize router
  const showMyQROnLoad = searchParams.get('showMyQR') === 'true';
  const [activeTab, setActiveTab] = useState(showMyQROnLoad ? 'myQR' : 'scan');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // Store the stream reference
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(isProcessingUpload);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const { toast } = useToast();

  // Mock User QR Code Data (replace with actual QR generation/fetching)
  const userQRCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=user@payfriend&pn=YourName"; // Example QR code

  // Get Camera Stream and Check Torch Support
  const getCameraStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream; // Store the stream
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check for torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'getCapabilities' in videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        // Use optional chaining for safety
        if (capabilities?.torch) {
          setTorchSupported(true);
          console.log("Torch capability supported.");
        } else {
          setTorchSupported(false);
          console.log("Torch capability not supported.");
        }
      } else {
        setTorchSupported(false);
         console.log("Torch capability check not available.");
      }

      // TODO: Start real-time QR scanning logic here
      // e.g., using jsQR on canvas context drawn from videoRef.current
      console.log("Camera stream started. Implement real-time scanning.");

    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      streamRef.current = null; // Clear stream ref on error
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to scan QR codes.',
      });
    }
  }, [toast]);

   // Function to stop the camera stream
    const stopCameraStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setTorchOn(false); // Turn off torch state if camera stops
            console.log("Camera stream stopped.");
        }
    }, []);


  useEffect(() => {
    if (activeTab === 'scan') {
      getCameraStream();
    } else {
      stopCameraStream(); // Stop camera when switching away from scan tab
    }
    // Cleanup stream on component unmount
    return () => {
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
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
      console.log(`Torch turned ${!torchOn ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('Error applying torch constraints:', err);
       toast({ variant: "destructive", title: "Could not control torch"});
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingUpload(true);
      setScannedData(null); // Clear previous scan
      console.log("Processing uploaded file:", file.name);

      try {
        const decodedData = await decodeQrCodeFromImage(file); // Use the decoding function
        if (decodedData) {
            setScannedData(decodedData);
            toast({ title: "QR Code Detected", description: "Data extracted from image." });
            // Proceed to payment confirmation page
            processScannedData(decodedData);
        } else {
            toast({ variant: "destructive", title: "No QR Code Found", description: "Could not find a QR code in the uploaded image." });
        }
      } catch(error) {
        console.error("Error processing uploaded QR:", error);
        toast({ variant: "destructive", title: "Processing Error", description: "Failed to process the image." });
      } finally {
         setIsProcessingUpload(false);
          // Reset file input value so the same file can be selected again
         event.target.value = '';
      }
    }
  };

  // Processes scanned data (from camera or upload) and navigates
  const processScannedData = (data: string) => {
      if (!data) return;

      console.log("Processing Scanned Data:", data);
      // Basic check if it looks like a UPI URL
      if (data.startsWith('upi://pay')) {
         const params = parseUpiUrl(data);
          // Construct URL parameters for the /pay page
          const query = new URLSearchParams();
          if (params.payeeAddress) query.set('pa', params.payeeAddress);
          if (params.payeeName) query.set('pn', params.payeeName);
          if (params.amount) query.set('am', params.amount);
          if (params.note) query.set('tn', params.note);

          if (params.payeeAddress) {
             router.push(`/pay?${query.toString()}`);
          } else {
              toast({ variant: "destructive", title: "Invalid QR", description: "Missing payee address in QR code." });
              setScannedData(null); // Clear invalid data
          }
      } else {
          // Handle non-UPI QR codes or show raw data if needed
          toast({ title: "QR Code Scanned", description: "Data does not appear to be a UPI payment QR. Displaying raw data." });
          setScannedData(data); // Display raw data for non-UPI codes
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
                <div className="relative aspect-video bg-muted rounded-md overflow-hidden border border-border">
                  {/* Video Feed */}
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />

                  {/* Overlay and Messages */}
                  {hasCameraPermission === false && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 text-center">
                         <AlertTriangle className="w-12 h-12 text-yellow-400 mb-2" />
                         <p className="font-semibold">Camera Access Required</p>
                         <p className="text-sm">Please grant camera permission to scan QR codes.</p>
                      </div>
                  )}
                   {hasCameraPermission === null && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                         <p>Requesting camera access...</p>
                      </div>
                   )}
                   {hasCameraPermission === true && (
                       <div className="absolute inset-0 border-[10vw] border-black/30 pointer-events-none">
                           {/* Simple square guide */}
                           <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-primary opacity-75"></div>
                           {/* Torch Button Overlay (conditionally rendered) */}
                             {torchSupported && (
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute bottom-4 right-4 rounded-full pointer-events-auto z-10"
                                    onClick={toggleTorch}
                                >
                                    <Zap className="h-5 w-5"/>
                                    <span className="sr-only">{torchOn ? 'Turn Torch Off' : 'Turn Torch On'}</span>
                                </Button>
                            )}
                       </div>
                   )}
                </div>

                {/* Simulated Scan Button (for testing without camera/library) */}
                 <Button onClick={simulateScan} className="w-full" variant="secondary">Simulate Scan (Test)</Button>

                {/* Upload Button */}
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

                {/* Display raw scanned data if not UPI (for debugging/info) */}
                {scannedData && !scannedData.startsWith('upi://pay') && (
                    <Alert variant="default">
                        <AlertTitle>Scanned Data</AlertTitle>
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
                 <div className="bg-white p-4 rounded-lg border border-border">
                    <Image
                      src={userQRCodeUrl}
                      alt="Your UPI QR Code"
                      width={200}
                      height={200}
                      data-ai-hint="user upi qr code"
                      priority // Prioritize loading user's QR
                    />
                 </div>
                <p className="text-center text-muted-foreground text-sm">
                  Show this code to receive payments via UPI.
                </p>
                {/* Add options like Download or Share if needed */}
                 <Button variant="outline">Share QR Code</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
