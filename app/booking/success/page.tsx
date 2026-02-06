import { Suspense } from "react"
import BookingSuccessClient from "./success-client"

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BookingSuccessClient />
    </Suspense>
  )
}
