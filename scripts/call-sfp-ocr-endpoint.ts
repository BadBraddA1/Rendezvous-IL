/**
 * Call the SFP book OCR RunPod serverless endpoint for one PDF.
 *
 *   npx tsx --env-file=.env.local scripts/call-sfp-ocr-endpoint.ts \
 *     --file-url=https://cdn.../x.pdf \
 *     [--title="2 · …"] [--item-id=…] [--printed-page=2] [--sync]
 *
 * Requires RUNPOD_API_KEY (+ endpoint id in /tmp/sfp-book-ocr-endpoint.json
 * or RUNPOD_SFP_OCR_ENDPOINT_ID).
 */
import { readFileSync, existsSync } from "fs"

function loadEnv() {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  for (const path of [
    ".env.local",
    `${process.env.HOME}/.config/runpod/agent.env`,
  ]) {
    try {
      for (const line of readFileSync(path, "utf8").split("\n")) {
        if (!line || line.startsWith("#") || !line.includes("=")) continue
        const i = line.indexOf("=")
        const k = line.slice(0, i).trim()
        if (!env[k]) env[k] = line.slice(i + 1).trim()
      }
    } catch {
      /* ignore */
    }
  }
  return env
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

async function main() {
  const env = loadEnv()
  const apiKey = env.RUNPOD_API_KEY
  if (!apiKey) throw new Error("RUNPOD_API_KEY missing")

  let endpointId =
    env.RUNPOD_SFP_OCR_ENDPOINT_ID || env.RUNPOD_ENDPOINT_ID
  if (!endpointId && existsSync("/tmp/sfp-book-ocr-endpoint.json")) {
    const j = JSON.parse(readFileSync("/tmp/sfp-book-ocr-endpoint.json", "utf8"))
    endpointId = j.endpoint?.id || j.endpointId
  }
  if (!endpointId) throw new Error("No endpoint id — deploy-serverless.sh first")

  const fileUrl = arg("file-url")
  if (!fileUrl) throw new Error("--file-url= required")

  const sync = process.argv.includes("--sync")
  const path = sync ? "runsync" : "run"
  const url = `https://api.runpod.ai/v2/${endpointId}/${path}`

  const body = {
    input: {
      file_url: fileUrl,
      title: arg("title"),
      item_id: arg("item-id"),
      printed_page: arg("printed-page") ? Number(arg("printed-page")) : undefined,
      dpi: arg("dpi") ? Number(arg("dpi")) : 200,
    },
  }

  console.log("POST", url)
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  console.log(res.status, text.slice(0, 2000))
  if (!res.ok) process.exit(1)

  if (!sync) {
    const j = JSON.parse(text)
    const id = j.id
    console.log("job", id, "— poll with:")
    console.log(
      `curl -sS -H "Authorization: Bearer $RUNPOD_API_KEY" https://api.runpod.ai/v2/${endpointId}/status/${id}`,
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
