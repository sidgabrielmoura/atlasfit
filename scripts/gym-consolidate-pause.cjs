const fs = require('node:fs');
const file = 'src/modules/workspaces/application/enrollment-service.ts';
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('import { pauseGymEnrollment, resumeGymEnrollment }')) source = source.replace('import { processLocalEnrollmentClosures }', 'import { pauseGymEnrollment, resumeGymEnrollment } from "./enrollment-pause";\nimport { processLocalEnrollmentClosures }');
const begin = source.indexOf('  async pauseEnrollment(input: PauseEnrollmentInput) {');
const end = source.indexOf('  /**\n   * Cancelamento de matrícula', begin);
const endCRLF = source.indexOf('  /**\r\n   * Cancelamento de matrícula', begin);
const boundary = end === -1 ? endCRLF : end;
if (begin === -1 || boundary === -1) throw new Error('Limites do facade não encontrados.');
source = source.slice(0, begin) + '  async pauseEnrollment(input: PauseEnrollmentInput) { return GymEnrollmentService.serializeEnrollment(await pauseGymEnrollment(input)); }\n\n  async resumeEnrollment(input: ResumeEnrollmentInput) { return GymEnrollmentService.serializeEnrollment(await resumeGymEnrollment(input)); }\n\n' + source.slice(boundary);
source = source.replace(/  calculatePauseExtension,\r?\n/, '');
fs.writeFileSync(file, source);
for (const [operation, schema, command, message] of [
  ['pause', 'pauseGymEnrollmentSchema', 'pauseEnrollment', 'Informe intervalo válido, motivo e opção de extensão da pausa.'],
  ['resume', 'resumeGymEnrollmentSchema', 'resumeEnrollment', 'Informe a academia da matrícula.'],
]) {
  fs.writeFileSync(`src/app/api/gym/enrollments/[id]/${operation}/route.ts`, `import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymEnrollmentService } from "@/modules/workspaces";
import { ${schema} } from "@/modules/workspaces/application/enrollment-pause";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: enrollmentId } = await params;
    const parsed = ${schema}.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "${message}" } }, { status: 400 });
    // Actual resource-unit authority is checked again inside the domain transaction.
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymEnrollmentService.${command}({ ...parsed.data, enrollmentId, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
    console.error("[GYM_ENROLLMENT_${operation.toUpperCase()}_FAILED]", { enrollmentOperation: "${operation}", code: "INTERNAL_ERROR" });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível atualizar a pausa da matrícula." } }, { status: 500 });
  }
}
`);
}
