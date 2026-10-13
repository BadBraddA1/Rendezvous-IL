import { defineCloudflareConfig } from "@opennextjs/cloudflare"

// Sharp is stubbed via pnpm override (vendor/sharp-stub). Do not list it in
// edgeExternals — Next emits hashed require("sharp-<hash>") which we link
// from .next/node_modules before the OpenNext esbuild step.
export default defineCloudflareConfig()
