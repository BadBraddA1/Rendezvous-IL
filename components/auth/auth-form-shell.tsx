import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AuthFormShellProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthFormShell({ title, description, children, footer }: AuthFormShellProps) {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex flex-col items-center">
        <Link href="/">
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous"
            width={180}
            height={60}
            className="mb-6 h-14 w-auto"
          />
        </Link>
        <h1 className="text-subheading text-balance text-center text-foreground">{title}</h1>
        <p className="text-lead mt-2 text-center text-muted-foreground">{description}</p>
      </div>

      <Card className="border-primary/15">
        <CardHeader className="sr-only">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>

      {footer}
    </div>
  )
}
