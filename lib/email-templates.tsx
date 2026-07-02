import type { RegistrationData } from "@/types/registration"
import { formatArrivalDepartureNotes } from "@/lib/registration-arrival-departure"
import { AGREEMENT_INTRO, AGREEMENT_ITEMS } from "@/lib/agreement-content"

/** sRGB approximations of site OKLCH tokens (DESIGN.md) for email clients. */
export const EMAIL_BRAND = {
  primary: "#2fa894",
  primaryDark: "#238a7a",
  coral: "#d97a62",
  ink: "#1a2e32",
  muted: "#4d5f66",
  surface: "#e8f2f0",
  surfaceLake: "#d4ebe6",
  onPrimary: "#f8fcfb",
  border: "#cdded9",
  success: "#2d8a5e",
  successBg: "#e8f2f0",
  warningBg: "#fdf6ef",
  warningBorder: "#d97a62",
  dangerBg: "#fdf0ed",
  dangerBorder: "#c45a48",
  dangerInk: "#7a2e22",
} as const

/** Brand chart palette for Recharts (SVG cannot resolve CSS custom properties reliably). */
export const CHART_COLORS = [
  EMAIL_BRAND.primary,
  EMAIL_BRAND.primaryDark,
  EMAIL_BRAND.success,
  "#c4a76a",
  EMAIL_BRAND.coral,
] as const

