import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        hasApiKey: false,
        models: [
          {
            name: "models/gemini-1.5-flash",
            displayName: "Gemini 1.5 Flash",
            description: "Modelo multimodal ultrarrápido otimizado para extração de dados, imagens e OCR",
            inputTokenLimit: 1048576,
            outputTokenLimit: 8192,
            supportedCapabilities: ["generateContent", "structuredOutput", "thinking"],
          },
          {
            name: "models/gemini-1.5-pro",
            displayName: "Gemini 1.5 Pro",
            description: "Modelo de visão e raciocínio profundo para tarefas complexas",
            inputTokenLimit: 1048576,
            outputTokenLimit: 8192,
            supportedCapabilities: ["generateContent", "complexReasoning", "thinking"],
          },
        ],
      });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
      throw new Error(`Google API HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const rawModels = data.models || [];

    const activeModels = rawModels
      .filter((m: any) => m.name.includes("gemini"))
      .map((m: any) => ({
        name: m.name,
        displayName: m.displayName || m.name.replace("models/", ""),
        description: m.description || "",
        inputTokenLimit: m.inputTokenLimit || 1048576,
        outputTokenLimit: m.outputTokenLimit || 8192,
        supportedCapabilities: m.supportedGenerationMethods || [],
      }));

    return NextResponse.json({
      hasApiKey: true,
      models: activeModels.length > 0 ? activeModels : [
        {
          name: "models/gemini-1.5-flash",
          displayName: "Gemini 1.5 Flash",
          description: "Modelo multimodal ultrarrápido otimizado para extração de dados, imagens e OCR",
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192,
          supportedCapabilities: ["generateContent", "structuredOutput", "thinking"],
        },
        {
          name: "models/gemini-1.5-pro",
          displayName: "Gemini 1.5 Pro",
          description: "Modelo de visão e raciocínio profundo para tarefas complexas",
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192,
          supportedCapabilities: ["generateContent", "complexReasoning", "thinking"],
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json({
      hasApiKey: true,
      error: error.message,
      models: [
        {
          name: "models/gemini-1.5-flash",
          displayName: "Gemini 1.5 Flash",
          description: "Modelo multimodal ultrarrápido otimizado para extração de dados, imagens e OCR",
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192,
          supportedCapabilities: ["generateContent", "structuredOutput", "thinking"],
        },
        {
          name: "models/gemini-1.5-pro",
          displayName: "Gemini 1.5 Pro",
          description: "Modelo de visão e raciocínio profundo para tarefas complexas",
          inputTokenLimit: 1048576,
          outputTokenLimit: 8192,
          supportedCapabilities: ["generateContent", "complexReasoning", "thinking"],
        },
      ],
    });
  }
}
