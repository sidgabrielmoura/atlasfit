import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { storageService } from "@/lib/storage.service";
import { getAllPersonalsStorageMetrics } from "@/lib/storage-quota.service";
import { logSystemError } from "@/lib/logger";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const [bucketStats, personalsMetrics] = await Promise.all([
      storageService.getBucketStats(),
      getAllPersonalsStorageMetrics(),
    ]);

    const summary = {
      totalPersonals: personalsMetrics.length,
      warningCount: personalsMetrics.filter((p) => p.status === "WARNING").length,
      exceededCount: personalsMetrics.filter((p) => p.status === "EXCEEDED").length,
      normalCount: personalsMetrics.filter((p) => p.status === "NORMAL").length,
      totalPersonalStorageMb: personalsMetrics.reduce((acc, p) => acc + p.totalUsedMb, 0),
    };

    return NextResponse.json({
      bucketStats,
      personalsMetrics,
      summary,
    });
  } catch (error) {
    await logSystemError({ action: "GET_SUPERADMIN_STORAGE", error, entity: "STORAGE" });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
