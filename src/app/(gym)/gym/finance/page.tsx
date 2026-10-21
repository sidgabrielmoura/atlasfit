import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireGymWorkspaceAccess as requireWorkspaceAccess, gymInvoiceService, WorkspaceContextService } from "@/modules/workspaces";
import { getGymFinancePageData } from "@/modules/workspaces/application/gym-finance-page-data";
import { GymFinanceClient } from "./finance-client";

export const metadata = { title: "Financeiro | AtlasFit", description: "Mensalidades e recebimentos da academia" };

export default async function GymFinancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/gym");
  const workspace = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (!workspace.workspaceId) redirect("/select-workspace");
  const context = await requireWorkspaceAccess({ workspaceId: workspace.workspaceId });
  if (context.workspaceType !== "GYM") redirect("/dashboard");
  const { capabilities, students, enrollments, guardians, accounts, reportTimezone } = await getGymFinancePageData(context.workspaceId, context.userId);
  const invoices = await gymInvoiceService.listInvoices(context.workspaceId, { page: 1, limit: 20 }, context.userId);
  const payments = capabilities.includes("payments.read")
    ? await gymInvoiceService.listPayments(context.workspaceId, { page: 1, limit: 20 }, context.userId)
    : { payments: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  return <GymFinanceClient reportTimezone={reportTimezone} workspaceId={context.workspaceId} userCapabilities={capabilities} initialInvoices={invoices} initialPayments={payments} students={students.map(student => ({ id: student.id, memberId: student.id, name: student.user.name || "Aluno", email: student.user.email || "", isMinor: student.isMinor }))} enrollments={enrollments} guardians={guardians} accounts={accounts} />;
}
