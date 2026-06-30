import { AccountSettingsClient } from "./account-settings-client"

export const metadata = {
  title: "Account Settings - Rendezvous IL",
  description: "Manage your Rendezvous IL sign-in details.",
}

export default function AccountSettingsPage() {
  return <AccountSettingsClient />
}
