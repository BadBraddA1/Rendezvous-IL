import Link from "next/link"
import { MainContent } from "@/components/main-content"
import { AuthFormShell } from "@/components/auth/auth-form-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata = {
  title: "Reset Password - Rendezvous IL",
  description: "Reset your Rendezvous IL account password.",
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const params = await searchParams
  const redirectUrl = params.redirect_url || "/account"

  return (
    <MainContent className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <AuthFormShell
        title="Reset your password"
        description="We'll email you a code to choose a new password."
        footer={
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <ForgotPasswordForm redirectUrl={redirectUrl} />
      </AuthFormShell>
    </MainContent>
  )
}
