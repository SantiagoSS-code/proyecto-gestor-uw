import { TrainerDetail } from "@/components/dashboard/trainers/trainer-detail"

export default async function TrainerDetailPage({
  params,
}: {
  params: Promise<{ trainerId: string }>
}) {
  const { trainerId } = await params
  return <TrainerDetail trainerId={trainerId} />
}
