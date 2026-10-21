const fs=require('node:fs');
function edit(path, fn) { const old=fs.readFileSync(path,'utf8'); const next=fn(old); if(next===old) throw new Error(`No change: ${path}`); fs.writeFileSync(path,next); }
function replace(s,a,b) { if(!s.includes(a)) throw new Error(`Missing anchor: ${a.slice(0,70)}`); return s.replace(a,b); }
for(const name of ['settings','onboarding','assessments','files','evolution']) {
  edit(`src/app/api/student/${name}/route.ts`,s=>{
    s='import { getStudentWorkspaceMember } from "@/lib/student-auth";\n'+s;
    s=s.replace(/await prisma\.workspaceMember\.findFirst\(\{\s*where: \{\s*userId: session\.user\.id,\s*role: "STUDENT",\s*isActive: true,\s*\},\s*\}\)/g,'await getStudentWorkspaceMember(session.user.id)');
    if(name==='files'||name==='assessments') {
      s='import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";\nimport { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";\n'+s;
      s=replace(s,'const workspaceId = member.workspaceId;','const workspaceId = member.workspaceId;\n    if (member.workspace.type === "GYM") await authorizeGymStudent(workspaceId, member.id, session.user.id, "health.read.assigned", { allowSelf: true });');
      s=replace(s,'} catch (error) {','} catch (error) {\n    const denied = handleWorkspaceAccessError(error); if (denied) return denied;');
    }
    if(name==='settings') {
      s='import { z } from "zod";\nimport { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";\nimport { readGymHealthProfile, saveGymHealthProfile } from "@/modules/workspaces/application/gym-health-profile";\nimport { recordGymProgress } from "@/modules/workspaces/application/gym-progress-commands";\n'+s;
      s=replace(s,'const workspaceId = member?.workspaceId || null;',`if (!member) return NextResponse.json({ error: "Selecione um vínculo de aluno ativo." }, { status: 404 });
    const workspaceId = member.workspaceId;
    if (member.workspace.type === "GYM") {
      const local = await readGymHealthProfile(workspaceId, member.id, session.user.id);
      const intake = local.intake && typeof local.intake === "object" && !Array.isArray(local.intake) ? local.intake : {};
      return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, image: user.image, whatsapp: user.whatsapp, city: user.city, gender: user.gender, birthDate: user.birthDate, cpfCnpj: user.cpfCnpj, ...intake, weight: local.physicalData.weight, height: local.physicalData.height }, physicalData: local.physicalData, workspaceId, streak: member.streak, bestStreak: member.bestStreak, progress: member.progress }, { headers: { "Cache-Control": "no-store" } });
    }`);
      s=replace(s,'const body = await req.json();',`const body = await req.json();
    const selected = await getStudentWorkspaceMember(session.user.id);
    if (!selected) return NextResponse.json({ error: "Selecione um vínculo de aluno ativo." }, { status: 404 });
    if (selected.workspace.type === "GYM" && body.action === "updatePhysical") {
      const progress = await recordGymProgress(selected.workspaceId, selected.id, session.user.id, { action: "logProgress", weight: body.weight, height: body.height, bodyFat: body.bodyFat, muscleMass: body.muscleMass });
      return NextResponse.json({ success: true, progress });
    }
    if (selected.workspace.type === "GYM" && body.action === "updateProfile") {
      const allowed = z.object({ action: z.literal("updateProfile"), name: z.string().trim().min(2).max(150).optional(), whatsapp: z.string().max(30).nullable().optional(), city: z.string().max(150).nullable().optional(), bio: z.string().max(2000).nullable().optional(), objective: z.string().max(2000).nullable().optional(), image: z.string().max(2048).nullable().optional(), imageKey: z.string().max(1024).nullable().optional(), cpfCnpj: z.string().max(18).optional() }).strict().safeParse(body);
      if (!allowed.success) return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
      if (allowed.data.cpfCnpj || allowed.data.imageKey || allowed.data.image) return NextResponse.json({ error: "Documento e foto da identidade devem ser alterados no fluxo verificado da conta." }, { status: 409 });
      await saveGymHealthProfile(selected.workspaceId, selected.id, session.user.id, { objective: allowed.data.objective, bio: allowed.data.bio });
      const user = await prisma.user.update({ where: { id: session.user.id }, data: { name: allowed.data.name, whatsapp: allowed.data.whatsapp, city: allowed.data.city }, select: { id: true, name: true, email: true, whatsapp: true, city: true } });
      return NextResponse.json({ success: true, user });
    }`);
      s=replace(s,'data: {\n          password: hashedPassword,','data: {\n          sessionVersion: { increment: 1 },\n          password: hashedPassword,');
      s=s.replace('error: any','error: unknown').replace('error.message || "Erro Interno do Servidor"','"Erro Interno do Servidor"');
      s=s.replace(/\} catch \(error(?:: unknown)?\) \{/g,'} catch (error) {\n    const denied = handleWorkspaceAccessError(error); if (denied) return denied;');
      // Both controller paths return explicit public profile selections.
      s=replace(s,'imageKey: body.imageKey ?? undefined,\n        },','imageKey: body.imageKey ?? undefined,\n        },\n        select: { id: true, name: true, email: true, whatsapp: true, city: true, bio: true, objective: true, image: true },');
    }
    if(name==='onboarding') {
      s='import { z } from "zod";\nimport { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";\nimport { saveGymHealthProfile } from "@/modules/workspaces/application/gym-health-profile";\n'+s;
      s=replace(s,'const body = await req.json();',`const body = await req.json();
    if (member.workspace.type === "GYM") {
      const parsed = z.object({ objective: z.string().max(2000).nullable().optional(), experienceLevel: z.string().max(2000).nullable().optional(), medicalConditions: z.string().max(2000).nullable().optional(), city: z.string().max(150).nullable().optional(), gender: z.string().max(30).nullable().optional(), birthDate: z.string().max(40).optional(), weight: z.union([z.string(), z.number()]).nullable().optional(), height: z.union([z.string(), z.number()]).nullable().optional(), acceptedTerms: z.boolean().optional(), acceptedPrivacy: z.boolean().optional() }).strict().safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Dados de onboarding inválidos." }, { status: 400 });
      // Onboarding never records acceptance of a document the client has not presented by hash.
      const compliance = await LegalAcceptanceService.checkUserCompliance(session.user.id);
      if (!compliance.isCompliant) return NextResponse.json({ error: "Leia e confirme os documentos vigentes na central de privacidade antes de concluir." }, { status: 409 });
      const { objective, experienceLevel, medicalConditions, weight, height } = parsed.data;
      return NextResponse.json(await saveGymHealthProfile(member.workspaceId, member.id, session.user.id, { objective, experienceLevel, medicalConditions, weight, height }, true));
    }`);
      s=replace(s,'} catch (error) {','} catch (error) {\n    const denied = handleWorkspaceAccessError(error); if (denied) return denied;');
    }
    return s;
  });
}
edit('src/lib/privacy/erasure.service.ts',s=>replace(s,'// 1. Find all workspaces owned by this user',`// GYM records require controller-specific review; never cascade across academies.
    if (user.workspaces.some(member => member.workspace.type === "GYM")) throw new Error("GYM_DATA_RETENTION_REQUIRED: encaminhe os vínculos de academia para revisão de privacidade por controlador antes de excluir a conta global.");

    // 1. Find all workspaces owned by this user`));
