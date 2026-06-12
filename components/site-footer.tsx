import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-primary/15 bg-surface-tint py-12">
      <div className="site-container">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <p className="font-display mb-2 text-xl font-bold">Stephen &amp; Ranae Bradd</p>
            <p className="text-sm text-muted-foreground">8754 Sunset Rd</p>
            <p className="text-sm text-muted-foreground">Clinton, IL 61727</p>
            <p className="text-sm text-muted-foreground">
              <a href="tel:+12179355058" className="focus-ring rounded-sm hover:text-primary">
                (217) 935-5058
              </a>
            </p>
            <a
              href="mailto:Stephen@Bradd.us"
              className="focus-ring rounded-sm text-sm font-medium text-primary hover:underline"
            >
              Stephen@Bradd.us
            </a>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground space-y-2">
            <p>© {new Date().getFullYear()} RendezvousIL. All rights reserved.</p>
            <p>
              <Link href="/privacy" className="focus-ring rounded-sm hover:text-primary hover:underline">
                Privacy policy
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
