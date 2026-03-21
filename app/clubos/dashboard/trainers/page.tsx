import { TrainersOverview } from "@/components/dashboard/trainers/trainers-overview"
import { PermissionGate } from "@/components/dashboard/permission-gate"

export default function TrainersPage() {
  return (
    <PermissionGate module="trainers">
      <TrainersOverview />
    </PermissionGate>
  )
}
