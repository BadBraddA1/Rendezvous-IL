import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { authConfig } from "@/lib/auth-config"

export const metadata: Metadata = {
  title: `Sign Up — ${authConfig.siteName}`,
  description: authConfig.copy.signUpSubtitle,
}

export default function SignUpPage() {
  return (
    <AuthShell
      title={authConfig.copy.signUpTitle}
      subtitle={authConfig.copy.signUpSubtitle}
      altPrompt="Already have an account?"
      altHref={authConfig.signInUrl}
      altLabel="Sign in"
    >
      <SignUpForm />
    </AuthShell>
  )
}
