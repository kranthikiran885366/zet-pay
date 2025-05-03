import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Changed from Geist to Inter
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const inter = Inter({ // Changed variable name
  variable: '--font-inter', // Changed variable name
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PayFriend App', // Changed title
  description: 'Your friendly payment app', // Changed description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}> {/* Used Inter variable */}
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
