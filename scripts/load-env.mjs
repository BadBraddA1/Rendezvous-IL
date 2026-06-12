import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

/** Load .env.local / .env into process.env (does not override existing). */
export function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(projectRoot, name)
    if (!fs.existsSync(filePath)) continue
    for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  }
}
