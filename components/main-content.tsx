import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

type MainContentProps = ComponentPropsWithoutRef<"main"> & {
  /** Clear the fixed SiteHeader — use on any page that renders `<SiteHeader />`. */
  belowHeader?: boolean | "loose"
}

/** Primary page landmark — pairs with the root skip link (`#main-content`). */
export function MainContent({
  className,
  belowHeader = false,
  ...props
}: MainContentProps) {
  return (
    <main
      id="main-content"
      className={cn(
        belowHeader === "loose" && "site-below-header-loose",
        belowHeader === true && "site-below-header",
        className,
      )}
      {...props}
    />
  )
}
