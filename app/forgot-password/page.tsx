import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { authConfig } from "@/lib/auth-config"

export const metadata: Metadata = {
  title: `Reset Password — ${authConfig.siteName}`,
  description: authConfig.copy.forgotSubtitle,
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title={authConfig.copy.forgotTitle}
      subtitle={authConfig.copy.forgotSubtitle}
      altPrompt="Remembered it?"
      altHref={authConfig.signInUrl}
      altLabel="Back to sign in"
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
