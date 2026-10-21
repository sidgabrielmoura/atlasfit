import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthForm } from "@/components/auth/auth-form";
import { gymInvitationReturn } from "@/lib/auth/invitation-return";

export default async function StudentLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const returnTo = gymInvitationReturn((await searchParams).callbackUrl) ?? undefined;
  return (
    <AuthLayout 
      backgroundImage="/auth-bgs/student.png" 
      role="aluno"
    >
      <AuthForm 
        type="student"
        returnTo={returnTo}
        title="Bora treinar?"
        subtitle="Acesse seus treinos e acompanhe sua evolução."
      />
    </AuthLayout>
  );
}
