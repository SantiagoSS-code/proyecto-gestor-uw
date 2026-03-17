import { TournamentsShell } from "@/components/dashboard/tournaments/tournaments-shell"
import { TournamentsSettings } from "@/components/dashboard/tournaments/tournaments-settings"

export default function TournamentsSettingsPage() {
  return (
    <TournamentsShell>
      <TournamentsSettings />
    </TournamentsShell>
  )
}
