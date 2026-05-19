import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/student");
  }

  const role = (session.user as any).role as string | undefined;

  if (role === "SUPERADMIN") {
    redirect("/superadmin/dashboard");
  } else if (role === "TRAINER") {
    redirect("/personal/dashboard");
  } else if (role === "STUDENT") {
    redirect("/student/dashboard");
  } else {
    redirect("/auth/student");
  }
}
