import { PromotionsShell } from "@/components/dashboard/promotions/promotions-shell"
import { CampaignsManager } from "@/components/dashboard/promotions/campaigns-manager"

export default function CampaignsPage() {
  return (
    <PromotionsShell>
      <CampaignsManager />
    </PromotionsShell>
  )
}
