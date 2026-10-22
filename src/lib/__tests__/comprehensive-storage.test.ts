import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeStorageLimitMb,
  DB_FOOTPRINT_BYTES,
  calculateWorkspacesStorageUsage,
  getOwnedWorkspaceIds,
  getAccountStorageQuotaMetrics,
} from "../comprehensive-storage.service";

// Mock prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    workspace: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    workspaceSubscription: {
      findFirst: vi.fn(),
    },
    studentFile: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    studentProgressPhoto: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    trainerVideo: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    importSource: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    gymStorageObject: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    workspaceMember: {
      count: vi.fn(),
    },
    exercise: {
      count: vi.fn(),
    },
    workout: {
      count: vi.fn(),
    },
    workoutLog: {
      count: vi.fn(),
    },
    physicalEvaluation: {
      count: vi.fn(),
    },
    studentProgress: {
      count: vi.fn(),
    },
    message: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    dailyFeedback: {
      count: vi.fn(),
    },
    exerciseAdjustmentRequest: {
      count: vi.fn(),
    },
  };
  return { mockPrisma: mock };
});

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

describe("Comprehensive Storage Calculation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeStorageLimitMb", () => {
    it("should treat <= 50 as Gigabytes and convert to Megabytes", () => {
      expect(normalizeStorageLimitMb(1)).toBe(1024);
      expect(normalizeStorageLimitMb(3)).toBe(3072);
      expect(normalizeStorageLimitMb(8)).toBe(8192);
      expect(normalizeStorageLimitMb(20)).toBe(20480);
      expect(normalizeStorageLimitMb(50)).toBe(51200);
    });

    it("should keep values > 50 directly in Megabytes", () => {
      expect(normalizeStorageLimitMb(1024)).toBe(1024);
      expect(normalizeStorageLimitMb(3072)).toBe(3072);
      expect(normalizeStorageLimitMb(5120)).toBe(5120);
      expect(normalizeStorageLimitMb(102400)).toBe(102400);
    });

    it("should fallback to 1024 MB for invalid, null or negative inputs", () => {
      expect(normalizeStorageLimitMb(null)).toBe(1024);
      expect(normalizeStorageLimitMb(undefined)).toBe(1024);
      expect(normalizeStorageLimitMb(-10)).toBe(1024);
      expect(normalizeStorageLimitMb(0)).toBe(1024);
      expect(normalizeStorageLimitMb(NaN)).toBe(1024);
    });
  });

  describe("getOwnedWorkspaceIds", () => {
    it("should return unified list of workspace IDs where user is owner or owner member", async () => {
      mockPrisma.workspace.findMany.mockResolvedValue([
        { id: "ws-1" },
        { id: "ws-2" },
        { id: "ws-1" }, // duplicado para testar deduplicação
      ]);

      const result = await getOwnedWorkspaceIds("user-1");
      expect(result).toEqual(["ws-1", "ws-2"]);
      expect(mockPrisma.workspace.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ownerId: "user-1" },
            { members: { some: { userId: "user-1", role: "OWNER", isActive: true } } },
          ],
        },
        select: { id: true },
      });
    });
  });

  describe("calculateWorkspacesStorageUsage", () => {
    it("should return zero when workspace list is empty", async () => {
      const result = await calculateWorkspacesStorageUsage([]);
      expect(result.totalUsedBytes).toBe(0);
      expect(result.totalUsedMb).toBe(0);
      expect(result.totalUsedGb).toBe(0);
      expect(result.breakdown.cloud.totalBytes).toBe(0);
      expect(result.breakdown.database.totalBytes).toBe(0);
    });

    it("should correctly sum cloud media bytes and database footprint", async () => {
      // Mock Cloudflare media
      mockPrisma.studentFile.aggregate.mockResolvedValue({ _sum: { size: 10 * 1024 * 1024 }, _count: { _all: 5 } });
      mockPrisma.studentProgressPhoto.aggregate.mockResolvedValue({ _sum: { size: 5 * 1024 * 1024 }, _count: { _all: 10 } });
      mockPrisma.trainerVideo.aggregate.mockResolvedValue({ _sum: { fileSize: 20 * 1024 * 1024 }, _count: { _all: 2 } });
      mockPrisma.importSource.aggregate.mockResolvedValue({ _sum: { sizeBytes: 2 * 1024 * 1024 }, _count: { _all: 1 } });
      mockPrisma.gymStorageObject.aggregate.mockResolvedValue({ _sum: { size: 3 * 1024 * 1024 }, _count: { _all: 3 } });

      mockPrisma.message.count.mockImplementation((args: any) => {
        if (args?.where?.attachment) {
          return Promise.resolve(2); // 2 anexos
        }
        return Promise.resolve(100); // 100 mensagens
      });

      mockPrisma.workspace.findMany.mockResolvedValue([
        { id: "ws-1", logoKey: "logo-key", watermarkKey: null, workoutCoverKey: null },
      ]);

      // Mock Database Records
      mockPrisma.workspaceMember.count.mockResolvedValue(20); // 20 * 100 KB = 2000 KB = 2,048,000 bytes
      mockPrisma.workout.count.mockResolvedValue(15); // 15 * 40 KB = 600 KB = 614,400 bytes
      mockPrisma.exercise.count.mockResolvedValue(30); // 30 * 15 KB = 450 KB = 460,800 bytes
      mockPrisma.workoutLog.count.mockResolvedValue(50); // 50 * 10 KB = 500 KB = 512,000 bytes
      mockPrisma.physicalEvaluation.count.mockResolvedValue(10); // 10 * 30 KB = 300 KB = 307,200 bytes
      mockPrisma.studentProgress.count.mockResolvedValue(40); // 40 * 5 KB = 200 KB = 204,800 bytes
      mockPrisma.dailyFeedback.count.mockResolvedValue(25); // 25 * 8 KB = 200 KB
      mockPrisma.exerciseAdjustmentRequest.count.mockResolvedValue(5); // 5 * 8 KB = 40 KB

      const result = await calculateWorkspacesStorageUsage(["ws-1"]);

      // Cloud total = 10MB + 5MB + 20MB + 2MB + 3MB + 2 * 500KB + 350KB
      expect(result.breakdown.cloud.filesBytes).toBe(10 * 1024 * 1024);
      expect(result.breakdown.cloud.photosBytes).toBe(5 * 1024 * 1024);
      expect(result.breakdown.cloud.videosBytes).toBe(20 * 1024 * 1024);
      expect(result.breakdown.cloud.totalFilesCount).toBe(5 + 10 + 2 + 1 + 3 + 1 + 2);

      // Database total
      expect(result.breakdown.database.studentsCount).toBe(20);
      expect(result.breakdown.database.studentsBytes).toBe(20 * DB_FOOTPRINT_BYTES.STUDENT);
      expect(result.breakdown.database.workoutsCount).toBe(15);
      expect(result.breakdown.database.workoutsBytes).toBe(15 * DB_FOOTPRINT_BYTES.WORKOUT);

      expect(result.totalUsedBytes).toBeGreaterThan(0);
      expect(result.totalUsedMb).toBeGreaterThan(0);
      expect(result.totalUsedGb).toBeGreaterThan(0);
    });
  });

  describe("getAccountStorageQuotaMetrics - Determinism Test", () => {
    it("must NOT alter calculated usage when the plan limit is changed from 3 GB to 8 GB", async () => {
      mockPrisma.workspace.findMany.mockImplementation((args: any) => {
        if (args?.select?.id) {
          return Promise.resolve([{ id: "ws-1" }]);
        }
        return Promise.resolve([{ id: "ws-1", logoKey: null, watermarkKey: null, workoutCoverKey: null }]);
      });

      // Simular contagens reais fixas
      mockPrisma.studentFile.aggregate.mockResolvedValue({ _sum: { size: 50 * 1024 * 1024 } }); // 50 MB
      mockPrisma.studentFile.count.mockResolvedValue(10);
      mockPrisma.studentProgressPhoto.aggregate.mockResolvedValue({ _sum: { fileSize: 0 } });
      mockPrisma.studentProgressPhoto.count.mockResolvedValue(0);
      mockPrisma.trainerVideo.aggregate.mockResolvedValue({ _sum: { fileSize: 0 } });
      mockPrisma.trainerVideo.count.mockResolvedValue(0);
      mockPrisma.importSource.aggregate.mockResolvedValue({ _sum: { fileSize: 0 } });
      mockPrisma.importSource.count.mockResolvedValue(0);
      mockPrisma.gymStorageObject.aggregate.mockResolvedValue({ _sum: { bytes: 0 } });
      mockPrisma.gymStorageObject.count.mockResolvedValue(0);
      mockPrisma.message.findMany.mockResolvedValue([]);

      mockPrisma.workspaceMember.count.mockResolvedValue(10); // 1 MB
      mockPrisma.workout.count.mockResolvedValue(20);
      mockPrisma.exercise.count.mockResolvedValue(10);
      mockPrisma.workoutLog.count.mockResolvedValue(10);
      mockPrisma.physicalEvaluation.count.mockResolvedValue(5);
      mockPrisma.studentProgress.count.mockResolvedValue(10);
      mockPrisma.message.count.mockResolvedValue(50);
      mockPrisma.dailyFeedback.count.mockResolvedValue(0);
      mockPrisma.exerciseAdjustmentRequest.count.mockResolvedValue(0);

      // Cenário 1: Plano de 3 GB (3072 MB)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-test",
        name: "Personal Teste",
        email: "personal@teste.com",
        isTestAccount: false,
        freeTrial: null,
        subscription: {
          plan: {
            name: "Plano 3GB",
            storageLimitMb: 3072, // 3 GB
          },
        },
      });

      const metrics3GB = await getAccountStorageQuotaMetrics("user-test");

      // Cenário 2: Plano alterado para 8 GB (8192 MB)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-test",
        name: "Personal Teste",
        email: "personal@teste.com",
        isTestAccount: false,
        freeTrial: null,
        subscription: {
          plan: {
            name: "Plano 8GB",
            storageLimitMb: 8192, // 8 GB
          },
        },
      });

      const metrics8GB = await getAccountStorageQuotaMetrics("user-test");

      // O uso real DEVE ser exatamente o mesmo! O limite não afeta o cálculo do consumo!
      expect(metrics3GB.totalUsedBytes).toBe(metrics8GB.totalUsedBytes);
      expect(metrics3GB.totalUsedMb).toBe(metrics8GB.totalUsedMb);
      expect(metrics3GB.totalUsedGb).toBe(metrics8GB.totalUsedGb);

      // Apenas o limite e o percentual mudam
      expect(metrics3GB.storageLimitMb).toBe(3072);
      expect(metrics8GB.storageLimitMb).toBe(8192);
      expect(metrics3GB.percentageUsed).toBeGreaterThan(metrics8GB.percentageUsed);
    });
  });
});
