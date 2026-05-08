import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function AuthRedirectPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  // Check for admin role in publicMetadata
  const role = user.publicMetadata?.role as string | undefined
  
  if (role === "admin") {
    redirect("/admin")
  } else {
    redirect("/registration")
  }
}
