import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthForm } from "@/components/auth/auth-form";
import { gymInvitationReturn } from "@/lib/auth/invitation-return";

export default async function GymLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const returnTo = gymInvitationReturn((await searchParams).callbackUrl) ?? undefined;
  return (
    <AuthLayout 
      backgroundImage="/auth-bgs/trainer.png" 
      role="academia"
    >
      <AuthForm 
        type="gym"
        returnTo={returnTo}
        title="Portal da Academia"
        subtitle="Acesse a gestão da sua academia e alunos."
      />
    </AuthLayout>
  );
}