function emailShell(body: string, headerTitle: string, headerSubtitle?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${EMAIL_BRAND.ink}; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${EMAIL_BRAND.primary}; padding: 28px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: ${EMAIL_BRAND.onPrimary}; margin: 0; font-size: 24px;">${headerTitle}</h1>
    ${headerSubtitle ? `<p style="color: ${EMAIL_BRAND.onPrimary}; margin: 8px 0 0 0; font-size: 14px;">${headerSubtitle}</p>` : ""}
  </div>
  <div style="background: white; padding: 28px; border: 1px solid ${EMAIL_BRAND.border}; border-top: none; border-radius: 0 0 8px 8px;">
    ${body}
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 12px; margin-top: 28px; padding-top: 16px; border-top: 1px solid ${EMAIL_BRAND.border}; text-align: center;">
      Rendezvous IL · Lake Williamson Christian Center
    </p>
  </div>
</body>
</html>`
}

export function generateMagicLinkEmail(magicLink: string): string {
  const body = `
    <p>Click the button below to access the Rendezvous admin dashboard:</p>
    <div style="margin: 24px 0; text-align: center;">
      <a href="${magicLink}" style="background: ${EMAIL_BRAND.primary}; color: ${EMAIL_BRAND.onPrimary}; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
        Access Admin Dashboard
      </a>
    </div>
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 14px;">Or copy and paste this link:</p>
    <p style="background: ${EMAIL_BRAND.surface}; padding: 12px; border-radius: 6px; border: 1px solid ${EMAIL_BRAND.border}; word-break: break-all; font-size: 12px;">${magicLink}</p>
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 14px;">This link expires in 7 days. If you didn't request it, you can ignore this email.</p>
  `
  return emailShell(body, "Admin Access", "Rendezvous 2027")
}

export function generateSignatureRequestEmail(params: {
  parentName: string
  familyLastName: string
  signUrl: string
}): string {
  const { parentName, familyLastName, signUrl } = params
  const agreementItems = AGREEMENT_ITEMS.map(
    (item) => `<li style="margin: 6px 0;">${item}</li>`,
  ).join("")

  const body = `
    <p>Dear ${parentName},</p>
    <p>
      Your family's registration for <strong>Rendezvous 2027</strong> (${familyLastName} Family)
      has been submitted. Each parent signs the event agreement individually — this link is
      just for you.
    </p>
    <div style="background: ${EMAIL_BRAND.surface}; padding: 16px 20px; border-radius: 8px; border: 1px solid ${EMAIL_BRAND.border}; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-weight: bold;">${AGREEMENT_INTRO}</p>
      <ul style="margin: 0; padding-left: 20px; color: ${EMAIL_BRAND.muted};">
        ${agreementItems}
      </ul>
    </div>
    <div style="margin: 24px 0; text-align: center;">
      <a href="${signUrl}" style="background: ${EMAIL_BRAND.primary}; color: ${EMAIL_BRAND.onPrimary}; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
        Review & Sign
      </a>
    </div>
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 14px;">Or copy and paste this link:</p>
    <p style="background: ${EMAIL_BRAND.surface}; padding: 12px; border-radius: 6px; border: 1px solid ${EMAIL_BRAND.border}; word-break: break-all; font-size: 12px;">${signUrl}</p>
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 14px;">
      Your family can be checked in at the event once both parents have signed.
      This link is personal — please don't forward it.
    </p>
  `
  return emailShell(body, "Signature Needed", "Rendezvous 2027 Registration")
}

export function generateAdminBulkEmail(familyLastName: string, message: string): string {
  const messageHtml = message
    .split("\n")
    .map((line) => `<p style="margin: 0 0 12px 0;">${line || "&nbsp;"}</p>`)
    .join("")

  const body = `
    <p>Dear ${familyLastName} Family,</p>
    <div style="margin: 20px 0; line-height: 1.65;">
      ${messageHtml}
    </div>
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 14px;">
      This email was sent from the Rendezvous admin team. Reply if you have questions.
    </p>
  `
  return emailShell(body, "Rendezvous 2027", "Message from the admin team")
}

export function generateMessagingBroadcastEmail(message: string): string {
  const messageHtml = message
    .split("\n")
    .map((line) => `<p style="margin: 0 0 12px 0;">${line || "&nbsp;"}</p>`)
    .join("")

  const body = `
    <div style="line-height: 1.65;">
      ${messageHtml}
    </div>
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 13px; margin-top: 24px;">
      You received this because you're registered for Rendezvous IL.
    </p>
  `
  return emailShell(body, "Rendezvous IL")
}

export function generateRegistrationConfirmationEmail(data: RegistrationData, registrationId: number) {
  const familyMembersHtml = data.familyMembers
    .filter((m) => m.firstName && (m.dateOfBirth || m.isOver18))
    .map((member) => {
      const lastName = member.useCustomLastName && member.lastName ? member.lastName : data.familyLastName
      return `
      <li style="margin: 8px 0;">
        ${member.firstName} ${lastName}${member.age ? ` - Age ${member.age}` : " - Adult"}${member.isBaptized ? " ★" : ""}
      </li>
    `
    })
    .join("")

  const lodgingCost = data.lodgingTotal || 0
  const tshirtCost = data.tshirtTotal || 0
  const climbingTowerCost = data.climbingTowerTotal || 0
  const registrationFee = data.registrationFee || 0
  const scholarshipDonation = data.scholarshipDonation || 0

  const dueNow = registrationFee + scholarshipDonation
  const dueAtCheckIn = lodgingCost + tshirtCost + climbingTowerCost
  const grandTotal = dueNow + dueAtCheckIn

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rendezvous 2027 Registration Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${EMAIL_BRAND.ink}; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${EMAIL_BRAND.primary}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: ${EMAIL_BRAND.onPrimary}; margin: 0; font-size: 28px;">Rendezvous 2027</h1>
    <p style="color: ${EMAIL_BRAND.onPrimary}; margin: 10px 0 0 0; font-size: 16px;">Registration Confirmation</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid ${EMAIL_BRAND.border}; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; color: ${EMAIL_BRAND.primaryDark}; margin-top: 0;"><strong>Thank you for registering!</strong></p>
    
    <p>Dear ${data.familyLastName} Family,</p>
    
    <p>Your registration for Rendezvous 2027 has been successfully submitted. Below is a summary of your registration for your records.</p>
    
    <div style="background: ${EMAIL_BRAND.surface}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid ${EMAIL_BRAND.border};">
      <h2 style="color: ${EMAIL_BRAND.primaryDark}; font-size: 20px; margin-top: 0;">Registration Details</h2>
      <p><strong>Registration ID:</strong> #${registrationId}</p>
      <p><strong>Family Name:</strong> ${data.familyLastName}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.husbandPhone || data.wifePhone}</p>
    </div>
    
    <div style="background: ${EMAIL_BRAND.surface}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid ${EMAIL_BRAND.border};">
      <h3 style="color: ${EMAIL_BRAND.primaryDark}; font-size: 18px; margin-top: 0;">Family Members (${data.familyMembers.filter((m) => m.firstName && (m.dateOfBirth || m.isOver18)).length})</h3>
      <ul style="list-style: none; padding: 0;">
        ${familyMembersHtml}
      </ul>
      <p style="font-size: 12px; color: ${EMAIL_BRAND.muted}; margin-top: 10px;">★ indicates baptized members</p>
    </div>
    
    <div style="background: ${EMAIL_BRAND.surface}; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid ${EMAIL_BRAND.border};">
      <h3 style="color: ${EMAIL_BRAND.primaryDark}; font-size: 18px; margin-top: 0;">Lodging</h3>
      <p><strong>Type:</strong> ${data.lodgingType === "tent" ? "Tent Site" : data.lodgingType === "rv" ? "RV Site" : data.lodgingType === "motel-2queen-bunk" ? "Motel - 2 Queen + Bunk" : "Motel - 1 Queen + 2 Bunk"}</p>
    </div>
    
    ${
      !data.scholarshipRequested
        ? `
    <!-- New payment breakdown with clear sections -->
    <div style="background: ${EMAIL_BRAND.successBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid ${EMAIL_BRAND.success};">
      <h3 style="color: ${EMAIL_BRAND.success}; font-size: 20px; margin-top: 0; margin-bottom: 15px;">💳 Pay Now via Venmo</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.ink};">Registration Fee:</td>
          <td style="text-align: right; font-weight: bold; color: ${EMAIL_BRAND.ink};">$${registrationFee.toFixed(2)}</td>
        </tr>
        ${
          scholarshipDonation > 0
            ? `
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.ink};">Scholarship Donation:</td>
          <td style="text-align: right; font-weight: bold; color: ${EMAIL_BRAND.ink};">+$${scholarshipDonation.toFixed(2)}</td>
        </tr>
        `
            : ""
        }
        <tr style="border-top: 2px solid ${EMAIL_BRAND.success};">
          <td style="padding: 12px 0; font-size: 18px; color: ${EMAIL_BRAND.success};"><strong>Pay Now:</strong></td>
          <td style="padding: 12px 0; font-size: 20px; text-align: right; color: ${EMAIL_BRAND.success};"><strong>$${dueNow.toFixed(2)}</strong></td>
        </tr>
      </table>
      <a href="https://venmo.com/u/sbradd78" style="display: inline-block; background: ${EMAIL_BRAND.primary}; color: ${EMAIL_BRAND.onPrimary}; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 10px 0; width: 100%; text-align: center; box-sizing: border-box;">
        Pay with Venmo (@sbradd78)
      </a>
      <p style="color: ${EMAIL_BRAND.muted}; margin-top: 15px; font-size: 13px; text-align: center;">
        <strong>Important:</strong> Please include Registration ID #${registrationId} in your Venmo payment note
      </p>
    </div>
    
    <div style="background: ${EMAIL_BRAND.surfaceLake}; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid ${EMAIL_BRAND.primary};">
      <h3 style="color: ${EMAIL_BRAND.primaryDark}; font-size: 20px; margin-top: 0; margin-bottom: 15px;">📋 Pay at Check-In</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.ink};">Lodging & Meals:</td>
          <td style="text-align: right; font-weight: bold; color: ${EMAIL_BRAND.ink};">$${lodgingCost.toFixed(2)}</td>
        </tr>
        ${
          climbingTowerCost > 0
            ? `
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.ink};">Climbing Tower:</td>
          <td style="text-align: right; font-weight: bold; color: ${EMAIL_BRAND.ink};">$${climbingTowerCost.toFixed(2)}</td>
        </tr>
        `
            : ""
        }
        ${
          tshirtCost > 0
            ? `
        <tr>
          <td style="padding: 6px 0; color: ${EMAIL_BRAND.ink};">T-Shirts (if ordered):</td>
          <td style="text-align: right; font-weight: bold; color: ${EMAIL_BRAND.ink};">$${tshirtCost.toFixed(2)}</td>
        </tr>
        `
            : ""
        }
        <tr style="border-top: 2px solid ${EMAIL_BRAND.primary};">
          <td style="padding: 12px 0; font-size: 18px; color: ${EMAIL_BRAND.primaryDark};"><strong>At Check-In:</strong></td>
          <td style="padding: 12px 0; font-size: 20px; text-align: right; color: ${EMAIL_BRAND.primaryDark};"><strong>$${dueAtCheckIn.toFixed(2)}</strong></td>
        </tr>
      </table>
    </div>
    
    <div style="background: ${EMAIL_BRAND.surface}; padding: 20px; border-radius: 8px; margin: 25px 0; border: 2px solid ${EMAIL_BRAND.border};">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; font-size: 18px;"><strong>Grand Total:</strong></td>
          <td style="padding: 8px 0; font-size: 22px; text-align: right; color: ${EMAIL_BRAND.coral};"><strong>$${grandTotal.toFixed(2)}</strong></td>
        </tr>
      </table>
    </div>
    `
        : ""
    }
    
    <div style="margin: 30px 0; padding: 20px; background: ${EMAIL_BRAND.warningBg}; border-radius: 8px; border: 2px solid ${EMAIL_BRAND.warningBorder};">
      <h3 style="color: ${EMAIL_BRAND.ink}; margin-top: 0;">Important Information</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Registration fee must be paid via Venmo before April 15, 2027</li>
        <li>Lodging & meals will be collected at check-in</li>
        <li>Check-in: Saturday, May 3, 2027 from 1:00-5:15 PM at the Activity Center</li>
        <li>Keep this email for your records</li>
        <li>Questions? Need to make a change to your registration? Contact Stephen Bradd at (217) 935-5058 or Stephen@Bradd.us</li>
      </ul>
    </div>
    
    <p style="margin-top: 30px;">We look forward to seeing you at Rendezvous 2027!</p>
    
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid ${EMAIL_BRAND.border};">
      This is an automated confirmation email from Rendezvous 2027.<br>
      If you did not register for this event, please contact us immediately.
    </p>
  </div>
</body>
</html>
  `
}

