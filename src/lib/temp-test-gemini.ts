import { storageService } from "./storage.service";
import { getGeminiClient } from "./gemini/client";
import { MIGRATION_EXTRACTION_PROMPT_V1 } from "./gemini/prompts/migration-extraction.v1";
import { GEMINI_RESPONSE_SCHEMA } from "./gemini/schemas/migration-schema";
import { parseXlsxBuffer, spreadsheetToStructuredText } from "./migration/parsers/spreadsheet.parser";

async function main() {
  const stream = await storageService.getObjectStream("workspace/cmqtnfca1000604l2i7mfpg40/imports/cmvrjylh40007v48f16qb4f84/5b887f5d-4142-4f7e-9a6a-e02afa31b213");
  const chunks: Buffer[] = [];
  for await (const chunk of stream.body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  const rawBuffer = Buffer.concat(chunks);
  const sheets = await parseXlsxBuffer(rawBuffer, "planilha_de_treino.xlsx");
  const textContent = spreadsheetToStructuredText(sheets);

  const client = getGeminiClient();
  const response: any = await client.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: `DOCUMENTO TEXTUAL:\n${textContent}` }],
      },
    ],
    config: {
      systemInstruction: MIGRATION_EXTRACTION_PROMPT_V1,
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESPONSE_SCHEMA as any,
    },
  });

  console.log("=== RAW GEMINI RESPONSE ===");
  console.log(response.text);
}

main()
  .catch((e) => console.error("Error:", e))
  .finally(() => process.exit(0));
