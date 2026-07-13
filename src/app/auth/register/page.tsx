import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "./register-form";
import { Suspense } from "react";

export default function TrainerRegisterPage() {
  return (
    <AuthLayout 
      backgroundImage="/auth-bgs/trainer.png" 
      role="personal"
    >
      <Suspense fallback={<div className="text-center text-sm py-4">Carregando...</div>}>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}