export function generateAdminNotificationEmail(data: RegistrationData, registrationId: number) {
  const familyMembersHtml = data.familyMembers
    .filter((m) => m.firstName && (m.dateOfBirth || m.isOver18))
    .map((member) => {
      const lastName = member.useCustomLastName && member.lastName ? member.lastName : data.familyLastName
      return `
      <tr style="border-bottom: 1px solid ${EMAIL_BRAND.border};">
        <td style="padding: 8px;">${member.firstName} ${lastName}</td>
        <td style="padding: 8px;">${member.age ? `${member.age} years old` : "Adult"}</td>
        <td style="padding: 8px;">${member.isBaptized ? "Yes" : "No"}</td>
      </tr>
    `
    })
    .join("")

  const lodgingCost = data.lodgingTotal || 0
  const tshirtCost = data.tshirtTotal || 0
  const climbingTowerCost = data.climbingTowerTotal || 0
  const registrationFee = data.registrationFee || 0
  const scholarshipDonation = data.scholarshipDonation || 0
  const grandTotal = registrationFee + lodgingCost + tshirtCost + climbingTowerCost + scholarshipDonation
  const arrivalNotes = formatArrivalDepartureNotes(
    data.arrivalDeparture,
    data.familyMembers,
    data.familyLastName,
  )

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Registration - ${data.familyLastName} Family</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: ${EMAIL_BRAND.ink}; max-width: 700px; margin: 0 auto; padding: 20px; background: ${EMAIL_BRAND.surface};">
  <div style="background: ${EMAIL_BRAND.primaryDark}; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: ${EMAIL_BRAND.onPrimary}; margin: 0; font-size: 24px;">🎉 New Registration Received</h1>
    <p style="color: ${EMAIL_BRAND.onPrimary}; margin: 8px 0 0 0; font-size: 14px;">Rendezvous 2027 Admin Notification</p>
  </div>
  
  <div style="background: white; padding: 25px; border: 1px solid ${EMAIL_BRAND.border}; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="background: ${EMAIL_BRAND.surfaceLake}; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 2px solid ${EMAIL_BRAND.primary};">
      <p style="margin: 0; font-size: 16px;"><strong>Registration ID:</strong> #${registrationId}</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${EMAIL_BRAND.muted};">Submitted on ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</p>
    </div>

    <h2 style="color: ${EMAIL_BRAND.primaryDark}; font-size: 20px; margin-top: 20px; border-bottom: 2px solid ${EMAIL_BRAND.border}; padding-bottom: 8px;">Family Information</h2>
    <table style="width: 100%; margin: 15px 0;">
      <tr>
        <td style="padding: 6px 0; font-weight: bold; width: 180px;">Family Name:</td>
        <td style="padding: 6px 0;">${data.familyLastName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Email:</td>
        <td style="padding: 6px 0;"><a href="mailto:${data.email}" style="color: ${EMAIL_BRAND.primary};">${data.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Husband Phone:</td>
        <td style="padding: 6px 0;">${data.husbandPhone || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Wife Phone:</td>
        <td style="padding: 6px 0;">${data.wifePhone || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Address:</td>
        <td style="padding: 6px 0;">${data.address}, ${data.city}, ${data.state} ${data.zip}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Congregation:</td>
        <td style="padding: 6px 0;">${data.homeCongregation || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Years Attended:</td>
        <td style="padding: 6px 0;">${data.timesAttended || "First time"}</td>
      </tr>
    </table>

    <h2 style="color: ${EMAIL_BRAND.primaryDark}; font-size: 20px; margin-top: 25px; border-bottom: 2px solid ${EMAIL_BRAND.border}; padding-bottom: 8px;">Family Members (${data.familyMembers.filter((m) => m.firstName && (m.dateOfBirth || m.isOver18)).length})</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background: ${EMAIL_BRAND.surface};">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid ${EMAIL_BRAND.border};">Name</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid ${EMAIL_BRAND.border};">Age</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid ${EMAIL_BRAND.border};">Baptized</th>
        </tr>
      </thead>
      <tbody>
        ${familyMembersHtml}
      </tbody>
    </table>

    <h2 style="color: ${EMAIL_BRAND.primaryDark}; font-size: 20px; margin-top: 25px; border-bottom: 2px solid ${EMAIL_BRAND.border}; padding-bottom: 8px;">Lodging & Financial Details</h2>
    <table style="width: 100%; margin: 15px 0;">
      <tr>
        <td style="padding: 6px 0; font-weight: bold; width: 180px;">Lodging Type:</td>
        <td style="padding: 6px 0;">${data.lodgingType === "tent" ? "Tent Site" : data.lodgingType === "rv" ? "RV Site" : data.lodgingType === "motel-2queen-bunk" ? "Motel - 2 Queen + Bunk" : "Motel - 1 Queen + 2 Bunk"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Registration Fee:</td>
        <td style="padding: 6px 0;">$${registrationFee.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Lodging Cost:</td>
        <td style="padding: 6px 0;">$${lodgingCost.toFixed(2)}</td>
      </tr>
      ${
        tshirtCost > 0
          ? `
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">T-Shirts:</td>
        <td style="padding: 6px 0;">$${tshirtCost.toFixed(2)}</td>
      </tr>
      `
          : ""
      }
      ${
        climbingTowerCost > 0
          ? `
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Climbing Tower:</td>
        <td style="padding: 6px 0;">$${climbingTowerCost.toFixed(2)}</td>
      </tr>
      `
          : ""
      }
      ${
        scholarshipDonation > 0
          ? `
      <tr>
        <td style="padding: 6px 0; color: ${EMAIL_BRAND.success};">Scholarship Donation:</td>
        <td style="text-align: right; color: ${EMAIL_BRAND.success};">+$${scholarshipDonation.toFixed(2)}</td>
      </tr>
      `
          : ""
      }
      <tr style="border-top: 2px solid ${EMAIL_BRAND.primary};">
        <td style="padding: 10px 0; font-weight: bold; font-size: 16px;">Total Amount:</td>
        <td style="padding: 10px 0; font-size: 16px; color: ${EMAIL_BRAND.primaryDark}; font-weight: bold;">$${grandTotal.toFixed(2)}</td>
      </tr>
    </table>

    ${
      arrivalNotes
        ? `
    <h2 style="color: ${EMAIL_BRAND.primaryDark}; font-size: 20px; margin-top: 25px; border-bottom: 2px solid ${EMAIL_BRAND.border}; padding-bottom: 8px;">Arrival &amp; Departure</h2>
    <div style="background: ${EMAIL_BRAND.warningBg}; padding: 15px; border-radius: 6px; margin: 15px 0; border: 2px solid ${EMAIL_BRAND.warningBorder};">
      <p style="margin: 0; white-space: pre-line;">${arrivalNotes}</p>
    </div>
    `
        : ""
    }

    ${
      data.scholarshipRequested
        ? `
    <div style="background: ${EMAIL_BRAND.dangerBg}; padding: 15px; border-radius: 6px; margin: 15px 0; border: 2px solid ${EMAIL_BRAND.dangerBorder};">
      <p style="margin: 0; color: ${EMAIL_BRAND.dangerInk};"><strong>⚠️ Scholarship Requested</strong></p>
    </div>
    `
        : ""
    }

    <div style="margin-top: 30px; padding: 20px; background: ${EMAIL_BRAND.surface}; border-radius: 6px; text-align: center; border: 1px solid ${EMAIL_BRAND.border};">
      <p style="margin: 0; font-size: 14px; color: ${EMAIL_BRAND.muted};">
        View full details in the <a href="https://v0-ren-demo.vercel.app/admin/registrations" style="color: ${EMAIL_BRAND.primary}; text-decoration: none; font-weight: bold;">Admin Dashboard</a>
      </p>
    </div>

    <p style="color: ${EMAIL_BRAND.muted}; font-size: 12px; margin-top: 25px; padding-top: 20px; border-top: 1px solid ${EMAIL_BRAND.border}; text-align: center;">
      This is an automated admin notification for Rendezvous 2027 registrations
    </p>
  </div>
</body>
</html>
  `
}
