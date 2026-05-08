import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignUp 
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
