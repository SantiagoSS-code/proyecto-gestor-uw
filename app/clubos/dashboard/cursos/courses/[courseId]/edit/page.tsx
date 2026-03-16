import { CourseWizard } from "@/components/dashboard/courses/course-wizard"

interface Props {
  params: Promise<{ courseId: string }>
}

export default async function EditCoursePage({ params }: Props) {
  const { courseId } = await params
  return <CourseWizard courseId={courseId} />
}
