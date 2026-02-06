import { Suspense } from "react"
import CourtsTabsClient from "./courts-tabs-client"

export default function CourtsPage() {
  return (
    <Suspense fallback={null}>
      <CourtsTabsClient />
    </Suspense>
  )
}
