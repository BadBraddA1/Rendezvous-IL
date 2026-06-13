import { SignUp } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { MainContent } from "@/components/main-content"

export const metadata = {
  title: "Sign Up - Rendezvous IL",
  description: "Create your Rendezvous IL account to manage registrations and access your family dashboard.",
}

export default function SignUpPage() {
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
            Create Your Account
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            Join Rendezvous IL to manage registrations and connect with your family&apos;s history.
          </p>
        </div>

        <div className="flex justify-center">
          <SignUp
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
            signInUrl="/sign-in"
          />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </MainContent>
  )
}
