import Link from "next/link"
import { MainContent } from "@/components/main-content"
import { AuthFormShell } from "@/components/auth/auth-form-shell"
import { CustomSignInForm } from "@/components/auth/custom-sign-in-form"

export const metadata = {
  title: "Sign In - Rendezvous IL",
  description: "Sign in to your Rendezvous IL account to manage registrations and view your family dashboard.",
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const params = await searchParams
  const redirectUrl = params.redirect_url || "/account"

  return (
    <MainContent className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <AuthFormShell
        title="Welcome back"
        description="Sign in to access your family dashboard and manage registrations."
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        }
      >
        <CustomSignInForm redirectUrl={redirectUrl} />
      </AuthFormShell>
    </MainContent>
  )
}
