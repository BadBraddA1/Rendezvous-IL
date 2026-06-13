import { SignIn } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { MainContent } from "@/components/main-content"

export const metadata = {
  title: "Sign In - Rendezvous IL",
  description: "Sign in to your Rendezvous IL account to manage registrations and view your family dashboard.",
}

export default function SignInPage() {
  return (
    <MainContent className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Link href="/">
            <Image
              src="/rendezvous-logo.png"
              alt="Rendezvous"
              width={180}
              height={60}
              className="h-14 w-auto mb-6"
            />
          </Link>
          <h1 className="text-2xl font-bold text-foreground text-center">
            Welcome Back
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            Sign in to access your family dashboard and manage registrations.
          </p>
        </div>

        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border border-border bg-card",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-border bg-background hover:bg-secondary",
                formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
                footerActionLink: "text-primary hover:text-primary/90",
                formFieldInput: "border-border bg-background",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground",
              },
            }}
            fallbackRedirectUrl="/account"
            signUpUrl="/sign-up"
          />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </MainContent>
  )
}
