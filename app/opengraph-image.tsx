import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ogImageAlt } from "@/lib/site-metadata"

export const alt = ogImageAlt
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const lake = "#1a5c56"
const lakeMuted = "#5a7875"
const coral = "#b85c38"

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public/rendezvous-logo.png"))
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "40px 64px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          width={400}
          height={132}
          style={{ objectFit: "contain", marginBottom: 28 }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 60, fontWeight: 700, color: lake, lineHeight: 1.05 }}>
            May 3–7, 2027
          </div>
          <div style={{ fontSize: 28, color: lakeMuted, lineHeight: 1.35, maxWidth: 900 }}>
            Lake Williamson Christian Center · Carlinville, IL
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, color: lake, lineHeight: 1.3, marginTop: 4 }}>
            Christian Homeschool Family Retreat
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 24,
              padding: "16px 40px",
              backgroundColor: coral,
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 700,
              borderRadius: 999,
              letterSpacing: 0.2,
            }}
          >
            Register starting Jan 1, 2027 →
          </div>
          <div style={{ fontSize: 22, color: lakeMuted, lineHeight: 1.3, marginTop: 12 }}>
            rendezvousil.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
