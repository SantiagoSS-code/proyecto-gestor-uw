import { Suspense } from "react"
import CentersClient from "./centros-client"

export default function CentersSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CentersClient />
    </Suspense>
  )
}
