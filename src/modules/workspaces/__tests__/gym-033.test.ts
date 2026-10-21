import { describe, it, expect } from "vitest";
import { canTransitionEnrollment, assertValidEnrollmentTransition } from "../domain/enrollment-state-machine";

describe("Matrícula — transições locais", () => {
  it("exige aceite e ativação e mantém estados terminais", () => {
    expect(canTransitionEnrollment("PENDING_ACCEPTANCE", "ACTIVE")).toBe(false);
    expect(canTransitionEnrollment("PENDING_ACCEPTANCE", "PENDING_ACTIVATION")).toBe(true);
    expect(canTransitionEnrollment("PENDING_ACTIVATION", "ACTIVE")).toBe(true);
    expect(canTransitionEnrollment("ACTIVE", "PAUSED")).toBe(true);
    expect(canTransitionEnrollment("PAUSED", "ACTIVE")).toBe(true);
    expect(canTransitionEnrollment("CANCELLED", "ACTIVE")).toBe(false);
    expect(canTransitionEnrollment("EXPIRED", "ACTIVE")).toBe(false);
    expect(() => assertValidEnrollmentTransition("DRAFT", "ACTIVE")).toThrow();
  });
});