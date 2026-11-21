import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EV Charging Monitor',
  description: 'Live status of EV chargers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
