import { describe, expect, it } from "vitest"
import { calculateDistance, formatDistance } from "@/lib/calculate-distance"
import { ALERT_RADIUS_KM, formatAlertDistance, isValidCoordinate, roundCoordinate } from "@/lib/nearby-alerts"

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

  it("mostra metros abaixo de 1 km e uma casa decimal acima nos avisos", () => {
    expect(formatAlertDistance(0.34)).toBe("a 300 m")
    expect(formatAlertDistance(0.02)).toBe("a 100 m")
    expect(formatAlertDistance(2.46)).toBe("a 2,5 km")
    expect(formatAlertDistance(3)).toBe("a 3 km")
  })
})

describe("avisos de proximidade", () => {
  it("usa raio fixo de 3 km", () => {
    expect(ALERT_RADIUS_KM).toBe(3)
    expect(calculateDistance(SAO_BORJA.lat, SAO_BORJA.lng, SAO_BORJA.lat + 0.025, SAO_BORJA.lng)).toBeLessThan(ALERT_RADIUS_KM)
    expect(calculateDistance(SAO_BORJA.lat, SAO_BORJA.lng, SAO_BORJA.lat + 0.03, SAO_BORJA.lng)).toBeGreaterThan(ALERT_RADIUS_KM)
  })

  it("valida coordenadas", () => {
    expect(isValidCoordinate(-28.66, -56.0)).toBe(true)
    for (const [lat, lng] of [[91, 0], [0, 181], [Number.NaN, 0], ["-28", -56], [null, null]]) {
      expect(isValidCoordinate(lat, lng)).toBe(false)
    }
  })

  it("guarda a localização com precisão de ~110 m", () => {
    expect(roundCoordinate(-28.661234)).toBe(-28.661)
    expect(roundCoordinate(-56.004567)).toBe(-56.005)
  })
})
