import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const metadata = {
  title: "Privacy Policy | Rendezvous IL",
  description: "Privacy policy for Rendezvous IL registration and website.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: April 2026</p>

        <div className="space-y-10 text-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold">Overview</h2>
            <p className="leading-relaxed text-muted-foreground">
              Rendezvous IL is a family reunion event organized by Stephen and Ranae Bradd. This privacy policy
              explains what personal information we collect during registration, how we use it, and how we protect it.
              We take your privacy seriously and will never sell or share your data with third parties for marketing
              purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Information We Collect</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              During the registration process, we collect the following information:
            </p>
            <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
              <li>Family and individual names</li>
              <li>Mailing address (street, city, state, zip)</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>T-shirt sizes and lodging preferences</li>
              <li>Dietary restrictions or special needs (if provided)</li>
              <li>Payment amount and registration fee tier</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">How We Use Your Information</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">Your information is used solely to:</p>
            <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
              <li>Process and confirm your registration for Rendezvous IL</li>
              <li>Send you event-related communications and updates</li>
              <li>Coordinate lodging, meals, and activities</li>
              <li>Display your family&apos;s location on the attendee map (last name and city/state only)</li>
              <li>Generate name badges and attendance lists for the event</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">The Attendee Map</h2>
            <p className="leading-relaxed text-muted-foreground">
              Registered families are shown on a map at <strong>/map2026</strong>. This map displays your family last
              name, contact name, address, email, and family member names to other registered attendees. This map is
              intended for use by Rendezvous participants only. If you have concerns about your information appearing on
              the map, please contact us directly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Data Storage & Security</h2>
            <p className="leading-relaxed text-muted-foreground">
              Registration data is stored securely in a hosted database. We use industry-standard security practices to
              protect your information. Only authorized event organizers have access to the full registration data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Data Retention</h2>
            <p className="leading-relaxed text-muted-foreground">
              Registration data will be retained for the duration of the event planning period and for a reasonable
              time afterward for record-keeping purposes. We do not retain your data indefinitely.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Your Rights</h2>
            <p className="leading-relaxed text-muted-foreground">
              You have the right to request access to, correction of, or deletion of your personal information at any
              time. To make such a request, please contact us using the information below.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Contact Us</h2>
            <p className="mb-2 leading-relaxed text-muted-foreground">
              If you have any questions about this privacy policy or how your data is handled, please reach out:
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
              <p className="font-medium">Stephen &amp; Ranae Bradd</p>
              <p className="text-muted-foreground">8754 Sunset Rd, Clinton, IL 61727</p>
              <p className="text-muted-foreground">(217) 935-5058</p>
              <a href="mailto:Stephen@Bradd.us" className="text-primary hover:underline">
                Stephen@Bradd.us
              </a>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
