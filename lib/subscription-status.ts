// Statuses that grant paid-plan access. Existing rows in `user_subscriptions`
// use "plan" for paid subscriptions (and "free" for the free tier), while the
// Stripe webhooks write "active"/"trialing". All of them must be honored.
export const PAID_SUBSCRIPTION_STATUSES = ["active", "trialing", "plan"] as const

export function isPaidSubscriptionStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return (PAID_SUBSCRIPTION_STATUSES as readonly string[]).includes(status.trim().toLowerCase())
}

export function isSubscriptionExpired(currentPeriodEnd: string | null | undefined, now = new Date()): boolean {
  if (!currentPeriodEnd) return false
  return new Date(currentPeriodEnd) <= now
}
