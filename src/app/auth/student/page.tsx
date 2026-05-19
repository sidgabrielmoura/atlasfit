import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthForm } from "@/components/auth/auth-form";

export default function StudentLoginPage() {
  return (
    <AuthLayout 
      backgroundImage="/auth-bgs/student.png" 
      role="aluno"
    >
      <AuthForm 
        type="student"
        title="Bora treinar?"
        subtitle="Acesse seus treinos e acompanhe sua evolução."
      />
    </AuthLayout>
  );
}
