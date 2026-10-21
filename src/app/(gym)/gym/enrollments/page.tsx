import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  requireGymWorkspaceAccess,
  gymEnrollmentService,
  gymPlanService,
  gymStudentService,
  WorkspaceContextService,
} from "@/modules/workspaces"
import { GymEnrollmentsClient } from "./enrollments-client"
import prisma from "@/lib/prisma"
import { getGymUnitAccess } from "@/modules/workspaces/application/gym-unit-access"

export const metadata = {
  title: "Matrículas & Contratos | AtlasFit Gym",
  description: "Gestão do ciclo de vida das matrículas, contratos eletrônicos e acesso à academia",
}

export default async function GymEnrollmentsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/gym")
  }

  const wsContext = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id)
  if (wsContext.status !== "RESOLVED" || !wsContext.workspaceId) {
    redirect("/select-workspace")
  }

  const context = await requireGymWorkspaceAccess({
    workspaceId: wsContext.workspaceId,
  })
  const scope = await getGymUnitAccess(prisma, context.workspaceId, context.userId, "enrollments.read")

  if (context.workspaceType !== "GYM") {
    redirect("/dashboard")
  }

  const [enrollmentsData, plans, studentsData] = await Promise.all([
    gymEnrollmentService.listEnrollments(context.workspaceId, {
      page: 1,
      limit: 20,
    }, context.userId),
    gymPlanService.listPlans(context.workspaceId, undefined, context.userId),
    gymStudentService.listStudents({
      workspaceId: context.workspaceId,
      actorContext: context,
      page: 1,
      limit: 20,
      status: "ACTIVE",
    }),
  ])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <GymEnrollmentsClient
        workspaceId={context.workspaceId}
        initialData={enrollmentsData}
        catalogPlans={plans}
        students={studentsData.students}
        canApproveChange={scope.units.some(unit => unit.canApproveChanges) || (scope.includeUnassigned && context.hasCapability("workspace.manage"))}
        canManage={scope.units.some(unit => unit.canManageEnrollments) || (scope.includeUnassigned && context.hasCapability("enrollments.manage"))}
      />
    </div>
  )
}
