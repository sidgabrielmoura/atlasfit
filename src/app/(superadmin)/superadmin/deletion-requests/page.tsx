import { redirect } from "next/navigation";

export default function DeletionRequestsRedirectPage() {
  redirect("/superadmin/users#solicitacoes-exclusao");
}
