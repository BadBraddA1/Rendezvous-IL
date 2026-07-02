"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  helperText?: string
}

export function SignatureField({
  id,
  label,
  value,
  onChange,
  required,
  helperText = "Type your full legal name to sign electronically",
}: Props) {
  const helperId = `${id}-helper`

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>

      <div
        className={cn(
          "signature-pad relative rounded-lg border border-primary/20 bg-surface-highlight/80",
          "px-4 pb-3 pt-4 shadow-sm",
          "focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-ring/30",
        )}
      >
        <span
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-[calc(50%+0.35rem)] font-display text-xl text-muted-foreground/50 select-none"
          aria-hidden="true"
        >
          ✕
        </span>

        <input
          id={id}
          type="text"
          autoComplete="name"
          spellCheck={false}
          required={required}
          aria-describedby={helperId}
          placeholder="Sign here"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "signature-pad-input w-full min-h-14 border-0 bg-transparent pl-8 pr-2",
            "font-handwriting text-[clamp(1.75rem,1.35rem+1.5vw,2.35rem)] leading-none text-primary",
            "placeholder:text-muted-foreground/35 placeholder:font-sans placeholder:text-base placeholder:italic",
            "focus:outline-none focus-visible:outline-none",
          )}
        />

        <div
          className="mx-1 mt-1 border-b-2 border-foreground/25"
          aria-hidden="true"
        />
      </div>

      <p id={helperId} className="text-xs text-muted-foreground">
        {helperText}
      </p>
    </div>
  )
}
