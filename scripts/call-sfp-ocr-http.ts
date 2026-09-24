/**
 * Call the live SFP OCR HTTP worker on RunPod.
 *
 *   npx tsx scripts/call-sfp-ocr-http.ts --file-url=https://cdn…/x.pdf
 *
 * Uses SFP_OCR_HTTP_URL from ~/.config/runpod/agent.env
 */
import { readFileSync } from "fs"

function loadEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  try {
    for (const line of readFileSync(`${process.env.HOME}/.config/runpod/agent.env`, "utf8").split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      if (!env[line.slice(0, i).trim()]) env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  } catch { /* ignore */ }
  return env
}

function arg(name: string) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

async function main() {
  const env = loadEnv()
  const base = (env.SFP_OCR_HTTP_URL || "").replace(/\/$/, "")
  if (!base) throw new Error("SFP_OCR_HTTP_URL missing")
  const fileUrl = arg("file-url")
  if (!fileUrl) throw new Error("--file-url= required")
  const res = await fetch(`${base}/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_url: fileUrl,
      title: arg("title"),
      printed_page: arg("printed-page") ? Number(arg("printed-page")) : undefined,
      dpi: arg("dpi") ? Number(arg("dpi")) : 200,
    }),
  })
  const text = await res.text()
  console.log(res.status, text.slice(0, 3000))
  if (!res.ok) process.exit(1)
}
main()
