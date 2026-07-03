import { buildAppleAppSiteAssociation } from "@/lib/deep-links";

export function GET() {
  return Response.json(buildAppleAppSiteAssociation(), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
