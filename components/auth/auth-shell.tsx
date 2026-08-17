import Image from "next/image"
import Link from "next/link"
import { MainContent } from "@/components/main-content"
import { authConfig } from "@/lib/auth-config"

/**
 * Page chrome shared by all auth screens: Ren logo, title, subtitle,
 * the form card, an alternate-action line, and Powered by BraddCorp.
 */
export function AuthShell({
  title,
  subtitle,
  altHref,
  altLabel,
  altPrompt,
  children,
}: {
  title: string
  subtitle: string
  altHref?: string
  altLabel?: string
  altPrompt?: string
  children: React.ReactNode
}) {
  return (
    <MainContent className="ba-page">
      <div className="ba-shell">
        <header className="ba-header">
          <Link href={authConfig.homeUrl}>
            <Image
              src="/rendezvous-logo.png"
              alt="Rendezvous"
              width={180}
              height={60}
              style={{ height: "3.5rem", width: "auto", margin: "0 auto" }}
            />
          </Link>
          <h1 className="ba-title">{title}</h1>
          <p className="ba-subtitle">{subtitle}</p>
        </header>

        <div className="ba-card">{children}</div>

        {altHref && altLabel ? (
          <p className="ba-hint">
            {altPrompt ? `${altPrompt} ` : null}
            <Link href={altHref} className="ba-link">
              {altLabel}
            </Link>
          </p>
        ) : null}

        <footer className="ba-footer">
          Powered by{" "}
          <a href="https://braddcorp.com" target="_blank" rel="noopener noreferrer">
            BraddCorp
          </a>
        </footer>
      </div>
    </MainContent>
  )
}
