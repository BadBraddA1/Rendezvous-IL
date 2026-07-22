import Link from "next/link"
import { IOS_APP_STORE_URL } from "@/lib/native-app-store"

export function SiteFooter() {
  return (
    <footer className="border-t border-primary/15 bg-surface-tint py-12">
      <div className="site-container">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <p className="font-display text-subheading mb-2">Stephen &amp; Ranae Bradd</p>
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
          <div className="mb-8 border-t pt-8 text-center">
            <p className="mb-2 text-sm font-medium text-foreground">Get the app</p>
            <p className="mb-3 text-sm text-muted-foreground">
              <a
                href={IOS_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded-sm font-medium text-primary hover:underline"
              >
                Download on the App Store
              </a>
              <span className="mx-2 text-muted-foreground/60" aria-hidden="true">
                ·
              </span>
              <span>Android still in the works</span>
            </p>
            <p>
              <Link
                href="/install"
                className="focus-ring rounded-sm text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                App details
              </Link>
            </p>
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
