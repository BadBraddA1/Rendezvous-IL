import type { RegistrationData } from "@/types/registration"

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
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Rendezvous 2027</h1>
    <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Registration Confirmation</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; color: #f97316; margin-top: 0;"><strong>Thank you for registering!</strong></p>
    
    <p>Dear ${data.familyLastName} Family,</p>
    
    <p>Your registration for Rendezvous 2027 has been successfully submitted. Below is a summary of your registration for your records.</p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="color: #f97316; font-size: 20px; margin-top: 0;">Registration Details</h2>
      <p><strong>Registration ID:</strong> #${registrationId}</p>
      <p><strong>Family Name:</strong> ${data.familyLastName}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.husbandPhone || data.wifePhone}</p>
    </div>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #f97316; font-size: 18px; margin-top: 0;">Family Members (${data.familyMembers.filter((m) => m.firstName && (m.dateOfBirth || m.isOver18)).length})</h3>
      <ul style="list-style: none; padding: 0;">
        ${familyMembersHtml}
      </ul>
      <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">★ indicates baptized members</p>
    </div>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #f97316; font-size: 18px; margin-top: 0;">Lodging</h3>
      <p><strong>Type:</strong> ${data.lodgingType === "tent" ? "Tent Site" : data.lodgingType === "rv" ? "RV Site" : data.lodgingType === "motel-2queen-bunk" ? "Motel - 2 Queen + Bunk" : "Motel - 1 Queen + 2 Bunk"}</p>
    </div>
    
    ${
      !data.scholarshipRequested
        ? `
    <!-- New payment breakdown with clear sections -->
    <div style="background: #dcfce7; padding: 25px; border-radius: 8px; margin: 25px 0; border: 3px solid #16a34a;">
      <h3 style="color: #15803d; font-size: 20px; margin-top: 0; margin-bottom: 15px;">💳 Pay Now via Venmo</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr>
          <td style="padding: 6px 0; color: #166534;">Registration Fee:</td>
          <td style="text-align: right; font-weight: bold; color: #166534;">$${registrationFee.toFixed(2)}</td>
        </tr>
        ${
          scholarshipDonation > 0
            ? `
        <tr>
          <td style="padding: 6px 0; color: #166534;">Scholarship Donation:</td>
          <td style="text-align: right; font-weight: bold; color: #166534;">+$${scholarshipDonation.toFixed(2)}</td>
        </tr>
        `
            : ""
        }
        <tr style="border-top: 2px solid #16a34a;">
          <td style="padding: 12px 0; font-size: 18px; color: #15803d;"><strong>Pay Now:</strong></td>
          <td style="padding: 12px 0; font-size: 20px; text-align: right; color: #15803d;"><strong>$${dueNow.toFixed(2)}</strong></td>
        </tr>
      </table>
      <a href="https://venmo.com/u/sbradd78" style="display: inline-block; background: #3D95CE; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 10px 0; width: 100%; text-align: center; box-sizing: border-box;">
        Pay with Venmo (@sbradd78)
      </a>
      <p style="color: #166534; margin-top: 15px; font-size: 13px; text-align: center;">
        <strong>Important:</strong> Please include Registration ID #${registrationId} in your Venmo payment note
      </p>
    </div>
    
    <div style="background: #dbeafe; padding: 25px; border-radius: 8px; margin: 25px 0; border: 3px solid #3b82f6;">
      <h3 style="color: #1e40af; font-size: 20px; margin-top: 0; margin-bottom: 15px;">📋 Pay at Check-In</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #1e40af;">Lodging & Meals:</td>
          <td style="text-align: right; font-weight: bold; color: #1e40af;">$${lodgingCost.toFixed(2)}</td>
        </tr>
        ${
          climbingTowerCost > 0
            ? `
        <tr>
          <td style="padding: 6px 0; color: #1e40af;">Climbing Tower:</td>
          <td style="text-align: right; font-weight: bold; color: #1e40af;">$${climbingTowerCost.toFixed(2)}</td>
        </tr>
        `
            : ""
        }
        ${
          tshirtCost > 0
            ? `
        <tr>
          <td style="padding: 6px 0; color: #1e40af;">T-Shirts (if ordered):</td>
          <td style="text-align: right; font-weight: bold; color: #1e40af;">$${tshirtCost.toFixed(2)}</td>
        </tr>
        `
            : ""
        }
        <tr style="border-top: 2px solid #3b82f6;">
          <td style="padding: 12px 0; font-size: 18px; color: #1e40af;"><strong>At Check-In:</strong></td>
          <td style="padding: 12px 0; font-size: 20px; text-align: right; color: #1e40af;"><strong>$${dueAtCheckIn.toFixed(2)}</strong></td>
        </tr>
      </table>
    </div>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border: 2px solid #9ca3af;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; font-size: 18px;"><strong>Grand Total:</strong></td>
          <td style="padding: 8px 0; font-size: 22px; text-align: right; color: #f97316;"><strong>$${grandTotal.toFixed(2)}</strong></td>
        </tr>
      </table>
    </div>
    `
        : ""
    }
    
    <div style="margin: 30px 0; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <h3 style="color: #92400e; margin-top: 0;">Important Information</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Registration fee must be paid via Venmo before April 15, 2027</li>
        <li>Lodging & meals will be collected at check-in</li>
        <li>Check-in: Saturday, May 3, 2027 from 1:00-5:15 PM at the Activity Center</li>
        <li>Keep this email for your records</li>
        <li>Questions? Need to make a change to your registration? Contact Stephen Bradd at (217) 935-5058 or Stephen@Bradd.us</li>
      </ul>
    </div>
    
    <p style="margin-top: 30px;">We look forward to seeing you at Rendezvous 2027!</p>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
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
      <tr style="border-bottom: 1px solid #e5e7eb;">
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Registration - ${data.familyLastName} Family</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Registration Received</h1>
    <p style="color: white; margin: 8px 0 0 0; font-size: 14px;">Rendezvous 2027 Admin Notification</p>
  </div>
  
  <div style="background: white; padding: 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; font-size: 16px;"><strong>Registration ID:</strong> #${registrationId}</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Submitted on ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</p>
    </div>

    <h2 style="color: #1e40af; font-size: 20px; margin-top: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Family Information</h2>
    <table style="width: 100%; margin: 15px 0;">
      <tr>
        <td style="padding: 6px 0; font-weight: bold; width: 180px;">Family Name:</td>
        <td style="padding: 6px 0;">${data.familyLastName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Email:</td>
        <td style="padding: 6px 0;"><a href="mailto:${data.email}" style="color: #3b82f6;">${data.email}</a></td>
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

    <h2 style="color: #1e40af; font-size: 20px; margin-top: 25px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Family Members (${data.familyMembers.filter((m) => m.firstName && (m.dateOfBirth || m.isOver18)).length})</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Name</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Age</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Baptized</th>
        </tr>
      </thead>
      <tbody>
        ${familyMembersHtml}
      </tbody>
    </table>

    <h2 style="color: #1e40af; font-size: 20px; margin-top: 25px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Lodging & Financial Details</h2>
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
        <td style="padding: 6px 0; color: #16a34a;">Scholarship Donation:</td>
        <td style="text-align: right; color: #16a34a;">+$${scholarshipDonation.toFixed(2)}</td>
      </tr>
      `
          : ""
      }
      <tr style="border-top: 2px solid #3b82f6;">
        <td style="padding: 10px 0; font-weight: bold; font-size: 16px;">Total Amount:</td>
        <td style="padding: 10px 0; font-size: 16px; color: #3b82f6; font-weight: bold;">$${grandTotal.toFixed(2)}</td>
      </tr>
    </table>

    ${
      data.arrivalNotes
        ? `
    <h2 style="color: #1e40af; font-size: 20px; margin-top: 25px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Special Notes</h2>
    <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0;"><strong>Arrival/Departure Notes:</strong></p>
      <p style="margin: 8px 0 0 0;">${data.arrivalNotes}</p>
    </div>
    `
        : ""
    }

    ${
      data.scholarshipRequested
        ? `
    <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0; color: #991b1b;"><strong>⚠️ Scholarship Requested</strong></p>
    </div>
    `
        : ""
    }

    <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 6px; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        View full details in the <a href="https://v0-ren-demo.vercel.app/admin/registrations" style="color: #3b82f6; text-decoration: none; font-weight: bold;">Admin Dashboard</a>
      </p>
    </div>

    <p style="color: #6b7280; font-size: 12px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      This is an automated admin notification for Rendezvous 2027 registrations
    </p>
  </div>
</body>
</html>
  `
}
