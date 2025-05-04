import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PayFriend Features',
  description: 'Explore PayFriend features',
};

export default function FeatureLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      {/* Could add a common footer or navigation specific to features here */}
    </>
  );
}
