import { PromotionsShell } from "@/components/dashboard/promotions/promotions-shell"
import { AiRecommendations } from "@/components/dashboard/promotions/ai-recommendations"

export default function AiPage() {
  return (
    <PromotionsShell>
      <AiRecommendations />
    </PromotionsShell>
  )
}
