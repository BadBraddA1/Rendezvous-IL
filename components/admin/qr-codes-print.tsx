"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Loader2 } from "lucide-react"

type Family = {
  id: number
  family_last_name: string
  email: string
  checkin_qr_code?: string
  lodging_type?: string
}

type FamilyWithQr = Family & { qrDataUrl: string }

export function QrCodesPrint() {
  const [families, setFamilies] = useState<FamilyWithQr[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/admin/registrations")
        const data = await res.json()
        if (!Array.isArray(data)) return

        const withQr: FamilyWithQr[] = await Promise.all(
          data
            .filter((f: Family) => f.checkin_qr_code)
            .map(async (f: Family) => {
              const qrDataUrl = await QRCode.toDataURL(f.checkin_qr_code || "", {
                width: 256,
                margin: 1,
                errorCorrectionLevel: "M",
              })
              return { ...f, qrDataUrl }
            }),
        )

        if (!cancelled) setFamilies(withQr)
      } catch (error) {
        console.error("[v0] Failed to load families:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{families.length} families with QR codes</p>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />Print All
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
        {families.map((f) => (
          <Card key={f.id} className="break-inside-avoid border-2 print:shadow-none">
            <CardContent className="flex flex-col items-center p-4 text-center print:p-3">
              <h3 className="text-lg font-bold">{f.family_last_name} Family</h3>
              <p className="text-xs text-muted-foreground">{f.email}</p>
              {f.lodging_type && (
                <p className="text-xs text-muted-foreground capitalize">{f.lodging_type}</p>
              )}
              <img
                src={f.qrDataUrl || "/placeholder.svg"}
                alt={`QR code for ${f.family_last_name} family`}
                className="my-3 h-40 w-40 print:h-32 print:w-32"
              />
              <p className="font-mono text-sm tracking-widest">{f.checkin_qr_code}</p>
              <p className="mt-1 text-xs text-muted-foreground">Show at check-in</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 0.5in; }
          body { background: white !important; }
        }
      `}</style>
    </>
  )
}
