import type { ReactNode } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { CalculatorClient } from "./calculator-client"
import { fetchCalculatorRates } from "@/lib/calculator-rates-db"
import { isPublicCalculatorEnabled } from "@/lib/calculator-settings"

export const dynamic = "force-dynamic"

function CalculatorShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main
        id="main-content"
        className="site-container site-below-header-loose site-page-intro pb-16 md:pb-20"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

export default async function CalculatorPage() {
  const [ratesData, isEnabled] = await Promise.all([
    fetchCalculatorRates(2027),
    isPublicCalculatorEnabled(),
  ])

  return (
    <CalculatorShell>
      <CalculatorClient ratesData={ratesData} initialEnabled={isEnabled} />
    </CalculatorShell>
  )
}
