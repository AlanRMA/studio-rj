/** Converte centímetros em metros e arredonda o preço para centavos. */
export function calculateMeterTotal(centimeters: number, pricePerMeter: number): number {
  return Math.round(((centimeters || 0) * (pricePerMeter || 0) / 100 + Number.EPSILON) * 100) / 100;
}
