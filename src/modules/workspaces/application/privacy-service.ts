import { collectGymArchiveAttachments } from "./gym-privacy-archive";
import { gymAttachmentKeys } from "./gym-storage";
import { submitGymPrivacyRequest } from "./gym-privacy-requests";
import { assertPrivacyRequestRepresentation } from "./guardian-privacy";
import { assertActorAuthority } from "./actor-authority";
import { assertGymPrivacyAuthority } from "./gym-privacy-authority";
import { serializableTransaction } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";

export async function exportGymDataSubject(input: { workspaceId: string; targetUserId: string; actorUserId: string; requestId?: string }) {
  const dossier = await serializableTransaction(async tx => {
    if (input.requestId) await assertGymPrivacyAuthority(tx, input.workspaceId, input.actorUserId);
    else await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "privacy.manage");
    const member = await tx.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: input.targetUserId, workspaceId: input.workspaceId } },
      select: {
        id: true, userId: true, role: true, isActive: true, unitId: true, createdAt: true,
        user: { select: { id: true, name: true, email: true, cpfCnpj: true, whatsapp: true, gender: true, birthDate: true } },
        studentProfile: { select: { registrationNumber: true, emergencyContactName: true, emergencyContactPhone: true, medicalClearance: true, medicalClearanceExpiresAt: true, notes: true, healthData: true, onboardedAt: true, privacyRestrictedAt: true, enrolledAt: true, status: true } }, staffProfile: { select: { hireDate: true, jobTitle: true } },
        roleGrants: { select: { role: true, unitId: true, grantedAt: true, revokedAt: true } },
        gymEnrollments: { select: {
          id: true, status: true, startDate: true, endDate: true, priceInCents: true, enrollmentFeeInCents: true,
          planVersion: { select: { name: true, version: true, billingCycle: true, termsText: true, termsVersion: true } },
          acceptance: { select: { signedAt: true, representationRole: true, termsSnapshot: true, termsVersion: true } },
          events: { select: { fromStatus: true, toStatus: true, reason: true, createdAt: true } },
        } },
        accessGrants: { select: { credentialType: true, status: true, validFrom: true, validUntil: true } },
        accessLogs: { select: { accessedAt: true, direction: true, granted: true, reasonCode: true, unitId: true } },
        classBookings: { select: { bookedAt: true, status: true, checkInAt: true, session: { select: { startsAt: true, endsAt: true, modality: { select: { name: true } } } } } },
      },
    });
    if (!member) throw new WorkspaceAccessError(404, "NOT_A_MEMBER", "O titular não possui vínculo com esta academia.");
    if (input.requestId) await assertGymPrivacyAuthority(tx, input.workspaceId, input.actorUserId, member.unitId);
    else {
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "privacy.manage", member.unitId);
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "health.read.assigned", member.unitId);
    }
    // A local controller cannot export global health, authentication, global consents or other tenants.
    const invoices = await tx.gymInvoice.findMany({ where: { workspaceId: input.workspaceId, studentMemberId: member.id }, select: {
      id: true, invoiceNumber: true, title: true, status: true, competenceMonth: true, dueDate: true,
      totalInCents: true, paidAmountInCents: true, openingPaidAmountInCents: true, balanceRemainingInCents: true,
      items: { select: { description: true, quantity: true, unitPriceInCents: true, totalInCents: true } },
      allocations: { select: { allocatedAmountInCents: true, status: true, payment: { select: { receiptNumber: true, amountInCents: true, paymentMethod: true, paidAt: true, status: true, reversedAt: true, reversalReason: true } } } },
    } });
    const scoped = { workspaceId: input.workspaceId, studentId: member.userId };
    const administrativeReviews = await tx.gymAdministrativeReview.findMany({ where: { workspaceId: input.workspaceId, OR: [{ resourceType: "CONTRACT", resourceId: { in: member.gymEnrollments.map(e => e.id) } }, { resourceType: "INVOICE", resourceId: { in: invoices.map(e => e.id) } }] }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, resourceType: true, resourceId: true, reason: true, evidenceReference: true, createdAt: true, afterSnapshot: true } });
    const evaluations = await tx.physicalEvaluation.findMany({ where: scoped });
    const files = await tx.studentFile.findMany({ where: scoped, select: { id: true, name: true, category: true, type: true, fileName: true, mimeType: true, size: true, url: true, objectKey: true, notes: true, createdAt: true } });
    const workoutHistory = await tx.workoutLog.findMany({ where: scoped, select: { workoutId: true, completedAt: true, feedback: true, effortScore: true, loads: true, reps: true, restTimes: true, skippedExercises: true } });
    const feedback = await tx.dailyFeedback.findMany({ where: scoped, select: { energy: true, fatigue: true, humor: true, date: true } });
    const progress = await tx.studentProgress.findMany({ where: scoped, orderBy: [{ date: "asc" }, { id: "asc" }] });
    const photos = await tx.studentProgressPhoto.findMany({ where: scoped, select: { id: true, objectKey: true, photoUrl: true, mimeType: true, size: true, date: true, trainerLiked: true, comment: true } });
    const workouts = await tx.workout.findMany({ where: scoped, select: { id: true, name: true, goal: true, difficulty: true, duration: true, dayOfWeek: true, createdAt: true, exercises: { select: { sets: true, reps: true, load: true, rest: true, description: true, exercise: { select: { name: true } } } } } });
    const ownMessages = await tx.message.findMany({ where: { senderId: member.userId, conversation: { workspaceId: input.workspaceId } }, select: { id: true, conversationId: true, content: true, attachment: true, type: true, createdAt: true } });
    const representation = await tx.gymGuardian.findMany({ where: { workspaceId: input.workspaceId, studentMemberId: member.id }, select: { id: true, relationship: true, isLegalRepresentative: true, isFinancialResponsible: true, isEmergencyContact: true, hasHealthAccess: true, verifiedAt: true, revokedAt: true } });
    const privacyRequests = await tx.dataSubjectRequest.findMany({ where: { workspaceId: input.workspaceId, requesterUserId: member.userId }, select: { id: true, type: true, status: true, requestedAt: true, completedAt: true, notes: true, rejectionReason: true } });
    const legalAcceptances = await tx.legalAcceptance.findMany({ where: { workspaceId: input.workspaceId, OR: [{ userId: member.userId }, { representedUserId: member.userId }] }, select: { documentType: true, documentVersion: true, documentHash: true, acceptedAt: true } });
    let request;
    if (input.requestId) {
      request = await tx.dataSubjectRequest.findFirst({ where: { id: input.requestId, workspaceId: input.workspaceId, requesterUserId: member.userId, type: { in: ["ACCESS", "PORTABILITY"] }, status: { in: ["IN_REVIEW", "PROCESSING"] } } });
      const meta = request?.metadata;
      if (!request || !meta || typeof meta !== "object" || Array.isArray(meta) || !meta.identityVerifiedAt) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Verifique a identidade do pedido antes de gerar a exportação.");
      await assertPrivacyRequestRepresentation(tx, input.workspaceId, meta);
      request = await tx.dataSubjectRequest.update({ where: { id: request.id }, data: { status: "PROCESSING", handledBy: input.actorUserId } });
    } else request = await tx.dataSubjectRequest.create({ data: { requesterUserId: member.userId, workspaceId: input.workspaceId, type: "PORTABILITY", status: "PROCESSING", handledBy: input.actorUserId, metadata: { purpose: "GYM_EXPORT", generatedByController: true }, notes: "Pacote em geração; entrega ao titular ainda não confirmada." } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: "GYM_PRIVACY_LOCAL_EXPORT", entity: "DATA_SUBJECT_REQUEST", entityId: request.id, severity: "info" } });
    return {
      exportMetadata: { generatedAt: new Date(), workspaceId: input.workspaceId, requestId: request.id, scope: "WORKSPACE_LOCAL", monetaryEncoding: "decimal string in cents", excludes: ["authentication", "global health", "global consents", "other workspaces", "other people’s private messages"] },
      personalInformation: { ...member.user, userId: member.userId, registrationNumber: member.studentProfile?.registrationNumber ?? null },
      membership: { id: member.id, role: member.role, isActive: member.isActive, unitId: member.unitId, createdAt: member.createdAt, studentProfile: member.studentProfile, staffProfile: member.staffProfile, roleGrants: member.roleGrants },
      contractsAndEnrollments: member.gymEnrollments.map(enrollment => ({ ...enrollment, priceInCents: enrollment.priceInCents.toString(), enrollmentFeeInCents: enrollment.enrollmentFeeInCents.toString(), planName: enrollment.planVersion.name })),
      financialRecords: invoices.map(invoice => ({ ...invoice, amountInCents: invoice.totalInCents.toString(), totalInCents: invoice.totalInCents.toString(), paidAmountInCents: invoice.paidAmountInCents.toString(), openingPaidAmountInCents: invoice.openingPaidAmountInCents.toString(), balanceRemainingInCents: invoice.balanceRemainingInCents.toString(), items: invoice.items.map(item => ({ ...item, unitPriceInCents: item.unitPriceInCents.toString(), totalInCents: item.totalInCents.toString() })), allocations: invoice.allocations.map(allocation => ({ ...allocation, allocatedAmountInCents: allocation.allocatedAmountInCents.toString(), payment: { ...allocation.payment, amountInCents: allocation.payment.amountInCents.toString() } })) })),
      physicalAccessHistory: { credentials: member.accessGrants, logs: member.accessLogs }, classBookings: member.classBookings,
      administrativeReviews, evaluations, files, progress, photos, workouts, ownMessages, representation, privacyRequests, workoutHistory, feedback, legalAcceptances,
    };
  });
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
  const boundKeys = new Set(sources.map(source => source.key));
  for (const row of dossier.evaluations) for (const key of gymAttachmentKeys(row)) {
    if (!boundKeys.has(key)) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Anexo da avaliação sem vínculo verificável com os arquivos do titular.");
    sources.push({ key, resourceId: row.id, name: "Anexo da avaliação" });
  }
  for (const row of dossier.ownMessages) for (const key of gymAttachmentKeys(row)) {
    if (!key.startsWith(`workspace/${input.workspaceId}/chat/${input.targetUserId}/`)) throw new WorkspaceAccessError(409, "STORAGE_RECONCILIATION_REQUIRED", "Anexo de mensagem sem autoria verificável. Reconcilie antes de exportar.");
    sources.push({ key, resourceId: row.id, name: "Anexo de mensagem própria" });
  }
  const archive = await collectGymArchiveAttachments(input.workspaceId, sources);
  await serializableTransaction(async tx => {
    const member = await tx.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId: input.targetUserId, workspaceId: input.workspaceId } }, select: { unitId: true } });
    if (input.requestId) await assertGymPrivacyAuthority(tx, input.workspaceId, input.actorUserId, member.unitId);
    else {
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "privacy.manage", member.unitId);
      await assertActorAuthority(tx, input.workspaceId, input.actorUserId, "health.read.assigned", member.unitId);
    }
    const request = await tx.dataSubjectRequest.findUniqueOrThrow({ where: { id: dossier.exportMetadata.requestId } });
    await assertPrivacyRequestRepresentation(tx, input.workspaceId, request.metadata);
    const old = request.metadata && typeof request.metadata === "object" && !Array.isArray(request.metadata) ? request.metadata : {};
    await tx.dataSubjectRequest.update({ where: { id: request.id }, data: { status: "COMPLETED", completedAt: new Date(), metadata: { ...old, response: "Pacote completo gerado para disponibilização ao titular.", archive: { generatedAt: new Date().toISOString(), totalFiles: archive.attachments.length, totalBytes: archive.attachmentManifest.totalBytes, deliveryConfirmed: false } } } });
    await tx.auditLog.create({ data: { userId: input.actorUserId, action: "GYM_PRIVACY_EXPORT_READY", entity: "DATA_SUBJECT_REQUEST", entityId: request.id, metadata: { totalFiles: archive.attachments.length, totalBytes: archive.attachmentManifest.totalBytes } } });
  });
  return { ...dossier, ...archive };
}

export async function requestGymDataDeletion(input: { workspaceId: string; targetUserId: string; actorUserId: string; reason?: string }) {
  const request = await submitGymPrivacyRequest({ ...input, type: "DELETION", notes: input.reason });
  return { success: true, targetUserId: input.targetUserId, requestId: request.id, status: request.status };
}
