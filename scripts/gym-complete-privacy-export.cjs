const fs=require('node:fs'); const path='src/modules/workspaces/application/privacy-service.ts';let s=fs.readFileSync(path,'utf8');
function replace(a,b){if(!s.includes(a))throw new Error('Missing '+a.slice(0,70));s=s.replace(a,b);}
s='import { collectGymArchiveAttachments } from "./gym-privacy-archive";\nimport { gymAttachmentKeys } from "./gym-storage";\nimport { submitGymPrivacyRequest } from "./gym-privacy-requests";\n'+s;
replace('actorUserId: string }) {','actorUserId: string; requestId?: string }) {');
replace('  return serializableTransaction(async tx => {','  const dossier = await serializableTransaction(async tx => {');
replace('studentProfile: true, staffProfile: true,','studentProfile: { select: { registrationNumber: true, emergencyContactName: true, emergencyContactPhone: true, medicalClearance: true, medicalClearanceExpiresAt: true, notes: true, healthData: true, onboardedAt: true, privacyRestrictedAt: true, enrolledAt: true, status: true } }, staffProfile: { select: { hiredAt: true, jobTitle: true } },');
// Staff profile fields are checked by TypeScript; export no employee/private administrative metadata.
replace('    if (!member) throw new WorkspaceAccessError', '    if (!member) throw new WorkspaceAccessError');
replace('    // A local controller cannot export', '    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "privacy.manage", member.unitId);\n    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "health.read.assigned", member.unitId);\n    // A local controller cannot export');
replace('fileName: true, mimeType: true, size: true, notes:', 'fileName: true, mimeType: true, size: true, url: true, objectKey: true, notes:');
replace('    const legalAcceptances =',`    const progress = await tx.studentProgress.findMany({ where: scoped, orderBy: [{ date: "asc" }, { id: "asc" }] });
    const photos = await tx.studentProgressPhoto.findMany({ where: scoped, select: { id: true, objectKey: true, photoUrl: true, mimeType: true, size: true, date: true, trainerLiked: true, comment: true } });
    const workouts = await tx.workout.findMany({ where: scoped, select: { id: true, name: true, goal: true, difficulty: true, duration: true, dayOfWeek: true, createdAt: true, exercises: { select: { sets: true, reps: true, load: true, rest: true, description: true, exercise: { select: { name: true } } } } } });
    const ownMessages = await tx.message.findMany({ where: { senderId: member.userId, conversation: { workspaceId: input.workspaceId } }, select: { id: true, conversationId: true, content: true, attachment: true, type: true, createdAt: true } });
    const representation = await tx.gymGuardian.findMany({ where: { workspaceId: input.workspaceId, studentMemberId: member.id }, select: { id: true, relationship: true, isLegalRepresentative: true, isFinancialResponsible: true, isEmergencyContact: true, hasHealthAccess: true, verifiedAt: true, revokedAt: true } });
    const privacyRequests = await tx.dataSubjectRequest.findMany({ where: { workspaceId: input.workspaceId, requesterUserId: member.userId }, select: { id: true, type: true, status: true, requestedAt: true, completedAt: true, notes: true, rejectionReason: true } });
    const legalAcceptances =`);
