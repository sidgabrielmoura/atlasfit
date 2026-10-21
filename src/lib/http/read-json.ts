export class JsonRequestError extends Error {
  constructor(public readonly statusCode: 400 | 413, message: string) { super(message); this.name = "JsonRequestError"; }
}

/** Bounds the actual stream; Content-Length is not trusted. */
export async function readJsonRequest(request: Request, maximumBytes: number): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new JsonRequestError(400, "Corpo JSON obrigatório.");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > maximumBytes) { await reader.cancel(); throw new JsonRequestError(413, "Corpo da requisição excede o limite de tamanho."); }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new JsonRequestError(400, "Corpo JSON inválido."); }
}
