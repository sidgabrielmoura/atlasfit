import { describe, it, expect } from "vitest";
import { formatCref, formatPhone } from "../utils";

describe("formatCref", () => {
  it("deve formatar corretamente com números, categoria e UF", () => {
    expect(formatCref("012345gsp")).toBe("012345-G/SP");
    expect(formatCref("123456-G/SP")).toBe("123456-G/SP");
    expect(formatCref("001234prj")).toBe("001234-P/RJ");
  });

  it("deve formatar números e categorias intermediárias enquanto o usuário digita", () => {
    expect(formatCref("123456")).toBe("123456");
    expect(formatCref("123456g")).toBe("123456-G");
    expect(formatCref("123456gs")).toBe("123456-G/S");
    expect(formatCref("123456gsp")).toBe("123456-G/SP");
  });

  it("deve lidar com valores vazios ou parciais", () => {
    expect(formatCref("")).toBe("");
    expect(formatCref("0")).toBe("0");
  });
});

describe("formatPhone", () => {
  it("deve formatar telefone celular com 11 dígitos", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("deve formatar telefone fixo com 10 dígitos", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });
});