replace('where: { workspaceId: input.workspaceId, userId: member.userId }, select: { documentType:', 'where: { workspaceId: input.workspaceId, OR: [{ userId: member.userId }, { representedUserId: member.userId }] }, select: { documentType:');
const start=s.indexOf('    const request = await tx.dataSubjectRequest.create('),end=s.indexOf('\n    await tx.auditLog.create',start);
if(start<0||end<0)throw new Error('export request anchor');
s=s.slice(0,start)+`    let request;
    if (input.requestId) {
      request = await tx.dataSubjectRequest.findFirst({ where: { id: input.requestId, workspaceId: input.workspaceId, requesterUserId: member.userId, type: { in: ["ACCESS", "PORTABILITY"] }, status: { in: ["IN_REVIEW", "PROCESSING"] } } });
      const meta = request?.metadata;
      if (!request || !meta || typeof meta !== "object" || Array.isArray(meta) || !meta.identityVerifiedAt) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Verifique a identidade do pedido antes de gerar a exportação.");
      request = await tx.dataSubjectRequest.update({ where: { id: request.id }, data: { status: "PROCESSING", handledBy: input.actorUserId } });
    } else request = await tx.dataSubjectRequest.create({ data: { requesterUserId: member.userId, workspaceId: input.workspaceId, type: "PORTABILITY", status: "PROCESSING", handledBy: input.actorUserId, metadata: { purpose: "GYM_EXPORT", generatedByController: true }, notes: "Pacote em geração; entrega ao titular ainda não confirmada." } });`+s.slice(end);
replace('"other workspaces", "binary files"','"other workspaces", "other people’s private messages"');
replace('      evaluations, files, workoutHistory, feedback, legalAcceptances,','      evaluations, files, progress, photos, workouts, ownMessages, representation, privacyRequests, workoutHistory, feedback, legalAcceptances,');
const endExport=s.indexOf('\n}\n\nexport async function requestGymDataDeletion');
if(endExport<0)throw new Error('export ending');
s=s.slice(0,endExport)+`
  const sources: { key: string; resourceId: string; name: string }[] = [];
  for (const file of dossier.files) if (file.type === "file") {
    const key = file.objectKey || gymAttachmentKeys(file.url)[0];
    if (!key) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Arquivo legado sem objeto verificável. Reconcilie antes de exportar.");
    sources.push({ key, resourceId: file.id, name: file.fileName || file.name });
  }
  for (const photo of dossier.photos) {
    const key = photo.objectKey || gymAttachmentKeys(photo.photoUrl)[0];
    if (!key) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Foto legada sem objeto verificável. Reconcilie antes de exportar.");
    sources.push({ key, resourceId: photo.id, name: "Foto de evolução" });
  }
  for (const row of [...dossier.evaluations, ...dossier.ownMessages]) for (const key of gymAttachmentKeys(row)) sources.push({ key, resourceId: row.id, name: "Anexo do registro" });
  const archive = await collectGymArchiveAttachments(input.workspaceId, sources);
  await serializableTransaction(async tx => {
    const member = await tx.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId: input.targetUserId, workspaceId: input.workspaceId } }, select: { unitId: true } });
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "privacy.manage", member.unitId);
    await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "health.read.assigned", member.unitId);
    const request = await tx.dataSubjectRequest.findUniqueOrThrow({ where: { id: dossier.exportMetadata.requestId } });
    const old = request.metadata && typeof request.metadata === "object" && !Array.isArray(request.metadata) ? request.metadata : {};
    await tx.dataSubjectRequest.update({ where: { id: request.id }, data: { status: "COMPLETED", completedAt: new Date(), metadata: { ...old, response: "Pacote completo gerado para disponibilização ao titular.", archive: { generatedAt: new Date().toISOString(), totalFiles: archive.attachments.length, totalBytes: archive.attachmentManifest.totalBytes, deliveryConfirmed: false } } } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: "GYM_PRIVACY_EXPORT_READY", entity: "DATA_SUBJECT_REQUEST", entityId: request.id, metadata: { totalFiles: archive.attachments.length, totalBytes: archive.attachmentManifest.totalBytes } } });
  });
  return { ...dossier, ...archive };`+s.slice(endExport);
const deletion=s.indexOf('export async function requestGymDataDeletion');
s=s.slice(0,deletion)+`export async function requestGymDataDeletion(input: { workspaceId: string; targetUserId: string; actorUserId: string; reason?: string }) {
  const request = await submitGymPrivacyRequest({ ...input, type: "DELETION", notes: input.reason });
  return { success: true, targetUserId: input.targetUserId, requestId: request.id, status: request.status };
}
`;
fs.writeFileSync(path,s);
