
import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
// Potentially wrap with a VoiceCommandProvider if using context
// import { VoiceCommandProvider } from '@/context/VoiceCommandContext'; // Example

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PayFriend App',
  description: 'Your friendly payment app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {/* <VoiceCommandProvider> Example Provider wrapping */}
          {children}
          <Toaster />
        {/* </VoiceCommandProvider> */}
      </body>
    </html>
  );
}

    