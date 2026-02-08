import '@/app/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/shared/Header';
import { ThemeProvider } from '@/components/ThemeProvider';
import QueryProvider from '@/components/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'mdspec - Specification Governance Platform',
  description:
    'A lightweight specification governance platform for technical teams. Create, track, and collaborate on technical specifications.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen antialiased bg-white text-slate-900 dark:bg-slate-900 dark:text-white`}
      >
        <QueryProvider>
          <ThemeProvider>
            <Header />
            <main>{children}</main>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
