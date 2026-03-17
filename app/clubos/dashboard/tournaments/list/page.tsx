import { TournamentsShell } from "@/components/dashboard/tournaments/tournaments-shell"
import { TournamentsList } from "@/components/dashboard/tournaments/tournaments-list"

export default function TournamentsListPage() {
  return (
    <TournamentsShell>
      <TournamentsList />
    </TournamentsShell>
  )
}
