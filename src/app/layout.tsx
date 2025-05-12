
import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
// Potentially wrap with a AuthProvider if using client-side context for auth state
// import { AuthProvider } from '@/context/AuthContext'; // Example

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
        {/* <AuthProvider> Example Provider wrapping */}
          {children}
          <Toaster />
        {/* </AuthProvider> */}
      </body>
    </html>
  );
}

    
