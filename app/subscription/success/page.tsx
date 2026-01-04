import { Suspense } from "react"
import { SubscriptionSuccessContent } from "./subscription-success-content"

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <SubscriptionSuccessContent />
    </Suspense>
  )
}
