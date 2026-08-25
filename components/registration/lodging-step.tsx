"use client"

import { useEffect, useMemo, useState } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Home, Tent, Caravan } from "lucide-react"
import {
  calculateLodgingCost,
  lodgingAdultRate,
  lodgingPriceReference,
  REGISTRATION_SITE_NIGHTS,
  type LodgingRatesByCategory,
} from "@/lib/lodging-cost"
import type { RegistrationData, LodgingType } from "@/types/registration"
import { formatMoney } from "@/lib/rate-display"

type Props = {
  data: RegistrationData
  updateData: (updates: Partial<RegistrationData>) => void
  /** Event-year rate chart (e.g. 2027). Fetched automatically when omitted. */
  rates?: LodgingRatesByCategory | null
  ratesYear?: number
}

export function LodgingStep({ data, updateData, rates: ratesProp, ratesYear = 2027 }: Props) {
  const [rates, setRates] = useState<LodgingRatesByCategory | null | undefined>(ratesProp)

  useEffect(() => {
    if (ratesProp !== undefined) {
      setRates(ratesProp)
      return
    }

    let cancelled = false
    async function loadRates() {
      try {
        const response = await fetch(`/api/rates?year=${ratesYear}`, { cache: "no-store" })
        if (!response.ok) return
        const payload = await response.json()
        if (!cancelled) setRates(payload.rates ?? null)
      } catch {
        if (!cancelled) setRates(null)
      }
    }
    void loadRates()
    return () => {
      cancelled = true
    }
  }, [ratesProp, ratesYear])

  useEffect(() => {
    const { total, updatedMembers } = calculateLodgingCost(
      data.lodgingType,
      data.familyMembers,
      rates,
    )
    updateData({ lodgingTotal: total, familyMembers: updatedMembers })
  }, [data.lodgingType, data.familyMembers.map((m) => m.age).join(","), rates])

  const { total, siteFee } = useMemo(
    () => calculateLodgingCost(data.lodgingType, data.familyMembers, rates),
    [data.lodgingType, data.familyMembers, rates],
  )
  const reference = lodgingPriceReference(data.lodgingType, rates)
  const adultCampRate = lodgingAdultRate(data.lodgingType, rates)
  const rvSite = lodgingPriceReference("rv", rates)
  const tentSite = lodgingPriceReference("tent", rates)

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        All fees include 4 nights lodging (May 4–8), 12 meals, and basic recreation. Prices use the{" "}
        {ratesYear} rate chart.
      </p>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Select lodging
        </h3>
        <RadioGroup
          value={data.lodgingType}
          onValueChange={(value) => updateData({ lodgingType: value as LodgingType })}
        >
          <div>
            <label
              htmlFor="motel-2queen-bunk"
              className="reg-quiet-desk__choice"
              data-selected={data.lodgingType === "motel-2queen-bunk"}
            >
              <RadioGroupItem value="motel-2queen-bunk" id="motel-2queen-bunk" className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Home className="reg-quiet-desk__choice-icon h-4 w-4" aria-hidden="true" />
                  <span className="font-medium">Motel: 2 Queen Beds + 1 Bunk Bed</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sleeps 6 comfortably. Air conditioning, private bathroom. If your family size is 7
                  or more, an additional connected room will be provided.
                </p>
              </div>
            </label>

            <label
              htmlFor="motel-1queen-2bunk"
              className="reg-quiet-desk__choice"
              data-selected={data.lodgingType === "motel-1queen-2bunk"}
            >
              <RadioGroupItem value="motel-1queen-2bunk" id="motel-1queen-2bunk" className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Home className="reg-quiet-desk__choice-icon h-4 w-4" aria-hidden="true" />
                  <span className="font-medium">Motel: 1 Queen Bed + 2 Bunk Beds</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sleeps 6 comfortably. Air conditioning, private bathroom. If your family size is 7
                  or more, an additional connected room will be provided.
                </p>
              </div>
            </label>

            <label
              htmlFor="rv"
              className="reg-quiet-desk__choice"
              data-selected={data.lodgingType === "rv"}
            >
              <RadioGroupItem value="rv" id="rv" className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Caravan className="reg-quiet-desk__choice-icon h-4 w-4" aria-hidden="true" />
                  <span className="font-medium">RV Site</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  ${formatMoney(rvSite.siteNight)}/night × {REGISTRATION_SITE_NIGHTS} nights = $
                  {formatMoney(rvSite.siteTotal)}. Bring your own RV.
                </p>
              </div>
            </label>

            <label
              htmlFor="tent"
              className="reg-quiet-desk__choice"
              data-selected={data.lodgingType === "tent"}
            >
              <RadioGroupItem value="tent" id="tent" className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Tent className="reg-quiet-desk__choice-icon h-4 w-4" aria-hidden="true" />
                  <span className="font-medium">Tent Camping</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  ${formatMoney(tentSite.siteNight)}/night × {REGISTRATION_SITE_NIGHTS} nights = $
                  {formatMoney(tentSite.siteTotal)}. Bring your own tent.
                </p>
              </div>
            </label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="mb-1 font-display text-subheading">Lodging cost</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Based on your family size and ages ({ratesYear} rates)
        </p>
        <dl className="reg-quiet-desk__fact-list">
          {data.familyMembers
            .filter((m) => m.age >= 0 && m.personCost !== undefined)
            .map((member, index) => (
              <div key={member.id}>
                <dt>
                  {member.firstName || `Person ${index + 1}`}{" "}
                  {member.age >= 18 ? "(Adult)" : `(Age ${member.age})`}
                </dt>
                <dd>${formatMoney(member.personCost ?? 0)}</dd>
              </div>
            ))}
          {(data.lodgingType === "rv" || data.lodgingType === "tent") && siteFee > 0 ? (
            <div>
              <dt>
                {data.lodgingType === "rv" ? "RV" : "Tent"} site ({REGISTRATION_SITE_NIGHTS} nights)
              </dt>
              <dd>${formatMoney(siteFee)}</dd>
            </div>
          ) : null}
        </dl>
        <dl className="reg-quiet-desk__fact-total">
          <dt>Lodging total</dt>
          <dd>${formatMoney(total)}</dd>
        </dl>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Pricing reference</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          {data.lodgingType.startsWith("motel") && (
            <div>
              <p className="font-medium text-foreground">Motel (per person)</p>
              <ul className="mt-1 space-y-1">
                <li>Single occupancy: ${formatMoney(reference.single)}</li>
                <li>Double occupancy: ${formatMoney(reference.double)} each</li>
                <li>Triple occupancy: ${formatMoney(reference.triple)} each</li>
                <li>Quad+ occupancy: ${formatMoney(reference.quad)} each</li>
                <li>Ages 12–17: ${formatMoney(reference.youth)}</li>
                <li>Ages 6–11: ${formatMoney(reference.child)}</li>
                <li>Ages 0–5: free</li>
              </ul>
            </div>
          )}
          {data.lodgingType === "rv" && (
            <div>
              <p className="font-medium text-foreground">RV</p>
              <ul className="mt-1 space-y-1">
                <li>Ages 18+: ${formatMoney(adultCampRate)} per person</li>
                <li>Ages 12–17: ${formatMoney(reference.youth)} per person</li>
                <li>Ages 6–11: ${formatMoney(reference.child)} per person</li>
                <li>Ages 0–5: free</li>
                <li>
                  Site: ${formatMoney(reference.siteNight)}/night × {REGISTRATION_SITE_NIGHTS} = $
                  {formatMoney(reference.siteTotal)}
                </li>
              </ul>
            </div>
          )}
          {data.lodgingType === "tent" && (
            <div>
              <p className="font-medium text-foreground">Tent</p>
              <ul className="mt-1 space-y-1">
                <li>Ages 18+: ${formatMoney(adultCampRate)} per person</li>
                <li>Ages 12–17: ${formatMoney(reference.youth)} per person</li>
                <li>Ages 6–11: ${formatMoney(reference.child)} per person</li>
                <li>Ages 0–5: free</li>
                <li>
                  Site: ${formatMoney(reference.siteNight)}/night × {REGISTRATION_SITE_NIGHTS} = $
                  {formatMoney(reference.siteTotal)}
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
