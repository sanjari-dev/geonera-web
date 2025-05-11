import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const APP_NAME = "Geonera";
const APP_DESCRIPTION = "AI-Powered Forex Predictions for Geonera. Get real-time insights and trading signals for currency pairs like XAU/USD, BTC/USD, EUR/USD, and more.";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';


export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: ["forex prediction", "ai trading", "currency forecast", "geonera", "xau/usd", "btc/usd", "eur/usd", "gbp/usd", "usd/jpy", "trading signals", "pips target"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
    // startUpImage: [], // Can add startup images if needed
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: `${APP_NAME} - AI Forex Predictions`,
      template: `%s | ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    url: new URL(BASE_URL), // Main site URL for Open Graph
    images: [
      {
        url: "/og-image.png", // Replace with your actual OG image path
        width: 1200,
        height: 630,
        alt: "Geonera - AI Powered Forex Predictions Platform",
      },
    ],
    locale: 'en_US', // Specify locale
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: `${APP_NAME} - Real-time Forex Signals`,
      template: `%s | ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    // images: ['/twitter-image.png'], // Replace with your actual Twitter image path
    // creator: "@geoneraApp", // Optional: Twitter handle
  },
  alternates: {
    canonical: '/', // Canonical URL for the root path
    types: {
      'application/rss+xml': `${BASE_URL}/rss.xml`, // Example RSS feed
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: { // Add verification for search consoles if needed
    // google: 'your-google-site-verification-code',
    // yandex: 'your-yandex-verification-code',
    // other: {
    //   me: ['my-email@example.com', 'my-link-to-profile.com/me'],
    // },
  },
  icons: { // Define icons more explicitly
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' }, // Example SVG icon
    ],
    apple: '/apple-touch-icon.png', // Example Apple touch icon
    shortcut: '/favicon.ico', // Favicon
  },
  category: 'finance', // Add relevant category
  authors: [{ name: 'Geonera Team', url: BASE_URL }], // Add authors
  creator: 'Geonera AI Solutions', // Add creator
  publisher: 'Geonera', // Add publisher
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

