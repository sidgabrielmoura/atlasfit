import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthForm } from "@/components/auth/auth-form";

export default function TrainerLoginPage() {
  return (
    <AuthLayout 
      backgroundImage="/auth-bgs/trainer.png" 
      role="personal"
    >
      <AuthForm 
        type="trainer"
        title="Área do Personal"
        subtitle="Gerencie seus alunos e prescreva treinos com agilidade."
      />
    </AuthLayout>
  );
}
