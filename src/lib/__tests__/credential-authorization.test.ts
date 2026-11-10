import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(), setting: vi.fn(), compare: vi.fn(), policy: vi.fn(),
  consume: vi.fn(), rate: vi.fn(), impersonate: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ default: { user: { findUnique: mocks.findUser }, systemSetting: { findUnique: mocks.setting } } }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rate }));
vi.mock("@/lib/auth/credential-proof", () => ({ consumeCredentialProof: mocks.consume }));
vi.mock("@/lib/auth/mfa-service", () => ({ resolveAuthenticationPolicy: mocks.policy, authenticationPolicyKey: () => "current-policy" }));
vi.mock("@/lib/auth/impersonation-service", () => ({ consumeImpersonationGrant: mocks.impersonate }));

import { authorizeCredentials } from "../auth/credential-authorization";

const user = { id: "u1", email: "user@example.invalid", name: "User", role: "USER", password: "current-hash", sessionVersion: 3, isBlocked: false };
const request = () => new Request("https://app.example.invalid/api/auth/callback/credentials");
const credentials = { email: user.email, password: "current-password" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rate.mockResolvedValue({ success: true });
  mocks.findUser.mockResolvedValue({ ...user });
  mocks.setting.mockResolvedValue(null);
  mocks.policy.mockResolvedValue({ user: { ...user }, requiresMfa: false });
  mocks.compare.mockResolvedValue(true);
  mocks.consume.mockResolvedValue(true);
});

describe("Credential authorization without repeated password hashing", () => {
  it("accepts a current internal proof without rechecking bcrypt or needing the raw password", async () => {
    expect(await authorizeCredentials({ email: user.email, authenticationProof: "proof" }, request())).toMatchObject({ id: user.id, sessionVersion: 3 });
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.consume).toHaveBeenCalledWith(user.id, user.password, "proof", "current-policy");
  });
  it("accepts direct password authentication once only when MFA is not required", async () => {
    expect(await authorizeCredentials(credentials, request())).toMatchObject({ id: user.id });
    expect(mocks.compare).toHaveBeenCalledExactlyOnceWith("current-password", "current-hash");
    expect(mocks.consume).not.toHaveBeenCalled();
  });
  it("requires a current proof for MFA, even with the correct password", async () => {
    mocks.policy.mockResolvedValue({ user, requiresMfa: true });
    expect(await authorizeCredentials(credentials, request())).toBeNull();
    expect(await authorizeCredentials({ ...credentials, authenticationProof: "proof" }, request())).toMatchObject({ id: user.id });
  });
  it("rejects an invalid, expired or consumed proof without falling back to the password", async () => {
    mocks.consume.mockResolvedValue(false);
    for (const proof of ["expired", "replayed", "", null, {}]) {
      expect(await authorizeCredentials({ ...credentials, authenticationProof: proof }, request())).toBeNull();
    }
    expect(mocks.compare).not.toHaveBeenCalled();
  });
  it("consumes the proof for every attempt; it is never memoized", async () => {
    mocks.consume.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const input = { ...credentials, authenticationProof: "one-use" };
    expect(await authorizeCredentials(input, request())).not.toBeNull();
    expect(await authorizeCredentials(input, request())).toBeNull();
    expect(mocks.consume).toHaveBeenCalledTimes(2);
  });
  it("rejects blocked users before hashing, including proof-based requests", async () => {
    mocks.findUser.mockResolvedValue({ ...user, isBlocked: true });
    expect(await authorizeCredentials({ ...credentials, authenticationProof: "proof" }, request())).toBeNull();
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.consume).not.toHaveBeenCalled();
  });
  it("rejects users whose eligibility/policy no longer permits authentication", async () => {
    mocks.policy.mockResolvedValue(null);
    expect(await authorizeCredentials({ ...credentials, authenticationProof: "proof" }, request())).toBeNull();
  });
  it.each([{ password: "new-hash" }, { sessionVersion: 4 }])("fails closed if account state changes while resolving policy: %o", async change => {
    mocks.policy.mockResolvedValue({ user: { ...user, ...change }, requiresMfa: true });
    expect(await authorizeCredentials({ ...credentials, authenticationProof: "proof" }, request())).toBeNull();
    expect(mocks.consume).not.toHaveBeenCalled();
  });
  it("still enforces maintenance and rate limits", async () => {
    mocks.setting.mockResolvedValue({ value: "true" });
    expect(await authorizeCredentials({ ...credentials, authenticationProof: "proof" }, request())).toBeNull();
    mocks.findUser.mockClear();
    mocks.rate.mockResolvedValue({ success: false });
    expect(await authorizeCredentials(credentials, request())).toBeNull();
    expect(mocks.findUser).not.toHaveBeenCalled();
  });
  it("rejects incorrect passwords and malformed requests", async () => {
    mocks.compare.mockResolvedValue(false);
    expect(await authorizeCredentials(credentials, request())).toBeNull();
    expect(await authorizeCredentials({ email: user.email }, request())).toBeNull();
    expect(await authorizeCredentials({}, request())).toBeNull();
  });
});
