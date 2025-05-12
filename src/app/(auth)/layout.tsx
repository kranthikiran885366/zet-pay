import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PayFriend - Authentication',
  description: 'Login or Signup for PayFriend',
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
    </>
  );
}
