import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { storageService } from "@/lib/storage.service";
import { getPersonalStorageDashboard } from "@/lib/personal-storage-dashboard";
import { personalStorageQuerySchema } from "@/modules/workspaces/domain/personal-storage";
import { logSystemError } from "@/lib/logger";

async function handleGET(request: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const parameters = new URL(request.url).searchParams;
    if ([...parameters.keys()].some(key => parameters.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    const parsed = personalStorageQuerySchema.safeParse(Object.fromEntries(parameters));
    if (!parsed.success) return NextResponse.json({ error: "Filtros de armazenamento inválidos." }, { status: 400 });
    const [bucketStats, dashboard] = await Promise.all([
      parsed.data.includeBucket === "true" ? storageService.getBucketStats() : Promise.resolve(null),
      getPersonalStorageDashboard(parsed.data),
    ]);
    return NextResponse.json({
      bucketStats,
      ...dashboard,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    await logSystemError({ action: "GET_SUPERADMIN_STORAGE", error, entity: "STORAGE" });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
