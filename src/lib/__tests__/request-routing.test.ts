import { afterEach, describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { isSessionlessRoute } from "../session-routes";

vi.mock("next-auth", () => ({ default: () => ({ auth: (handler: (request: NextRequest) => unknown) => handler }) }));
import { config, proxy } from "@/proxy";
afterEach(() => vi.unstubAllEnvs());
const matches = (url: string) => unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });

describe("Proxy and session request boundaries", () => {
  it.each(["/personal/dashboard", "/personal/academy", "/student/workouts", "/gym/students", "/guardian/dependents", "/superadmin/users", "/api/gym/students"])("keeps protection on %s", path => {
    expect(matches(path)).toBe(true);
    expect(isSessionlessRoute(path)).toBe(false);
  });
  it.each(["/logos_atlasfit/logo.png", "/manifest.json", "/firebase-messaging-sw.js", "/_next/static/app.js", "/_next/image", "/favicon.ico", "/auth/student", "/t/public-form"])("serves %s without invoking the auth proxy", path => {
    expect(matches(path)).toBe(false);
  });
  it("keeps invitation/account flows eligible for a real session lookup", () => {
    for (const path of ["/auth/invite", "/auth/guardian-invite", "/auth/setup-password", "/account/gym-privacy", "/select-workspace", "/subscription-expired", "/personal-onboarding", "/unknown", null]) expect(isSessionlessRoute(path)).toBe(false);
    for (const path of ["/auth/student", "/auth/student/", "/termos-de-uso", "/privacidade", "/t/form"]) expect(isSessionlessRoute(path)).toBe(true);
  });
  it("preserves the personal affiliation path header", async () => {
    const response = await proxy(new NextRequest("https://app.example.invalid/personal/academy"));
    expect(response.headers.get("x-middleware-request-x-atlasfit-path")).toBe("/personal/academy");
  });
  it("still rejects cross-site GYM writes and allows reads", async () => {
    const url = "https://app.example.invalid/api/gym/students";
    expect((await proxy(new NextRequest(url, { method: "POST", headers: { "sec-fetch-site": "cross-site" } }))).status).toBe(403);
    expect((await proxy(new NextRequest(url))).headers.get("x-middleware-next")).toBe("1");
  });
});
