import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "./register-form";

export default function TrainerRegisterPage() {
  return (
    <AuthLayout 
      backgroundImage="/auth-bgs/trainer.png" 
      role="personal"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
