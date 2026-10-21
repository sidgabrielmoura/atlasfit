import { StudentProfileView } from "@/components/students/student-profile-view";

interface GymStudentProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function GymStudentProfilePage({ params }: GymStudentProfilePageProps) {
  const { id } = await params;

  return (
    <StudentProfileView
      studentId={id}
      variant="gym"
      basePath="/gym/students"
      apiBase="/api/gym/students"
      workoutsApiBase="/api/gym/workouts"
      paymentsApiBase="/api/gym/finance/payments"
      chatBasePath="/gym/chat"
    />
  );
}
