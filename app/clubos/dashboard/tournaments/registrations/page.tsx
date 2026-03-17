import { TournamentsShell } from "@/components/dashboard/tournaments/tournaments-shell"
import { RegistrationsManager } from "@/components/dashboard/tournaments/registrations-manager"

export default function TournamentsRegistrationsPage() {
  return (
    <TournamentsShell>
      <RegistrationsManager />
    </TournamentsShell>
  )
}
