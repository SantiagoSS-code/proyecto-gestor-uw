import { Suspense } from "react"
import BookingPendingClient from "./pending-client"

export default function BookingPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BookingPendingClient />
    </Suspense>
  )
}
