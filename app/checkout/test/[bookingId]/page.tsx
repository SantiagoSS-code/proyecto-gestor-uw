import { Suspense } from "react"
import CheckoutTestClient from "./checkout-client"

export default function CheckoutTestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Cargando checkout…</div>}>
      <CheckoutTestClient />
    </Suspense>
  )
}
