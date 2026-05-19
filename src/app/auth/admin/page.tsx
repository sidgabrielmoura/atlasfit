import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthForm } from "@/components/auth/auth-form";

export default function AdminLoginPage() {
  return (
    <AuthLayout 
      backgroundImage="/auth-bgs/admin.png" 
      role="admin"
    >
      <AuthForm 
        type="admin"
        title="Painel de Controle"
        subtitle="Acesso restrito para administração do ecossistema AtlasFit."
      />
    </AuthLayout>
  );
}
