import useSWR, { mutate, type SWRConfiguration } from "swr"

export const calculatorRatesKey = (year: string) => `/api/admin/calculator?year=${year}`

export const CALCULATOR_RATES_SWR_OPTIONS: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  dedupingInterval: 0,
  keepPreviousData: true,
}

export async function calculatorRatesFetcher(url: string) {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to load calculator rates")
  }
  return data
}

export function invalidateCalculatorRates() {
  return mutate(
    (key) => typeof key === "string" && key.startsWith("/api/admin/calculator?year="),
    undefined,
    { revalidate: true },
  )
}

export function useCalculatorRates<T>(year: string) {
  return useSWR<T>(calculatorRatesKey(year), calculatorRatesFetcher, CALCULATOR_RATES_SWR_OPTIONS)
}
