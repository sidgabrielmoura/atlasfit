import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockStorageService } = vi.hoisted(() => {
  const tableMocks: Record<string, any> = {};
  const tables = [
    "workspace",
    "workspaceMember",
    "workout",
    "workoutExercise",
    "workoutExerciseGroup",
    "workoutLog",
    "physicalEvaluation",
    "studentProgressPhoto",
    "studentProgress",
    "studentFile",
    "dailyFeedback",
    "trainerTask",
    "exerciseAdjustmentRequest",
    "adjustmentMessage",
    "pendingStudent",
    "gymClassBooking",
    "gymClassWaitlist",
    "gymAccessGrant",
    "gymAccessOverride",
    "gymAccessDecisionLog",
    "gymAccessLog",
    "gymAccessReconciliationDivergence",
    "gymGuardian",
    "gymEnrollment",
    "gymEnrollmentEvent",
    "gymEnrollmentPause",
    "gymContractAcceptance",
    "gymInvoice",
    "gymInvoiceItem",
    "gymPaymentAllocation",
    "gymStudentProfile",
    "gymStaffProfile",
    "gymStorageObject",
    "studentBilling",
    "walletLedgerEntry",
    "paymentSplit",
    "paymentAttempt",
    "activationFeeRecoveryOperation",
    "gymClassSchedule",
    "gymClassSession",
    "workspaceRoleGrant",
    "session",
    "account",
    "userTotpDevice",
    "notificationDevice",
    "notification",
    "notificationPreference",
    "legalAcceptance",
    "privacyConsent",
    "dataSubjectRequest",
    "creditPurchase",
    "message",
    "conversationParticipant",
    "user",
    "auditLog",
  ];

  for (const t of tables) {
    tableMocks[t] = {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
  }

  const pMock: any = {
    ...tableMocks,
    $transaction: vi.fn(async (cb) => cb(pMock)),
  };

  const sMock = {
    deleteObject: vi.fn().mockResolvedValue(undefined),
  };

  return { mockPrisma: pMock, mockStorageService: sMock };
});

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/storage.service", () => ({
  storageService: mockStorageService,
  StorageConfigurationError: class StorageConfigurationError extends Error {},
}));
vi.mock("@/lib/audit-context", () => ({
  withCommandAudit: (fn: any) => fn(),
}));

import { purgeStudentFromWorkspace } from "../application/student-permanent-erasure";

