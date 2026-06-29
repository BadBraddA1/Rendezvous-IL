import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type AdminStatStripProps = {
  children: ReactNode
  className?: string
}

/** Flat summary row — quieter alternative to identical metric card grids. */
export function AdminStatStrip({ children, className }: AdminStatStripProps) {
  return (
    <div className={cn("admin-stat-strip", className)} role="list">
      {children}
    </div>
  )
}

type AdminStatItemProps = {
  label: string
  value: ReactNode
  hint?: string
  className?: string
  valueClassName?: string
}

export function AdminStatItem({
  label,
  value,
  hint,
  className,
  valueClassName,
}: AdminStatItemProps) {
  return (
    <div className={cn("admin-stat-item", className)} role="listitem">
      <span className="admin-stat-label">{label}</span>
      <span className={cn("admin-stat-value", valueClassName)}>{value}</span>
      {hint ? <span className="admin-stat-hint">{hint}</span> : null}
    </div>
  )
}
