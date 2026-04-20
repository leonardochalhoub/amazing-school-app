import type { Metadata, Viewport } from "next";
import {
  Geist_Mono,
  Instrument_Serif,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/context";
import { CookieConsent } from "@/components/shared/cookie-consent";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://amazing-school-app.vercel.app";
const SITE_NAME = "Amazing School";
const DEFAULT_TITLE =
  "Amazing School — Learn English with AI · Aprenda inglês com IA";
const DEFAULT_DESCRIPTION =
  "Free, open-source English teaching platform for Brazilian students: structured CEFR lessons, AI tutor, speaking lab with pronunciation scoring, gamification, and classroom tools for teachers.";
const DEFAULT_KEYWORDS = [
  "aprender inglês",
  "curso de inglês online",
  "inglês para brasileiros",
  "professor de inglês",
  "AI English tutor",
  "learn English",
  "English teaching platform",
  "CEFR",
  "speaking practice",
  "pronunciation scoring",
  "gamified English",
  "Amazing School",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · Amazing School",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: "Amazing School" }],
  creator: "Amazing School",
  publisher: "Amazing School",
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/",
      en: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: "pt_BR",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/branding/school-logo.png",
        width: 1200,
        height: 630,
        alt: "Amazing School — English learning platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/branding/school-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  category: "education",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

// Without this, mobile browsers render at a 980px default viewport and
// zoom out to fit, which looks like "the page is too big and gets cut".
// Setting width=device-width makes the layout actually match the screen.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// JSON-LD: EducationalOrganization — anchors the site in Google's
// Knowledge Graph. Served inline in <head> so it's indexed on the
// very first crawl, no rehydration race with client scripts.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/branding/school-logo.png`,
  description: DEFAULT_DESCRIPTION,
  sameAs: [],
  areaServed: { "@type": "Country", name: "Brazil" },
  availableLanguage: ["pt-BR", "en"],
};
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: ["pt-BR", "en"],
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
      className={`${jakarta.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          // The two objects live in a single array so Google treats
          // them as a set of linked entities for the same site.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, websiteJsonLd]),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <I18nProvider>
            {children}
            <CookieConsent />
          </I18nProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" closeButton />
        {/* Vercel Analytics — page views + events. No PII, no
            cookie banner required. Scripts are only loaded in
            production so local dev stays clean. */}
        <Analytics />
        {/* Speed Insights — Core Web Vitals (LCP, INP, CLS) per
            route. Shows up under Vercel Project → Speed Insights. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
