import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t py-12">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xl font-bold">Stephen & Ranae Bradd</p>
            <p className="text-sm text-muted-foreground">8754 Sunset Rd,</p>
            <p className="text-sm text-muted-foreground">Clinton, IL 61727</p>
            <p className="text-sm text-muted-foreground">(217)935-5058</p>
            <a href="mailto:Stephen@Bradd.us" className="text-sm font-medium text-primary hover:underline">
              Stephen@Bradd.us
            </a>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground space-y-2">
            <p>© 2025 RendezvousIL. All rights reserved.</p>
            <p>
              <Link href="/privacy" className="hover:text-primary hover:underline">
                Privacy Policy
              </Link>
              {" | "}
              <Link href="/devlog" className="hover:text-primary hover:underline">
                Dev Log
              </Link>
            </p>
            <p>
              Powered by{" "}
              <a
                href="https://braddcorp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                BraddCorp
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
