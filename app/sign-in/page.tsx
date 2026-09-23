import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"
import { authConfig } from "@/lib/auth-config"
import { safeReturnPath } from "@/lib/after-auth"

export const metadata: Metadata = {
  title: `Sign In — ${authConfig.siteName}`,
  description: authConfig.copy.signInSubtitle,
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  // Middleware deep-link return: land back where the user was headed.
  const { redirect_url } = await searchParams
  const afterUrl = safeReturnPath(redirect_url) ?? authConfig.afterSignInUrl

  return (
    <AuthShell
      title={authConfig.copy.signInTitle}
      subtitle={authConfig.copy.signInSubtitle}
      altPrompt="New here?"
      altHref={authConfig.signUpUrl}
      altLabel="Create an account"
    >
      <SignInForm afterUrl={afterUrl} />
    </AuthShell>
  )
}
