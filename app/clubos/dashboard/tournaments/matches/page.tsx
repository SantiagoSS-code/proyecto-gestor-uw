import { TournamentsShell } from "@/components/dashboard/tournaments/tournaments-shell"
import { MatchesManager } from "@/components/dashboard/tournaments/matches-manager"

export default function TournamentsMatchesPage() {
  return (
    <TournamentsShell>
      <MatchesManager />
    </TournamentsShell>
  )
}
