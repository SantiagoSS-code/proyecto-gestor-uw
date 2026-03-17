import { MembershipsShell } from "@/components/dashboard/memberships/memberships-shell"
import { MembershipsOverview } from "@/components/dashboard/memberships/memberships-overview"

export default function MembershipsPage() {
  return (
    <MembershipsShell>
      <MembershipsOverview />
    </MembershipsShell>
  )
}
