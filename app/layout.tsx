import type React from "react"
import type { Metadata, Viewport } from "next"
import { Libre_Baskerville, Libre_Franklin, Source_Code_Pro, Dancing_Script } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { ClerkProvider } from "@clerk/nextjs"
import { ScrollToTop } from "@/components/scroll-to-top"
import { BackToTop } from "@/components/back-to-top"
import { PageTourRoot } from "@/components/dev/page-tour-root"
import { Toaster } from "@/components/ui/toaster"
import { UserActivityPing } from "@/components/user-activity-ping"

import { siteDescription, siteTitle } from "@/lib/site-metadata"

import "./globals.css"

const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-franklin",
  display: "swap",
})

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-baskerville",
  display: "swap",
})

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono-src",
  display: "swap",
})

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  metadataBase: new URL("https://rendezvousil.com"),
  title: siteTitle,
  description: siteDescription,
  generator: "Next.js",
  icons: {
    icon: "/rendezvous-logo.png",
    apple: "/rendezvous-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rendezvousil.com",
    siteName: "Rendezvous 2027",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${libreFranklin.variable} ${libreBaskerville.variable} ${sourceCodePro.variable} ${dancingScript.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ClerkProvider>
          <ScrollToTop />
          <UserActivityPing />
          {children}
          <BackToTop />
          <PageTourRoot />
          <Toaster />
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  )
}
