import { Inter, Montserrat } from 'next/font/google';

import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/toast/ToastContainer';
import { ThemeApplier } from '@/components/theme/ThemeApplier';

/**
 * Brand typography. `next/font/google` fetches at BUILD time and serves the files
 * from this app's own origin, so nothing is requested from a font CDN at runtime
 * — the design's `@import` from Google Fonts is a prototype convenience
 * (styling-centralisation policy §Font Delivery, digest §Translate, Don't Copy).
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Transaction file importer — PIM Capital Group',
  description:
    'Bring transaction files into the permanent record under human control.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased">
        {/*
         * Puts the person's remembered light/dark choice on the page before
         * anything else — including on sign in, which carries no switch of its own
         * but is where they land after signing out.
         */}
        <ThemeApplier />
        <ToastProvider>
          {/*
           * A plain wrapper, NOT a <main>: each route owns its own main landmark
           * (the signed-in shell puts it beside the sidebar), and nesting one main
           * inside another leaves assistive tech with two.
           */}
          <div className="min-h-screen">{children}</div>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
