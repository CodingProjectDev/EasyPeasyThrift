import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { StoreProvider } from '@/components/store-provider';

export const metadata: Metadata = {
  title: 'EasyPeasy-Thrift | Secondhand. Standout. So Easy.',
  description: 'Curated one-of-one thrift and vintage fashion with honest condition notes and measurements.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><StoreProvider><Header/><main>{children}</main><Footer/></StoreProvider></body></html>;
}
