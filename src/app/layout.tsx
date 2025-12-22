import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bearing App',
  description: 'Secure Authentication Demo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }} suppressHydrationWarning>{children}</body>
    </html>
  );
}
