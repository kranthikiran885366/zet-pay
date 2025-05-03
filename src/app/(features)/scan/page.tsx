
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, QrCode as QrCodeIcon, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image'; // Import Image for QR code display


export default function ScanPage() {
  const searchParams = useSearchParams();
  const showMyQROnLoad = searchParams.get('showMyQR') === 'true';
  const [activeTab, setActiveTab] = useState(showMyQROnLoad ? 'myQR' : 'scan');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Mock User QR Code Data (replace with actual QR generation/fetching)
  const userQRCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=user@payfriend&pn=YourName"; // Example QR code

  useEffect(() => {
    if (activeTab === 'scan') {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          // Start scanning logic here (requires a QR scanning library)
          // For now, we'll simulate a scan after a delay
          // In a real app, integrate a library like jsQR or Zxing-js
          // const interval = setInterval(() => {
          //   // Example: attempt to scan QR from video feed
          // }, 1000);
          // return () => clearInterval(interval);

        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to scan QR codes.',
          });
        }
      };
      getCameraPermission();
    } else {
        // Stop camera stream when switching tabs
         if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
         }
    }
  }, [activeTab, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      // Process the uploaded image for QR code (requires library)
      console.log("Processing uploaded file:", file.name);
      // Simulate processing
      setTimeout(() => {
        setScannedData("upi://pay?pa=uploaded@example&pn=UploadedPayee"); // Example scanned data
        setIsProcessing(false);
        toast({ title: "QR Code Detected", description: "Extracted data from image." });
        // Navigate to payment confirmation page with scannedData
        // router.push(`/pay?data=${encodeURIComponent(scannedData)}`);
      }, 1500);
    }
  };

  const simulateScan = () => {
     setScannedData("upi://pay?pa=simulated@payfriend&pn=SimulatedPayee");
     toast({ title: "QR Code Scanned (Simulated)", description: "Navigating to payment..." });
     // router.push(`/pay?data=${encodeURIComponent(scannedData)}`);
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
                       </div>
                   )}
                </div>

                {/* Simulated Scan Button (for testing without camera/library) */}
                 <Button onClick={simulateScan} className="w-full" variant="secondary">Simulate Scan (Test)</Button>

                {/* Upload Button */}
                <Button variant="outline" className="w-full" asChild>
                  <label htmlFor="qr-upload" className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" /> Upload QR from Gallery
                    <input
                      id="qr-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="sr-only"
                      disabled={isProcessing}
                    />
                  </label>
                </Button>

                {isProcessing && <p className="text-center text-sm text-muted-foreground">Processing image...</p>}
                {scannedData && (
                    <Alert>
                        <AlertTitle>QR Data Detected</AlertTitle>
                        <AlertDescription className="break-all">
                           {scannedData}
                           <Button size="sm" className="ml-2 mt-2" onClick={() => alert('Proceeding to pay...')}>Proceed to Pay</Button>
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
