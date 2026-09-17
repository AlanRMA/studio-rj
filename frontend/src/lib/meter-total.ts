/** Calcula o total por comprimento (cm) ou por quantidade e arredonda para centavos. */
export function calculateItemTotal(amount: number, unitPrice: number, isRisk: boolean): number {
  const multiplier = isRisk ? 1 / 100 : 1;
  const total = (amount || 0) * (unitPrice || 0) * multiplier;

  return Math.round((total + Number.EPSILON) * 100) / 100;
}
