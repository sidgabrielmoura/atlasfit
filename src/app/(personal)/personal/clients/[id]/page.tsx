import { StudentProfileView } from "@/components/students/student-profile-view";

interface ClientProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProfilePage({ params }: ClientProfilePageProps) {
  const { id } = await params;

  return (
    <StudentProfileView
      studentId={id}
      variant="personal"
      basePath="/personal/clients"
      apiBase="/api/personal/clients"
      workoutsApiBase="/api/personal/workouts"
      paymentsApiBase="/api/personal/finance/payments"
      chatBasePath="/personal/chat"
    />
  );
}
