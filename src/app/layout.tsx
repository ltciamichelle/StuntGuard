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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StuntGuard',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#A72449',
};

import { PwaRegister } from '@/components/PwaRegister';
import { SplashScreen } from '@/components/SplashScreen';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#A72449" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen bg-pageBg font-sans text-slate-800 antialiased flex flex-col items-center">
        <SplashScreen />
        <PwaRegister />
        {/* Root container: allows desktop dashboards (like /desa up to 1280px) and mobile frames */}
        <div className="w-full min-h-screen flex flex-col items-center bg-pageBg">
          {children}
        </div>
      </body>
    </html>
  );
}
