import type React from "react"
import type { Metadata, Viewport } from "next"
import { Libre_Baskerville, Libre_Franklin, Source_Code_Pro, Dancing_Script } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { ClerkProvider } from "@clerk/nextjs"
import { ScrollToTop } from "@/components/scroll-to-top"
import { OneSignalProvider } from "@/components/onesignal-provider"
import { BackToTop } from "@/components/back-to-top"
import { Toaster } from "@/components/ui/toaster"

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
  title: "Rendezvous 2027 — Christian Homeschool Family Retreat",
  description:
    "A 5 day / 4 night Christian homeschool family retreat at Lake Williamson Christian Center, Carlinville, IL. May 3–7, 2027. Registration opens January 1, 2027.",
  generator: "v0.app",
  icons: {
    icon: "/rendezvous-logo.png",
    apple: "/rendezvous-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rendezvousil.com",
    siteName: "Rendezvous 2027",
    title: "Rendezvous 2027 — Christian Homeschool Family Retreat",
    description:
      "A 5 day / 4 night Christian homeschool family retreat at Lake Williamson Christian Center, Carlinville, IL. May 3–7, 2027. Registration opens January 1, 2027.",
    images: [
      {
        url: "/rendezvous-logo.png",
        width: 1200,
        height: 630,
        alt: "Rendezvous 2027 Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rendezvous 2027 — Christian Homeschool Family Retreat",
    description:
      "A 5 day / 4 night Christian homeschool family retreat at Lake Williamson Christian Center, Carlinville, IL. May 3–7, 2027. Registration opens January 1, 2027.",
    images: ["/rendezvous-logo.png"],
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
          <OneSignalProvider />
          {children}
          <BackToTop />
          <Toaster />
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  )
}
