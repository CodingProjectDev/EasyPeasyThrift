import type {
  Metadata,
  Viewport,
} from 'next';

import './globals.css';

import Header from '@/components/header';
import Footer from '@/components/footer';
import StoreAssistant from '@/components/store-assistant';
import PWARegister from '@/components/pwa-register';
import { StoreProvider } from '@/components/store-provider';

export const metadata: Metadata = {
  title:
    'EasyPeasy-Thrift | Secondhand. Standout. So Easy.',

  description:
    'Curated one-of-one thrift and vintage fashion with honest condition notes and measurements.',

  manifest: '/manifest.webmanifest',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EasyPeasy',
  },

  icons: {
    icon: [
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],

    apple:
      '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#536752',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Header />

          <main>
            {children}
          </main>

          <Footer />

          <StoreAssistant />

          <PWARegister />
        </StoreProvider>
      </body>
    </html>
  );
}
