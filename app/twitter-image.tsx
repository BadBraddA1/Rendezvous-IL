import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Rendezvous 2027 - Christian Homeschool Family Retreat"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function TwitterImage() {
  // Calculate days until registration opens (Jan 1, 2027)
  const regDate = new Date("2027-01-01T06:00:00Z") // Midnight Central
  const now = new Date()
  const daysUntilReg = Math.ceil((regDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const regOpen = daysUntilReg <= 0

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          padding: 60,
        }}
      >
        {/* Top section with branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: "#0d9488",
              letterSpacing: -1,
              marginBottom: 8,
            }}
          >
            RENDEZVOUS
          </div>
          <div
            style={{
              fontSize: 160,
              fontWeight: 900,
              color: "#0d9488",
              letterSpacing: -8,
              lineHeight: 1,
            }}
          >
            2027
          </div>
        </div>

        {/* Middle section - Info cards */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            marginBottom: 40,
          }}
        >
          {/* Dates card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "white",
              padding: "24px 40px",
              borderRadius: 16,
              border: "2px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 16, color: "#64748b", marginBottom: 8 }}>EVENT DATES</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>May 3-7, 2027</div>
            <div style={{ fontSize: 16, color: "#64748b", marginTop: 4 }}>Monday - Friday</div>
          </div>

          {/* Location card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "white",
              padding: "24px 40px",
              borderRadius: 16,
              border: "2px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 16, color: "#64748b", marginBottom: 8 }}>LOCATION</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>Lake Williamson</div>
            <div style={{ fontSize: 16, color: "#64748b", marginTop: 4 }}>Carlinville, IL</div>
          </div>

          {/* Registration card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: regOpen ? "#d1fae5" : "#fef3c7",
              padding: "24px 40px",
              borderRadius: 16,
              border: regOpen ? "2px solid #6ee7b7" : "2px solid #fcd34d",
            }}
          >
            <div style={{ fontSize: 16, color: regOpen ? "#065f46" : "#92400e", marginBottom: 8 }}>
              {regOpen ? "REGISTRATION" : "REG OPENS IN"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: regOpen ? "#047857" : "#b45309" }}>
              {regOpen ? "Open Now!" : `${daysUntilReg} Days`}
            </div>
            <div style={{ fontSize: 16, color: regOpen ? "#059669" : "#a16207", marginTop: 4 }}>
              {regOpen ? "Sign up today!" : "January 1, 2027"}
            </div>
          </div>
        </div>

        {/* Theme section */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 600, color: "#334155" }}>Theme: 1 Samuel</div>
          <div
            style={{
              fontSize: 18,
              color: "#0d9488",
              backgroundColor: "#ccfbf1",
              padding: "8px 16px",
              borderRadius: 24,
              fontWeight: 600,
            }}
          >
            Bible Bowl Study
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 22, color: "#64748b", textAlign: "center" }}>
            Christian Homeschool Family Retreat
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: "#0d9488" }}>Fellowship</div>
          <div style={{ fontSize: 20, color: "#94a3b8" }}>•</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#0d9488" }}>Faith</div>
          <div style={{ fontSize: 20, color: "#94a3b8" }}>•</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#0d9488" }}>Family</div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 18, color: "#94a3b8" }}>rendezvousil.com</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
