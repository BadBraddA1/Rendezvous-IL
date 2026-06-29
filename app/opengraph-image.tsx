import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const alt = "Rendezvous 2027 — Christian homeschool family retreat at Lake Williamson"
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
          padding: "48px 64px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt=""
          width={420}
          height={140}
          style={{ objectFit: "contain", marginBottom: 36 }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, color: lake, lineHeight: 1.05 }}>
            May 3–7, 2027
          </div>
          <div style={{ fontSize: 30, color: lakeMuted, lineHeight: 1.35, maxWidth: 900 }}>
            Lake Williamson Christian Center · Carlinville, IL
          </div>
          <div
            style={{
              marginTop: 20,
              width: 80,
              height: 4,
              backgroundColor: coral,
              borderRadius: 2,
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 600, color: lake, lineHeight: 1.3, marginTop: 8 }}>
            Christian Homeschool Family Retreat
          </div>
          <div style={{ fontSize: 22, color: lakeMuted, lineHeight: 1.3 }}>
            rendezvousil.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
