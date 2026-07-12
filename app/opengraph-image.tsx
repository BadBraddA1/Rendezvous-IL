import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ogImageAlt } from "@/lib/site-metadata"

export const alt = ogImageAlt
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const coral = "#b85c38"

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public/rendezvous-logo.png"))
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`

  const groupData = await readFile(
    join(process.cwd(), "public/images/rendezvous-group-2026-og.jpg"),
  )
  const groupSrc = `data:image/jpeg;base64,${groupData.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0f2f2c",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={groupSrc}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(10, 35, 32, 0.92) 0%, rgba(10, 35, 32, 0.55) 45%, rgba(10, 35, 32, 0.35) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
            padding: "48px 56px 44px",
            textAlign: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            width={280}
            height={92}
            style={{ objectFit: "contain", marginBottom: 18 }}
          />
          <div style={{ fontSize: 52, fontWeight: 700, color: "#ffffff", lineHeight: 1.05 }}>
            May 3–7, 2027
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.88)", lineHeight: 1.35, marginTop: 8 }}>
            Lake Williamson Christian Center · Carlinville, IL
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 22,
              padding: "14px 34px",
              backgroundColor: coral,
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 700,
              borderRadius: 999,
            }}
          >
            Registration opens Jan 1, 2027 →
          </div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", marginTop: 12 }}>
            rendezvousil.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
