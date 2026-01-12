import type { Metadata } from 'next';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

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
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }} suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
