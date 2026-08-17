import { SignUp } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { MainContent } from "@/components/main-content"
import { PoweredByBraddcorp } from "@/components/powered-by-braddcorp"
import { clerkAppearance } from "@/lib/clerk-appearance"

export const metadata = {
  title: "Sign Up - Rendezvous IL",
  description: "Create your Rendezvous IL account to manage registrations and access your family dashboard.",
}

export default function SignUpPage() {
  return (
    <MainContent className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
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
          <h1 className="text-center text-2xl font-bold text-balance text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
            Join Rendezvous IL to manage registrations and your family dashboard.
          </p>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-card p-6">
          <SignUp
            appearance={clerkAppearance}
            fallbackRedirectUrl="/account"
            signInUrl="/sign-in"
          />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>

        <PoweredByBraddcorp />
      </div>
    </MainContent>
  )
}
