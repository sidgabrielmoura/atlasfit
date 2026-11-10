import { describe, expect, it } from "vitest";
import { importErrorMessage, readImportCommitStream, type ImportCommitEvent } from "../commit-protocol";

describe("Confirmação por uma conexão HTTP", () => {
  it("mostra erros JSON aninhados e texto simples sem [object Object]", async () => {
    expect(importErrorMessage({ error: { code: "INVALID", message: "Informe o nascimento." } })).toBe("Informe o nascimento.");
    expect(importErrorMessage(new Error("CPF inválido."))).toBe("CPF inválido.");
    expect(importErrorMessage({ error: {} }, "Revise o aluno.")).toBe("Revise o aluno.");
    await expect(readImportCommitStream(new Response(JSON.stringify({ error: { message: "Unidade não autorizada." } }), { status: 403 }), () => {})).rejects.toThrow("Unidade não autorizada.");
    await expect(readImportCommitStream(new Response("Confirmação inválida.", { status: 400 }), () => {})).rejects.toThrow("Confirmação inválida.");
  });
  it("reconstitui JSON e acentos divididos entre blocos sem fazer novas requisições", async () => {
    const events: ImportCommitEvent[] = [{ type: "started", total: 2 }, { type: "progress", total: 2, processed: 1, succeeded: 0, failed: 1, recordIds: ["r"], failure: { name: "João", code: "INVALID", message: "Nascimento obrigatório", recordIds: ["r"] } }, { type: "finished", result: { success: false, status: "PARTIAL", total: 2, processed: 2, succeeded: 1, failed: 1, failures: [], interrupted: false } }];
    const bytes = new TextEncoder().encode(events.map(event => JSON.stringify(event)).join("\n"));
    const received: ImportCommitEvent[] = [];
    const response = new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } }), { headers: { "content-type": "application/x-ndjson" } });
    await readImportCommitStream(response, event => received.push(event));
    expect(received).toEqual(events);
  });
  it("conexão cortada não anuncia sucesso nem inicia nova confirmação", async () => {
    const response = new Response('{"type":"started","total":2}\n', { headers: { "content-type": "application/x-ndjson" } });
    await expect(readImportCommitStream(response, () => {})).rejects.toThrow("Os cadastros concluídos foram preservados");
  });
});
