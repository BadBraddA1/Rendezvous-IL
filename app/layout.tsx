import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Dancing_Script } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { ClerkProvider } from "@clerk/nextjs"
import { ScrollToTop } from "@/components/scroll-to-top"
import { OneSignalProvider } from "@/components/onesignal-provider"
import { BackToTop } from "@/components/back-to-top"

import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _dancingScript = Dancing_Script({ subsets: ["latin"], variable: "--font-handwriting" })

export const metadata: Metadata = {
  metadataBase: new URL("https://rendezvousil.com"),
  title: "Rendezvous 2027 — Christian Homeschool Family Retreat",
  description:
    "A 5 day / 4 night retreat filled with fellowship, worship, recreation, and encouragement for Christian families who educate their children at home. May 3-7, 2027 at Lake Williamson Christian Center, Carlinville, IL. Registration opens January 1, 2027.",
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
      "A 5 day / 4 night retreat filled with fellowship, worship, recreation, and encouragement for Christian families who educate their children at home. May 3-7, 2027 at Lake Williamson Christian Center, Carlinville, IL. Registration opens January 1, 2027.",
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
      "A 5 day / 4 night retreat filled with fellowship, worship, recreation, and encouragement for Christian families who educate their children at home. May 3-7, 2027 at Lake Williamson Christian Center, Carlinville, IL. Registration opens January 1, 2027.",
    images: ["/rendezvous-logo.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <ClerkProvider>
          <ScrollToTop />
          <OneSignalProvider />
          {children}
          <BackToTop />
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  )
}
