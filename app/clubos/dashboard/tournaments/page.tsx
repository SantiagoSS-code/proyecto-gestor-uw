import { TournamentsShell } from "@/components/dashboard/tournaments/tournaments-shell"
import { TournamentsOverview } from "@/components/dashboard/tournaments/tournaments-overview"

export default function TournamentsPage() {
  return (
    <TournamentsShell>
      <TournamentsOverview />
    </TournamentsShell>
  )
}
