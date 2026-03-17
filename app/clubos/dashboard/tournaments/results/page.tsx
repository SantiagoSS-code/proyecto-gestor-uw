import { TournamentsShell } from "@/components/dashboard/tournaments/tournaments-shell"
import { ResultsBrackets } from "@/components/dashboard/tournaments/results-brackets"

export default function TournamentsResultsPage() {
  return (
    <TournamentsShell>
      <ResultsBrackets />
    </TournamentsShell>
  )
}
