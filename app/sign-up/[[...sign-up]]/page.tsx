import Link from "next/link"
import { MainContent } from "@/components/main-content"
import { AuthFormShell } from "@/components/auth/auth-form-shell"
import { CustomSignUpForm } from "@/components/auth/custom-sign-up-form"

export const metadata = {
  title: "Sign Up - Rendezvous IL",
  description: "Create your Rendezvous IL account to manage registrations and access your family dashboard.",
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const params = await searchParams
  const redirectUrl = params.redirect_url || "/account"

  return (
    <MainContent className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <AuthFormShell
        title="Create your account"
        description="Join Rendezvous IL to manage registrations and connect with your family's history."
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <CustomSignUpForm redirectUrl={redirectUrl} />
      </AuthFormShell>
    </MainContent>
  )
}
