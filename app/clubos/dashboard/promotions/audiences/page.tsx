import { PromotionsShell } from "@/components/dashboard/promotions/promotions-shell"
import { AudiencesManager } from "@/components/dashboard/promotions/audiences-manager"

export default function AudiencesPage() {
  return (
    <PromotionsShell>
      <AudiencesManager />
    </PromotionsShell>
  )
}
