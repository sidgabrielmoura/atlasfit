import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { requireWorkspaceAccess, gymPlanService, WorkspaceContextService } from "@/modules/workspaces"
import { GymPlansClient } from "./plans-client"

export const metadata = {
  title: "Planos | AtlasFit Gym",
  description: "Gestão de planos, valores e condições de matrícula",
}

export default async function GymPlansPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/gym")
  }

  const wsContext = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id)
  if (wsContext.status !== "RESOLVED" || !wsContext.workspaceId) {
    redirect("/select-workspace")
  }

  const context = await requireWorkspaceAccess({
    workspaceId: wsContext.workspaceId,
  })

  if (context.workspaceType !== "GYM") {
    redirect("/dashboard")
  }

  const data = await gymPlanService.listPlanPage(context.workspaceId, {
    includeInactive: true,
  }, context.userId)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <GymPlansClient
        workspaceId={context.workspaceId}
        initialPlans={data.plans}
        initialPagination={data.pagination}
        canManage={context.hasCapability("enrollments.manage")}
      />
    </div>
  )
}
