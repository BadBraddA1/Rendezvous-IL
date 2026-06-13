import { AdminNav } from "@/components/admin/admin-nav"
import { QrCodesPrint } from "@/components/admin/qr-codes-print"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function QrCodesPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/qr-codes")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden">
        <AdminNav currentPage="qr-codes" admin={admin} />
      </div>
      <main id="main-content" className="flex-1 bg-background p-6 print:p-0">
        <div className="container mx-auto space-y-6 print:max-w-none">
          <div className="print:hidden">
            <h2 className="text-3xl font-bold tracking-tight">Family QR Codes</h2>
            <p className="text-muted-foreground">Printable QR cards for check-in</p>
          </div>
          <QrCodesPrint />
        </div>
      </main>
    </div>
  )
}
