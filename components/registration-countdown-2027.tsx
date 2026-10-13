"use client"

import {
  RegistrationCountdownGrid,
  RegistrationNotifySection,
  useRegistrationOpenCountdown,
} from "@/components/registration-open-countdown"

/** Closed-registration urgency band. Open state is handled by the guest hero CTA. */
export function RegistrationCountdown2027() {
  const { timeLeft, mounted, registrationOpen } = useRegistrationOpenCountdown()

  if (registrationOpen) return null

  return (
    <section
      className="section-sm border-y border-primary/20 bg-surface-lake"
      aria-labelledby="registration-countdown-heading"
    >
      <div className="site-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="registration-countdown-heading" className="text-subheading mb-6 text-on-surface">
            Registration opens January 1, 2027
          </h2>

          <RegistrationCountdownGrid
            timeLeft={timeLeft}
            mounted={mounted}
            className="mx-auto mb-8 grid max-w-[18rem] grid-cols-4 gap-2 sm:max-w-none sm:flex sm:justify-center sm:gap-4 md:gap-6"
          />

          <RegistrationNotifySection />
        </div>
      </div>
    </section>
  )
}
