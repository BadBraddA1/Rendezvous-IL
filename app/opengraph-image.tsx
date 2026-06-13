import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const alt = "Rendezvous 2027 — Christian homeschool family retreat at Lake Williamson"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const [photoData, logoData] = await Promise.all([
    readFile(join(process.cwd(), "public/rendezvous-group.jpg")),
    readFile(join(process.cwd(), "public/rendezvous-logo.png")),
  ])

  const photoSrc = `data:image/jpeg;base64,${photoData.toString("base64")}`
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          backgroundColor: "#1a2e32",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(26,46,50,0.96) 0%, rgba(26,46,50,0.55) 45%, rgba(26,46,50,0.15) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "56px 64px",
            gap: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={300} height={100} style={{ objectFit: "contain" }} />
          <div style={{ fontSize: 52, fontWeight: 700, color: "#f8fcfb", lineHeight: 1.1 }}>
            May 3–7, 2027
          </div>
          <div style={{ fontSize: 28, color: "#b8ddd6", lineHeight: 1.3 }}>
            Lake Williamson Christian Center · Carlinville, IL
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
