import type { Metadata } from 'next';
import './globals.css';
import portfolio from '@/data/portfolio.json';

export const metadata: Metadata = {
  title: `${portfolio.name} — ${portfolio.title}`,
  description: portfolio.summary,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-gray-200 font-sans">{children}</body>
    </html>
  );
}
