import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GymFeatureFlagsService } from "@/modules/workspaces/application/gym-feature-flags-service";
import { logSystemError } from "@/lib/logger";
import { gymGlobalConfigSchema } from "@/modules/workspaces/domain/gym-config";
import { z } from "zod";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { JsonRequestError, readJsonRequest } from "@/lib/http/read-json";

export const GET = withAuditedRequest(async function GET() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const configs = await GymFeatureFlagsService.getGymGlobalConfigs();
    return NextResponse.json(configs);
  } catch (error) {
    console.error("[GYM_SETTINGS_GET_ERROR]", error);
    await logSystemError({ action: "GET_SUPERADMIN_GYM_GLOBAL_CONFIGS", error, entity: "SystemSetting" });
    return NextResponse.json({ error: "Erro interno ao carregar configurações." }, { status: 500 });
  }
});

export const PATCH = withAuditedRequest(async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user?.id) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const parsed = z.object({ configs: gymGlobalConfigSchema.partial().refine(configs => Object.keys(configs).length > 0, "Informe uma alteração."), baseline: gymGlobalConfigSchema.partial(), reason: z.string().trim().max(2000).optional() }).strict().safeParse(await readJsonRequest(req, 16_384));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { configs, reason, baseline } = parsed.data;

    await GymFeatureFlagsService.updateGymGlobalConfigs(configs, session.user.id, reason, baseline);
    const updated = await GymFeatureFlagsService.getGymGlobalConfigs();

    return NextResponse.json({
      success: true,
      message: "Configurações globais de academias atualizadas com sucesso.",
      configs: updated,
    });
  } catch (error) {
    if (error instanceof JsonRequestError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    console.error("[GYM_SETTINGS_PATCH_ERROR]", error);
    await logSystemError({ action: "PATCH_SUPERADMIN_GYM_GLOBAL_CONFIGS", error, entity: "SystemSetting" });
    return NextResponse.json(
      { error: "Erro interno ao salvar configurações." },
      { status: 500 }
    );
  }
});
