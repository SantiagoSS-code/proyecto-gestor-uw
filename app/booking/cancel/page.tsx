import { Suspense } from "react"
import BookingCancelClient from "./cancel-client"

export default function BookingCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BookingCancelClient />
    </Suspense>
  )
}
