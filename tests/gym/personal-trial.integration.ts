import { expect, it } from "vitest";
import { isPersonalTrialActive } from "@/modules/workspaces/domain/personal-trial";
it("trial exige autorização e janela válida; limites, revogação e datas inválidas são recusados", () => {
  const trial = { isActive: true, startDate: "2026-10-01T12:00:00.000Z", endDate: "2026-10-08T12:00:00.000Z" };
  expect(isPersonalTrialActive(trial, new Date("2026-10-01T12:00:00.000Z"))).toBe(true);
  expect(isPersonalTrialActive(trial, new Date("2026-10-08T11:59:59.999Z"))).toBe(true);
  expect(isPersonalTrialActive(trial, new Date(trial.endDate))).toBe(false);
  expect(isPersonalTrialActive(trial, new Date("2026-10-01T11:59:59.999Z"))).toBe(false);
  expect(isPersonalTrialActive({ ...trial, isActive: false }, new Date(trial.startDate))).toBe(false);
  expect(isPersonalTrialActive({ ...trial, endDate: "invalid" }, new Date(trial.startDate))).toBe(false);
  expect(isPersonalTrialActive(null)).toBe(false);
});
