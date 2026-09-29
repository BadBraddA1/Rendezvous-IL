import { permanentRedirect } from "next/navigation"

/** Legacy URL — keep old /install links working. */
export default function InstallRedirectPage() {
  permanentRedirect("/gettheapp")
}
