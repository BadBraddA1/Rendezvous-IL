import { Webhook } from "svix"
import { headers } from "next/headers"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { sql } from "@/lib/db"

export async function POST(req: Request) {
  // Get the webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error("[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET")
    return new Response("Missing webhook secret", { status: 500 })
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error("[Clerk Webhook] Error verifying webhook:", err)
    return new Response("Error verifying webhook", { status: 400 })
  }

  // Handle the webhook event
  const eventType = evt.type

  if (eventType === "user.created") {
    // New user signed up - try to link to existing family
    const { id, email_addresses, first_name, last_name } = evt.data
    const primaryEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address

    if (primaryEmail) {
      console.log(`[Clerk Webhook] New user created: ${primaryEmail}`)

      try {
        // Check if there's a family with this email that isn't already linked
        const [family] = await sql`
          SELECT id, family_last_name 
          FROM families 
          WHERE LOWER(email) = LOWER(${primaryEmail})
          AND clerk_user_id IS NULL
          LIMIT 1
        `

        if (family) {
          // Link the family to this Clerk user
          await sql`
            UPDATE families 
            SET clerk_user_id = ${id}, updated_at = NOW()
            WHERE id = ${family.id}
          `
          console.log(`[Clerk Webhook] Linked user ${id} to family ${family.id} (${family.family_last_name})`)
        } else {
          // Also check registrations table for matching email
          const [registration] = await sql`
            SELECT family_last_name, email
            FROM registrations
            WHERE LOWER(email) = LOWER(${primaryEmail})
            ORDER BY created_at DESC
            LIMIT 1
          `

          if (registration) {
            // Create a new family record and link it
            const [newFamily] = await sql`
              INSERT INTO families (
                family_last_name, 
                email, 
                clerk_user_id,
                created_at,
                updated_at
              )
              VALUES (
                ${registration.family_last_name},
                ${primaryEmail},
                ${id},
                NOW(),
                NOW()
              )
              RETURNING id
            `
            console.log(`[Clerk Webhook] Created new family ${newFamily.id} for user ${id}`)
          } else {
            console.log(`[Clerk Webhook] No matching family/registration found for ${primaryEmail}`)
          }
        }
      } catch (error) {
        console.error("[Clerk Webhook] Error linking family:", error)
        // Don't fail the webhook - user is still created
      }
    }

    return new Response("User created webhook processed", { status: 200 })
  }

  if (eventType === "user.updated") {
    // User updated their email - try to link to family if not already linked
    const { id, email_addresses } = evt.data
    const primaryEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address

    if (primaryEmail) {
      try {
        // Check if user is already linked to a family
        const [existingLink] = await sql`
          SELECT id FROM families WHERE clerk_user_id = ${id} LIMIT 1
        `

        if (!existingLink) {
          // Try to link by new email
          const [family] = await sql`
            SELECT id, family_last_name 
            FROM families 
            WHERE LOWER(email) = LOWER(${primaryEmail})
            AND clerk_user_id IS NULL
            LIMIT 1
          `

          if (family) {
            await sql`
              UPDATE families 
              SET clerk_user_id = ${id}, updated_at = NOW()
              WHERE id = ${family.id}
            `
            console.log(`[Clerk Webhook] Linked user ${id} to family ${family.id} on email update`)
          }
        }
      } catch (error) {
        console.error("[Clerk Webhook] Error on user update:", error)
      }
    }

    return new Response("User updated webhook processed", { status: 200 })
  }

  if (eventType === "user.deleted") {
    // User deleted - unlink from family
    const { id } = evt.data

    if (id) {
      try {
        await sql`
          UPDATE families 
          SET clerk_user_id = NULL, updated_at = NOW()
          WHERE clerk_user_id = ${id}
        `
        console.log(`[Clerk Webhook] Unlinked deleted user ${id} from family`)
      } catch (error) {
        console.error("[Clerk Webhook] Error unlinking deleted user:", error)
      }
    }

    return new Response("User deleted webhook processed", { status: 200 })
  }

  // Return success for unhandled event types
  return new Response("Webhook received", { status: 200 })
}
