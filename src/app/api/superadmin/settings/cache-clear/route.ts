import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { revalidateTag } from "next/cache";
import { invalidatePublicPlatformSettings, invalidatePublicExerciseCatalog, invalidateMuscleGroups } from "@/lib/cache/public-data";

export async function POST() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Clear global superadmin tags
    revalidateTag("superadmin", "max");
    invalidatePublicPlatformSettings();
    invalidatePublicExerciseCatalog();
    invalidateMuscleGroups();
    
    return NextResponse.json({ success: true, message: "Cache global revalidado com sucesso" });
  } catch (error) {
    console.error("[CACHE_CLEAR_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
