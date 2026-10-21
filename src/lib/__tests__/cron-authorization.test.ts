import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isCronAuthorized } from "../cron-authorization";

describe("isCronAuthorized", () => {
  const originalSecret = process.env.CRON_SECRET;
  const TEST_SECRET = "test-secret-123456-atlasfit";

  beforeEach(() => {
    process.env.CRON_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.CRON_SECRET = originalSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  it("fails closed when CRON_SECRET is not configured or empty", () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(new Request("http://localhost/api/cron/deliveries", {
      headers: { Authorization: `Bearer ${TEST_SECRET}` }
    }))).toBe(false);

    process.env.CRON_SECRET = "   ";
    expect(isCronAuthorized(new Request("http://localhost/api/cron/deliveries", {
      headers: { Authorization: `Bearer ${TEST_SECRET}` }
    }))).toBe(false);
  });

  it("authorizes when valid Bearer token is provided in Authorization header", () => {
    const req = new Request("http://localhost/api/cron/deliveries", {
      headers: { Authorization: `Bearer ${TEST_SECRET}` }
    });
    expect(isCronAuthorized(req)).toBe(true);
  });

  it("authorizes when secret is provided in query param ?secret=", () => {
    const req = new Request(`http://localhost/api/cron/gym-recurrence?secret=${TEST_SECRET}`);
    expect(isCronAuthorized(req)).toBe(true);
  });

  it("authorizes when secret is provided in query param ?key=", () => {
    const req = new Request(`http://localhost/api/cron/process-recurrence?key=${TEST_SECRET}`);
    expect(isCronAuthorized(req)).toBe(true);
  });

  it("authorizes when secret is provided in query param ?cron_secret=", () => {
    const req = new Request(`http://localhost/api/cron/engage-push?cron_secret=${TEST_SECRET}`);
    expect(isCronAuthorized(req)).toBe(true);
  });

  it("authorizes when request.url has a relative URL or full URL", () => {
    // Standard Request in Node requires absolute URL
    const req = new Request(`https://app.atlasfit.site/api/cron/gym-purge?secret=${TEST_SECRET}`);
    expect(isCronAuthorized(req)).toBe(true);

    // Mock request object with relative url property
    const mockReq = {
      url: `/api/cron/gym-purge?secret=${TEST_SECRET}`,
      headers: new Headers()
    } as unknown as Request;
    expect(isCronAuthorized(mockReq)).toBe(true);
  });

  it("rejects invalid secret in Authorization header", () => {
    const req = new Request("http://localhost/api/cron/deliveries", {
      headers: { Authorization: "Bearer wrong-secret" }
    });
    expect(isCronAuthorized(req)).toBe(false);
  });

  it("rejects invalid secret in query parameter", () => {
    const req = new Request("http://localhost/api/cron/deliveries?secret=wrong-secret");
    expect(isCronAuthorized(req)).toBe(false);
  });

  it("rejects when no credentials are provided", () => {
    const req = new Request("http://localhost/api/cron/deliveries");
    expect(isCronAuthorized(req)).toBe(false);
  });
});
