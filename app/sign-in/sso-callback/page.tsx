import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

export default function SignInSsoCallbackPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
