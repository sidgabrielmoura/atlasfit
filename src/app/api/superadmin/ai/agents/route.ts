import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_AGENTS_CONFIG = [
  {
    id: "migration-ocr",
    name: "Agente de Migração & Visão Computacional",
    purpose: "EXTRACTION",
    description: "Leitura multimodal de planilhas (CSV/XLSX), PDFs e fichas manuscritas de treino.",
    active: true,
    model: "gemini-3.6-flash",
    fallbackModel: "gemini-flash-latest",
    reasoningLevel: "BALANCED",
    thinkingBudget: 1024,
    temperature: 0.1,
    systemInstruction: "Extraia alunos, contatos, treinos e exercícios de forma estruturada.",
  },
  {
    id: "workout-prescription",
    name: "Agente de Prescrição & Fichas de Treino",
    purpose: "WORKOUT_GENERATION",
    description: "Geração personalizada de rotinas de treino baseadas no objetivo e nível do aluno.",
    active: true,
    model: "gemini-3.6-flash",
    fallbackModel: "gemini-flash-latest",
    reasoningLevel: "DEEP",
    thinkingBudget: 2048,
    temperature: 0.4,
    systemInstruction: "Crie prescrições de treino equilibradas e seguras respeitando a anamnese.",
  },
  {
    id: "nutrition-planner",
    name: "Agente de Nutrição & Macronutrientes",
    purpose: "NUTRITION_PLAN",
    description: "Cálculo metabólico e geração de planos alimentares com equivalência de macros.",
    active: false,
    model: "gemini-3.6-flash",
    fallbackModel: "gemini-flash-latest",
    reasoningLevel: "BALANCED",
    thinkingBudget: 1024,
    temperature: 0.2,
    systemInstruction: "Calcule a taxa metabólica basal e planeje dietas estruturadas.",
  },
  {
    id: "personal-copilot",
    name: "Agente Copilot & Assistente Virtual",
    purpose: "AI_ASSISTANT",
    description: "Assistente conversacional para responder dúvidas de alunos e apoiar o Personal Trainer.",
    active: true,
    model: "gemini-3.6-flash",
    fallbackModel: "gemini-flash-latest",
    reasoningLevel: "BALANCED",
    thinkingBudget: 1024,
    temperature: 0.7,
    systemInstruction: "Responda de forma motivadora, profissional e embasada em fisiologia esportiva.",
  },
];

async function getPersistedAgents() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "ai_agents_config" },
  });

  if (!setting || !setting.value) {
    return DEFAULT_AGENTS_CONFIG;
  }

  try {
    const parsed = JSON.parse(setting.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return DEFAULT_AGENTS_CONFIG.map((def) => {
        const found = parsed.find((p: any) => p.id === def.id);
        return found ? { ...def, ...found } : def;
      });
    }
  } catch {}

  return DEFAULT_AGENTS_CONFIG;
}

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const agents = await getPersistedAgents();
    return NextResponse.json({ agents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar agentes." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { agentId, active, model, reasoningLevel, thinkingBudget, temperature } = body;

    const currentAgents = await getPersistedAgents();

    const idx = currentAgents.findIndex((a) => a.id === agentId);
    if (idx === -1) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    if (typeof active === "boolean") currentAgents[idx].active = active;
    if (model) currentAgents[idx].model = model;
    if (reasoningLevel) currentAgents[idx].reasoningLevel = reasoningLevel;
    if (typeof thinkingBudget === "number") currentAgents[idx].thinkingBudget = thinkingBudget;
    if (typeof temperature === "number") currentAgents[idx].temperature = temperature;

    await prisma.systemSetting.upsert({
      where: { key: "ai_agents_config" },
      create: {
        key: "ai_agents_config",
        value: JSON.stringify(currentAgents),
      },
      update: {
        value: JSON.stringify(currentAgents),
      },
    });

    return NextResponse.json({ success: true, agent: currentAgents[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar agente." }, { status: 500 });
  }
}
