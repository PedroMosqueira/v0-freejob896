import { describe, expect, it } from "vitest"
import { calculateDistance, formatDistance } from "@/lib/calculate-distance"
import { formatAlertDistance, isAlertRadius } from "@/lib/nearby-alerts"

const SAO_PAULO = { lat: -23.5505, lng: -46.6333 }
const RIO = { lat: -22.9068, lng: -43.1729 }
const SAO_BORJA = { lat: -28.6603, lng: -56.0047 }

describe("cálculo de distância", () => {
  it("é zero para o mesmo ponto", () => {
    expect(calculateDistance(SAO_PAULO.lat, SAO_PAULO.lng, SAO_PAULO.lat, SAO_PAULO.lng)).toBe(0)
  })

  it("acerta São Paulo–Rio (cerca de 360 km em linha reta)", () => {
    const km = calculateDistance(SAO_PAULO.lat, SAO_PAULO.lng, RIO.lat, RIO.lng)
    expect(km).toBeGreaterThan(350)
    expect(km).toBeLessThan(365)
  })

  it("é simétrico", () => {
    const ida = calculateDistance(SAO_BORJA.lat, SAO_BORJA.lng, RIO.lat, RIO.lng)
    const volta = calculateDistance(RIO.lat, RIO.lng, SAO_BORJA.lat, SAO_BORJA.lng)
    expect(ida).toBeCloseTo(volta, 6)
  })

  it("trata 0,4° de latitude como dentro de 50 km e 1° como fora", () => {
    expect(calculateDistance(SAO_BORJA.lat, SAO_BORJA.lng, SAO_BORJA.lat + 0.4, SAO_BORJA.lng)).toBeLessThan(50)
    expect(calculateDistance(SAO_BORJA.lat, SAO_BORJA.lng, SAO_BORJA.lat + 1, SAO_BORJA.lng)).toBeGreaterThan(100)
  })
})

describe("formatação de distância", () => {
  it("mostra 'nas proximidades' abaixo de 1 km na lista", () => {
    expect(formatDistance(0.4)).toBe("nas proximidades")
    expect(formatDistance(12.34)).toBe("12.3 km")
  })

  it("arredonda a distância nos avisos", () => {
    expect(formatAlertDistance(0.3)).toBe("a menos de 1 km")
    expect(formatAlertDistance(7.6)).toBe("a 8 km")
  })
})

describe("raios permitidos nos avisos", () => {
  it("aceita só 10, 25, 50 e 100 km", () => {
    for (const ok of [10, 25, 50, 100]) expect(isAlertRadius(ok)).toBe(true)
    for (const bad of [0, 5, 49.9, 1000, -10, "50", null, undefined, Number.NaN]) expect(isAlertRadius(bad)).toBe(false)
  })
})
