"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkoutExecutionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student/workouts");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm font-semibold">
      Redirecionando para a central de treinos...
    </div>
  );
}
