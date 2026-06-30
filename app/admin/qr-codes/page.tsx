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
    <div className="admin-shell">
      <div className="print:hidden">
        <AdminNav currentPage="qr-codes" admin={admin} />
      </div>
      <main id="main-content" className="admin-main print:p-0">
        <div className="admin-container print:max-w-none">
          <header className="admin-page-header print:hidden">
            <h1 className="text-section-title text-balance">Family QR Codes</h1>
            <p className="text-lead text-muted-foreground">Printable QR cards for check-in</p>
          </header>
          <QrCodesPrint />
        </div>
      </main>
    </div>
  )
}
