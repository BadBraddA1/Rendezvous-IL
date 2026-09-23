import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { authConfig } from "@/lib/auth-config"
import { safeReturnPath } from "@/lib/after-auth"

export const metadata: Metadata = {
  title: `Reset Password — ${authConfig.siteName}`,
  description: authConfig.copy.forgotSubtitle,
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string; email?: string }>
}) {
  // Deep-link return + email prefill (admin-sent reset links carry ?email=).
  const { redirect_url, email } = await searchParams
  const afterUrl = safeReturnPath(redirect_url) ?? authConfig.afterSignInUrl

  return (
    <AuthShell
      title={authConfig.copy.forgotTitle}
      subtitle={authConfig.copy.forgotSubtitle}
      altPrompt="Remembered it?"
      altHref={authConfig.signInUrl}
      altLabel="Back to sign in"
    >
      <ForgotPasswordForm afterUrl={afterUrl} defaultEmail={email} />
    </AuthShell>
  )
}
