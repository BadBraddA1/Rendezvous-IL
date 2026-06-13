import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

/** Primary page landmark — pairs with the root skip link (`#main-content`). */
export function MainContent({
  className,
  ...props
}: ComponentPropsWithoutRef<"main">) {
  return <main id="main-content" className={cn(className)} {...props} />
}
