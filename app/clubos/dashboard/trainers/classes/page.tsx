import { Suspense } from "react"
import { TrainerClasses } from "@/components/dashboard/trainers/trainer-classes"

export default function ClassesPage() {
  return (
    <Suspense>
      <TrainerClasses />
    </Suspense>
  )
}
