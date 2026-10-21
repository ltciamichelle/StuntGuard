import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StuntGuard — Deteksi Dini Stunting Posyandu',
  description: 'Aplikasi pencatatan tumbuh kembang balita dan deteksi dini stunting untuk kader Posyandu Indonesia.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#A72449',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="min-h-screen bg-pageBg font-sans text-slate-800 antialiased flex flex-col items-center">
        {/* Mobile-first frame container: 360px minimum width standard */}
        <div className="w-full max-w-[420px] min-h-screen flex flex-col bg-pageBg">
          {children}
        </div>
      </body>
    </html>
  );
}
