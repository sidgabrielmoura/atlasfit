import prisma from "@/lib/prisma";

export type ConsentPurpose = "MARKETING_EMAIL" | "MARKETING_WHATSAPP" | "OPTIONAL_AI_PROCESSING";

export class ConsentService {
  /**
   * Checks if a user currently has an active (non-revoked) consent for a given purpose.
   */
  static async hasActiveConsent(userId: string, purpose: ConsentPurpose | string): Promise<boolean> {
    if (!userId || !purpose) return false;

    try {
      const consent = await prisma.privacyConsent.findUnique({
        where: {
          userId_purpose: {
            userId,
            purpose,
          },
        },
      });

      return !!(consent && !consent.revokedAt);
    } catch (err) {
      console.error(`[ConsentService] Error checking consent for ${userId} (${purpose}):`, err);
      // Fail-closed for privacy protection
      return false;
    }
  }

  /**
   * Sets or updates user consent status with timestamp, audit log, and revocation support.
   */
  static async setConsent(params: {
    userId: string;
    purpose: ConsentPurpose | string;
    granted: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const { userId, purpose, granted, ipAddress, userAgent } = params;

    if (granted) {
      await prisma.privacyConsent.upsert({
        where: {
          userId_purpose: {
            userId,
            purpose,
          },
        },
        update: {
          grantedAt: new Date(),
          revokedAt: null,
        },
        create: {
          userId,
          purpose,
          grantedAt: new Date(),
        },
      });
    } else {
      await prisma.privacyConsent.updateMany({
        where: {
          userId,
          purpose,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    // Record immutable audit entry
    await prisma.auditLog.create({
      data: {
        userId,
        action: `PRIVACY_CONSENT_${granted ? "GRANTED" : "REVOKED"}: ${purpose}`,
        entity: "PRIVACY_CONSENT",
        entityId: purpose,
        severity: "info",
        ip: ipAddress || null,
      },
    });

    return { success: true, purpose, granted };
  }

  /**
   * Returns all active and historical consent records for a user.
   */
  static async getUserConsents(userId: string) {
    return prisma.privacyConsent.findMany({
      where: { userId },
      orderBy: { grantedAt: "desc" },
    });
  }
}
