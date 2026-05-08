import { redirect } from "next/navigation"

export default function AdminLoginPage() {
  // Redirect to Clerk sign-in page
  redirect("/sign-in")
}