describe("purgeStudentFromWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita chamada sem workspaceId ou studentIdentifier", async () => {
    await expect(
      purgeStudentFromWorkspace({ workspaceId: "", studentIdentifier: "usr_1", actorUserId: "act_1" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("retorna 404 quando aluno não é encontrado", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce(null);

    await expect(
      purgeStudentFromWorkspace({ workspaceId: "ws_1", studentIdentifier: "usr_not_found", actorUserId: "act_1" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("impede exclusão do proprietário do workspace", async () => {
    mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({
      id: "mem_owner",
      userId: "usr_owner",
      workspace: { id: "ws_1", ownerId: "usr_owner" },
    });

    await expect(
      purgeStudentFromWorkspace({ workspaceId: "ws_1", studentIdentifier: "mem_owner", actorUserId: "act_1" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("exclui aluno, seus treinos, arquivos no R2 e dados vinculados com sucesso", async () => {
    const studentUser = {
      id: "usr_student",
      name: "Aluno Teste",
      email: "aluno@test.com",
      imageKey: "avatars/usr_student.jpg",
    };

    mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({
      id: "mem_student",
      userId: studentUser.id,
      user: studentUser,
      workspace: { id: "ws_1", ownerId: "usr_owner" },
    });

    // Files and photos in R2
    mockPrisma.studentFile.findMany.mockResolvedValueOnce([
      { id: "f1", objectKey: "workspace/ws_1/files/exame.pdf", url: null },
    ]);
    mockPrisma.studentProgressPhoto.findMany.mockResolvedValueOnce([
      { id: "p1", objectKey: "workspace/ws_1/students/usr_student/progress/foto1.jpg", photoUrl: null },
    ]);
    mockPrisma.physicalEvaluation.findMany.mockResolvedValueOnce([]);
    mockPrisma.gymStorageObject.findMany.mockResolvedValueOnce([]);

    // Memberships count: 0 other workspaces
    mockPrisma.workspaceMember.count.mockResolvedValueOnce(0);
    mockPrisma.workspace.count.mockResolvedValueOnce(0);

    // Workouts assigned to student
    mockPrisma.workout.findMany.mockResolvedValueOnce([{ id: "w_1" }, { id: "w_2" }]);

    mockPrisma.physicalEvaluation.deleteMany.mockResolvedValueOnce({ count: 3 });

    const result = await purgeStudentFromWorkspace({
      workspaceId: "ws_1",
      studentIdentifier: "mem_student",
      actorUserId: "act_admin",
    });

    expect(result.success).toBe(true);
    expect(result.studentMemberId).toBe("mem_student");
    expect(result.studentUserId).toBe("usr_student");
    expect(result.deletedWorkoutsCount).toBe(2);
    expect(result.deletedFilesCount).toBe(1);
    expect(result.deletedEvaluationsCount).toBe(3);
    expect(result.userDeleted).toBe(true);

    // Check R2 deletions
    expect(mockStorageService.deleteObject).toHaveBeenCalledWith("workspace/ws_1/files/exame.pdf");
    expect(mockStorageService.deleteObject).toHaveBeenCalledWith(
      "workspace/ws_1/students/usr_student/progress/foto1.jpg"
    );
    expect(mockStorageService.deleteObject).toHaveBeenCalledWith("avatars/usr_student.jpg");

    // Check workouts deletion
    expect(mockPrisma.workout.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["w_1", "w_2"] } },
    });
    expect(mockPrisma.workoutExercise.deleteMany).toHaveBeenCalledWith({
      where: { workoutId: { in: ["w_1", "w_2"] } },
    });

    // Check member and user deletion
    expect(mockPrisma.workspaceMember.delete).toHaveBeenCalledWith({
      where: { id: "mem_student" },
    });
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "usr_student" },
    });

    // Check audit log
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "STUDENT_PERMANENTLY_PURGED",
          entityId: "mem_student",
          severity: "high",
        }),
      })
    );
  });

  it("não deleta a conta global User se o aluno pertencer a outro workspace", async () => {
    const studentUser = {
      id: "usr_multi_workspace",
      name: "Aluno Multi",
      email: "multi@test.com",
      imageKey: "avatars/multi.jpg",
    };

    mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({
      id: "mem_current",
      userId: studentUser.id,
      user: studentUser,
      workspace: { id: "ws_1", ownerId: "usr_owner" },
    });

    mockPrisma.studentFile.findMany.mockResolvedValueOnce([]);
    mockPrisma.studentProgressPhoto.findMany.mockResolvedValueOnce([]);
    mockPrisma.physicalEvaluation.findMany.mockResolvedValueOnce([]);
    mockPrisma.gymStorageObject.findMany.mockResolvedValueOnce([]);

    // Has 1 other workspace membership!
    mockPrisma.workspaceMember.count.mockResolvedValueOnce(1);
    mockPrisma.workspace.count.mockResolvedValueOnce(0);

    mockPrisma.workout.findMany.mockResolvedValueOnce([]);
    mockPrisma.physicalEvaluation.deleteMany.mockResolvedValueOnce({ count: 0 });

    const result = await purgeStudentFromWorkspace({
      workspaceId: "ws_1",
      studentIdentifier: "mem_current",
      actorUserId: "act_admin",
    });

    expect(result.success).toBe(true);
    expect(result.userDeleted).toBe(false);

    // WorkspaceMember in ws_1 was deleted
    expect(mockPrisma.workspaceMember.delete).toHaveBeenCalledWith({
      where: { id: "mem_current" },
    });

    // Global User was NOT deleted
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    // User avatar was NOT deleted from R2
    expect(mockStorageService.deleteObject).not.toHaveBeenCalledWith("avatars/multi.jpg");
  });
});
