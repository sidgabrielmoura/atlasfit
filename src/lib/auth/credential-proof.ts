import { createHash, randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "@/modules/workspaces/application/transaction";

function proofIdentifier(userId: string, passwordHash: string, policyKey: string): string {
  return `CREDENTIAL_PROOF:${userId}:${createHash("sha256").update(`${passwordHash}:${policyKey}`).digest("hex")}`;
}

/** Internal only: called after password and every required factor have been verified. */
export async function issueCredentialProof(userId: string, passwordHash: string, policyKey = ""): Promise<string> {
  const proof = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: proofIdentifier(userId, passwordHash, policyKey),
      token: createHash("sha256").update(proof).digest("hex"),
      expires: new Date(Date.now() + 60_000),
    },
  });
  return proof;
}

/** Atomic single consumption, bound to identity, current password and expiration. */
export async function consumeCredentialProof(userId: string, passwordHash: string, proof: unknown, policyKey = "", db: GymTransactionClient = prisma): Promise<boolean> {
  if (typeof proof !== "string" || !/^[a-f0-9]{64}$/.test(proof)) return false;
  const consumed = await db.verificationToken.deleteMany({
    where: {
      identifier: proofIdentifier(userId, passwordHash, policyKey),
      token: createHash("sha256").update(proof).digest("hex"),
      expires: { gt: new Date() },
    },
  });
  return consumed.count === 1;
}
