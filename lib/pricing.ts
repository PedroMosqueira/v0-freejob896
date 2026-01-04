/**
 * Minimum bid amount in BRL
 */
export const MINIMUM_BID_AMOUNT = 50.0
export const MINIMUM_BID = MINIMUM_BID_AMOUNT // Alias for compatibility

/**
 * Format currency in BRL
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)
}

/**
 * Validate bid amount
 */
export function validateBidAmount(amount: number): { valid: boolean; error?: string } {
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: "O valor do lance deve ser maior que zero" }
  }

  if (amount < MINIMUM_BID_AMOUNT) {
    return {
      valid: false,
      error: `O valor mínimo do lance é ${formatCurrency(MINIMUM_BID_AMOUNT)}`,
    }
  }

  return { valid: true }
}
