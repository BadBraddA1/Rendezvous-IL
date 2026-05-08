import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Rendezvous 2027 - Christian Homeschool Family Retreat"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function TwitterImage() {
  // Calculate days until event (May 3, 2027)
  const eventDate = new Date("2027-05-03T00:00:00")
  const now = new Date()
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate days until registration opens (Jan 1, 2027)
  const regDate = new Date("2027-01-01T00:00:00")
  const daysUntilReg = Math.ceil((regDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative elements */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(94, 200, 180, 0.2), rgba(94, 200, 180, 0.05))",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(224, 120, 96, 0.15), rgba(224, 120, 96, 0.05))",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            zIndex: 1,
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#0f766e",
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}
          >
            RENDEZVOUS
          </div>

          {/* Year with gradient effect */}
          <div
            style={{
              fontSize: 140,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              background: "linear-gradient(90deg, #e07860, #e8927c, #c9b49c, #8dd4c4, #5ec8b4)",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            2027
          </div>

          {/* Theme */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Theme: 1 Samuel
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#64748b",
                background: "#f1f5f9",
                padding: "6px 12px",
                borderRadius: 20,
              }}
            >
              Bible Bowl Study
            </div>
          </div>

          {/* Event info */}
          <div
            style={{
              display: "flex",
              gap: 32,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "white",
                padding: "16px 24px",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 4 }}>Event Dates</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>May 3-7, 2027</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Monday - Friday</div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "white",
                padding: "16px 24px",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 4 }}>Location</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Lake Williamson</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Carlinville, IL</div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: daysUntilReg > 0 ? "#fef3c7" : "#d1fae5",
                padding: "16px 24px",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 14, color: daysUntilReg > 0 ? "#92400e" : "#065f46", marginBottom: 4 }}>
                {daysUntilReg > 0 ? "Registration Opens" : "Registration"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: daysUntilReg > 0 ? "#78350f" : "#047857" }}>
                {daysUntilReg > 0 ? `${daysUntilReg} days` : "Open Now!"}
              </div>
              <div style={{ fontSize: 12, color: daysUntilReg > 0 ? "#a16207" : "#059669" }}>
                {daysUntilReg > 0 ? "January 1, 2027" : "Register today"}
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 18,
              color: "#64748b",
              textAlign: "center",
            }}
          >
            Christian Homeschool Family Retreat — Fellowship. Faith. Family.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 14, color: "#94a3b8" }}>rendezvousil.com</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
