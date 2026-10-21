import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { assertGymPersonalAffiliation } from "@/modules/workspaces/application/personal-affiliation";
import GymStudentsPage from "@/app/(gym)/gym/students/page";
import GymWorkoutsPage from "@/app/(gym)/gym/workouts/page";
import CalendarPage from "@/app/(personal)/personal/calendar/page";

export default async function AffiliatedPersonalPage({ searchParams }: { searchParams: Promise<{ view?: string; search?: string; goal?: string; difficulty?: string; page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/trainer");
  const context = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
  if (!context.workspaceId || context.workspaceType !== "GYM") redirect("/select-workspace");
  await assertGymPersonalAffiliation(context.workspaceId, session.user.id);
  const params = await searchParams;
  if (params.view === "calendar") return <CalendarPage />;
  if (params.view === "workouts") return <div className="p-4 md:p-8"><GymWorkoutsPage searchParams={Promise.resolve({ search: params.search, goal: params.goal, difficulty: params.difficulty, page: params.page })} /></div>;
  return <div className="p-4 md:p-8"><GymStudentsPage /></div>;
}
