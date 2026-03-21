import { TournamentsShell } from "@/components/dashboard/tournaments/tournaments-shell"
import { TournamentsOverview } from "@/components/dashboard/tournaments/tournaments-overview"
import { PermissionGate } from "@/components/dashboard/permission-gate"

export default function TournamentsPage() {
  return (
    <PermissionGate module="tournaments">
      <TournamentsShell>
        <TournamentsOverview />
      </TournamentsShell>
    </PermissionGate>
  )
}
