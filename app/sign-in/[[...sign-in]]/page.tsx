import { SignIn } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { MainContent } from "@/components/main-content"
import { PoweredByBraddcorp } from "@/components/powered-by-braddcorp"
import { clerkAppearance } from "@/lib/clerk-appearance"

export const metadata = {
  title: "Sign In - Rendezvous IL",
  description: "Sign in to your Rendezvous IL account to manage registrations and view your family dashboard.",
}

export default function SignInPage() {
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
            Welcome back
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
            Sign in to your family dashboard and manage registrations.
          </p>
        </div>

        <SignIn
            appearance={clerkAppearance}
            fallbackRedirectUrl="/account"
            signUpUrl="/sign-up"
          />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>

        <PoweredByBraddcorp />
      </div>
    </MainContent>
  )
}
