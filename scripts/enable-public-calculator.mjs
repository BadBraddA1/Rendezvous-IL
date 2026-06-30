import { createClient } from "@libsql/client"

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  console.error("TURSO_DATABASE_URL is not set")
  process.exit(1)
}

const client = createClient({ url, authToken })

await client.execute({
  sql: `INSERT INTO app_settings (key, value, updated_at)
        VALUES ('public_calculator_enabled', 'true', CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = CURRENT_TIMESTAMP`,
})

const result = await client.execute(
  `SELECT value, updated_at FROM app_settings WHERE key = 'public_calculator_enabled'`,
)
console.log("public_calculator_enabled:", result.rows[0])
