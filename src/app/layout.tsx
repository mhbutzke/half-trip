import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Half Trip - Planeje junto. Divida justo.',
  description:
    'Plataforma para planejar viagens em grupo, compartilhar roteiros e dividir despesas de forma justa.',
  applicationName: 'Half Trip',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Half Trip',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Half Trip',
    title: 'Half Trip - Planeje junto. Divida justo.',
    description:
      'Plataforma para planejar viagens em grupo, compartilhar roteiros e dividir despesas de forma justa.',
  },
  twitter: {
    card: 'summary',
    title: 'Half Trip - Planeje junto. Divida justo.',
    description:
      'Plataforma para planejar viagens em grupo, compartilhar roteiros e dividir despesas de forma justa.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1f' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
