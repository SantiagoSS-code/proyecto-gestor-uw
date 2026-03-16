import { TrainerForm } from "@/components/dashboard/trainers/trainer-form"

export default async function EditTrainerPage({
  params,
}: {
  params: Promise<{ trainerId: string }>
}) {
  const { trainerId } = await params
  return <TrainerForm trainerId={trainerId} />
}
