"use client"

import Link from "next/link"
import { useClerk, useUser } from "@clerk/nextjs"
import { useEffect, useId, useRef, useState } from "react"
import { LogOut, Settings } from "lucide-react"

/**
 * Custom account menu — replaces Clerk `<UserButton>`.
 * Never ship UserButton / UserProfile: they render Clerk chrome ("Secured by clerk").
 */
export function AccountMenu({
  signOutUrl = "/sign-in",
  manageHref,
}: {
  /** Where Clerk redirects after sign-out. */
  signOutUrl?: string
  /** Optional in-app link (e.g. `/settings`). Omit to hide "Manage account". */
  manageHref?: string
}) {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!isLoaded) {
    return (
      <span
        className="ba-account-menu__skeleton"
        aria-hidden
      />
    )
  }

  if (!user) return null

  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    ""
  const name = user.fullName || email || "Account"
  const imageUrl = user.imageUrl
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div className="ba-account-menu" ref={rootRef}>
      <button
        type="button"
        className="ba-account-menu__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={36}
            height={36}
            className="ba-account-menu__avatar"
          />
        ) : (
          <span className="ba-account-menu__avatar ba-account-menu__avatar--fallback">
            {initials || "?"}
          </span>
        )}
        <span className="sr-only">Account menu</span>
      </button>

      {open ? (
        <div id={menuId} role="menu" className="ba-account-menu__panel">
          <div className="ba-account-menu__identity">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                width={40}
                height={40}
                className="ba-account-menu__avatar ba-account-menu__avatar--lg"
              />
            ) : (
              <span className="ba-account-menu__avatar ba-account-menu__avatar--lg ba-account-menu__avatar--fallback">
                {initials || "?"}
              </span>
            )}
            <div className="ba-account-menu__identity-text">
              <p className="ba-account-menu__name">{name}</p>
              {email ? <p className="ba-account-menu__email">{email}</p> : null}
            </div>
          </div>

          <div className="ba-account-menu__actions">
            {manageHref ? (
              <Link
                href={manageHref}
                role="menuitem"
                className="ba-account-menu__item"
                onClick={() => setOpen(false)}
              >
                <Settings className="ba-account-menu__icon" aria-hidden />
                Manage account
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="ba-account-menu__item"
              onClick={() => {
                setOpen(false)
                void signOut({ redirectUrl: signOutUrl })
              }}
            >
              <LogOut className="ba-account-menu__icon" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
