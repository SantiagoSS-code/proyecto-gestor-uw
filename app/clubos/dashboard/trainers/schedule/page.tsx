import { Suspense } from "react"
import { TrainerSchedule } from "@/components/dashboard/trainers/trainer-schedule"

export default function SchedulePage() {
  return (
    <Suspense>
      <TrainerSchedule />
    </Suspense>
  )
}
