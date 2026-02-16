import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ViewTransitions } from 'next-view-transitions';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  display: 'swap',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' }, // Ice White
    { media: '(prefers-color-scheme: dark)', color: '#1E293B' }, // Deep Blue
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable}`}
    >
      <body className="antialiased">
        <ViewTransitions>
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
        </ViewTransitions>
      </body>
    </html>
  );
}
