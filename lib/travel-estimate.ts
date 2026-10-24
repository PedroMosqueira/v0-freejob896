/**
 * Ride fare estimate for the professional's trip to the job.
 *
 * Uber's price API (/v1.2/estimates/price, Guest Rides) is only available to approved
 * business partners and 99 has no public API, so the default provider is a local formula
 * calibrated to typical UberX/99Pop fares. A partner API can replace it behind the same
 * `TravelEstimate` shape once access is granted.
 */

export interface TravelEstimate {
  min: number
  max: number
  roadKm: number
  minutes: number
  source: "formula" | "uber" | "routes"
}

interface FareTable {
  base: number
  perKm: number
  perMinute: number
  minimumFare: number
  /** Straight-line distance understates real road distance in cities. */
  roadFactor: number
  averageSpeedKmh: number
  /** Spread to cover dynamic pricing and traffic. */
  surgeLow: number
  surgeHigh: number
}

// Approximate popular-category fares in Brazilian capitals. Adjust per region if needed.
export const DEFAULT_FARE_TABLE: FareTable = {
  base: 2.5,
  perKm: 1.45,
  perMinute: 0.3,
  minimumFare: 7.5,
  roadFactor: 1.35,
  averageSpeedKmh: 24,
  surgeLow: 0.9,
  surgeHigh: 1.35,
}

const MAX_ESTIMATE_KM = 80

export function estimateTravelCost(
  straightLineKm: number | null | undefined,
  fares: FareTable = DEFAULT_FARE_TABLE,
): TravelEstimate | null {
  if (straightLineKm == null || !Number.isFinite(straightLineKm) || straightLineKm < 0) return null
  if (straightLineKm > MAX_ESTIMATE_KM) return null

  const roadKm = straightLineKm * fares.roadFactor
  const minutes = (roadKm / fares.averageSpeedKmh) * 60
  const fare = Math.max(fares.minimumFare, fares.base + roadKm * fares.perKm + minutes * fares.perMinute)

  // Round trip: the professional needs to get there and back.
  const roundTrip = fare * 2
  return {
    min: roundToHalf(roundTrip * fares.surgeLow),
    max: roundToHalf(roundTrip * fares.surgeHigh),
    roadKm: Math.round(roadKm * 10) / 10,
    minutes: Math.round(minutes),
    source: "formula",
  }
}

export function suggestedTravelExpense(estimate: TravelEstimate | null): number {
  if (!estimate) return 0
  return roundToHalf((estimate.min + estimate.max) / 2)
}

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2
}
