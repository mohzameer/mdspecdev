import '@/app/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/shared/Header';
import { ThemeProvider } from '@/components/ThemeProvider';
import QueryProvider from '@/components/providers/QueryProvider';
import { StickyHeaderProvider } from '@/components/providers/StickyHeaderProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'mdspec - Open-Source Specification Management Platform',
  description:
    'A lightweight open-source specification management platform for technical teams. Create, track, and collaborate on technical specifications.',
  openGraph: {
    title: 'mdspec - Open-Source Specification Management Platform',
    description: 'A lightweight open-source specification management platform for technical teams.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'mdspec - Open-Source Specification Management Platform',
    description: 'A lightweight open-source specification management platform for technical teams.',
  },
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen overflow-x-hidden antialiased bg-white text-slate-900 dark:bg-slate-900 dark:text-white`}
      >
        <QueryProvider>
          <ThemeProvider>
            <StickyHeaderProvider>
              <Header />
              <main>{children}</main>
            </StickyHeaderProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
