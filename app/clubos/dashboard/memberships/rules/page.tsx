import { MembershipsShell } from "@/components/dashboard/memberships/memberships-shell"
import { DynamicRules } from "@/components/dashboard/memberships/dynamic-rules"

export default function MembershipsRulesPage() {
  return (
    <MembershipsShell>
      <DynamicRules />
    </MembershipsShell>
  )
}
