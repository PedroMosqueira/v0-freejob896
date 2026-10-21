// Off by default. Set the env var to "true" in Vercel (Settings > Vars) to turn a feature on.
export const FEATURES = {
  travelEstimate: process.env.NEXT_PUBLIC_FEATURE_TRAVEL_ESTIMATE === "true",
  bidExpenses: process.env.NEXT_PUBLIC_FEATURE_BID_EXPENSES === "true",
} as const
