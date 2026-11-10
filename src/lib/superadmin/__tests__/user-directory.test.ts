import { describe, expect, it } from "vitest";
import { matchesUserDirectoryCategory, matchesUserDirectorySearch, userWorkspaceContexts } from "../user-directory";

const gym = { id: "gym", name: "Academia Central", type: "GYM", isActive: true, ownerId: "owner" };
describe("Diretório global de usuários — vínculos da academia", () => {
  it("mostra dono USER sem exigir papel global TRAINER ou linha de membro", () => {
    const user = { role: "USER", workspaceContexts: userWorkspaceContexts("owner", [], [gym]) };
    expect(user.workspaceContexts).toHaveLength(1);
    expect(user.workspaceContexts[0].roles).toEqual(["OWNER"]);
    expect(matchesUserDirectoryCategory(user, "all")).toBe(true);
    expect(matchesUserDirectoryCategory(user, "gym")).toBe(true);
    expect(matchesUserDirectoryCategory(user, "aluno")).toBe(false);
  });
  it("identifica recepcionista por grant de unidade e não pelo papel global USER", () => {
    const user = { role: "USER", workspaceContexts: userWorkspaceContexts("reception", [{ role: "STUDENT", isActive: true, workspace: gym, roleGrants: [{ role: "RECEPTIONIST", revokedAt: null, unit: { isActive: true } }] }]) };
    expect(user.workspaceContexts[0].roles).toEqual(["RECEPTIONIST"]);
    expect(matchesUserDirectoryCategory(user, "gym")).toBe(true);
    expect(matchesUserDirectoryCategory(user, "aluno")).toBe(false);
    expect(matchesUserDirectorySearch(user, "recepcionista")).toBe(true);
    expect(matchesUserDirectorySearch(user, " academia central ")).toBe(true);
  });
  it("não duplica o dono que também tem membro; preserva contas com mais de um contexto", () => {
    const user = { role: "TRAINER", workspaceContexts: userWorkspaceContexts("owner", [{ role: "OWNER", isActive: true, workspace: gym, studentProfile: { id: "student-profile" } }], [gym]) };
    expect(user.workspaceContexts).toHaveLength(1);
    expect(user.workspaceContexts[0].roles).toEqual(["OWNER"]);
    expect(matchesUserDirectoryCategory(user, "personal")).toBe(true);
    expect(matchesUserDirectoryCategory(user, "gym")).toBe(true);
    expect(matchesUserDirectoryCategory(user, "aluno")).toBe(true);
  });
  it("não ressuscita papel legado revogado nem exclui a conta da lista geral", () => {
    const user = { role: "USER", workspaceContexts: userWorkspaceContexts("former-staff", [{ role: "RECEPTIONIST", isActive: false, workspace: gym, roleGrants: [{ role: "RECEPTIONIST", revokedAt: new Date() }] }]) };
    expect(user.workspaceContexts[0].roles).toEqual([]);
    expect(user.workspaceContexts[0].membershipActive).toBe(false);
    expect(matchesUserDirectoryCategory(user, "all")).toBe(true);
    expect(matchesUserDirectoryCategory(user, "aluno")).toBe(false);
  });
  it("conta USER sem vínculo permanece em Todos, sem ser apresentada como aluno", () => {
    expect(matchesUserDirectoryCategory({ role: "USER" }, "all")).toBe(true);
    expect(matchesUserDirectoryCategory({ role: "USER" }, "aluno")).toBe(false);
  });
});
