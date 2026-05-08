import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignIn 
        forceRedirectUrl="/auth-redirect"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
            formButtonPrimary: "bg-primary hover:bg-primary/90",
          }
        }}
      />
    </div>
  )
}
