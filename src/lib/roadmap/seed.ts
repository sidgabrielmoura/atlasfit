import prisma from "@/lib/prisma";

export async function ensureRoadmapDefaults() {
  // 1. Seed Statuses
  const existingStatuses = await prisma.roadmapStatus.findMany();
  if (existingStatuses.length === 0) {
    await prisma.roadmapStatus.createMany({
      data: [
        { name: "Ideias", slug: "ideas", color: "amber", position: 1 },
        { name: "Análise", slug: "under-review", color: "blue", position: 2 },
        { name: "Desenvolvimento", slug: "in-development", color: "purple", position: 3 },
        { name: "Disponível", slug: "released", color: "emerald", position: 4 },
      ],
    });
  }

  // 2. Seed Categories
  const existingCategories = await prisma.roadmapCategory.findMany();
  if (existingCategories.length === 0) {
    await prisma.roadmapCategory.createMany({
      data: [
        { name: "Gestão", slug: "gestao", icon: "Briefcase", position: 1 },
        { name: "Treinos", slug: "treinos", icon: "Dumbbell", position: 2 },
        { name: "Financeiro", slug: "financeiro", icon: "DollarSign", position: 3 },
        { name: "Alunos", slug: "alunos", icon: "Users", position: 4 },
        { name: "Comunicação", slug: "comunicacao", icon: "MessageSquare", position: 5 },
        { name: "AtlasPay", slug: "atlaspay", icon: "CreditCard", position: 6 },
        { name: "Loja", slug: "loja", icon: "ShoppingBag", position: 7 },
        { name: "Relatórios", slug: "relatorios", icon: "BarChart3", position: 8 },
        { name: "Outros", slug: "outros", icon: "Sparkles", position: 9 },
      ],
    });
  }

  // 3. Ensure sample features if empty
  const featureCount = await prisma.roadmapFeature.count();
  if (featureCount === 0) {
    const statuses = await prisma.roadmapStatus.findMany();
    const categories = await prisma.roadmapCategory.findMany();

    const ideasStatus = statuses.find((s) => s.slug === "ideas")?.id;
    const reviewStatus = statuses.find((s) => s.slug === "under-review")?.id;
    const devStatus = statuses.find((s) => s.slug === "in-development")?.id;
    const releasedStatus = statuses.find((s) => s.slug === "released")?.id;

    const alunosCat = categories.find((c) => c.slug === "alunos")?.id;
    const comunicacaoCat = categories.find((c) => c.slug === "comunicacao")?.id;
    const treinosCat = categories.find((c) => c.slug === "treinos")?.id;

    if (ideasStatus && reviewStatus && devStatus && releasedStatus) {
      await prisma.roadmapFeature.createMany({
        data: [
          {
            title: "Ranking Semanal entre Alunos",
            slug: "ranking-semanal-entre-alunos",
            description: "Permitir criar rankings semanais de frequência, streaks e evolução no treino para engajar alunos.",
            statusId: ideasStatus,
            categoryId: alunosCat,
            source: "COMMUNITY",
            voteCount: 42,
            rank: 1000,
          },
          {
            title: "Notificações de Lembrete de Treino via WhatsApp",
            slug: "notificacoes-lembrete-whatsapp",
            description: "Envio automático de lembretes no WhatsApp do aluno 1 hora antes do horário do treino.",
            statusId: reviewStatus,
            categoryId: comunicacaoCat,
            source: "COMMUNITY",
            voteCount: 89,
            rank: 2000,
          },
          {
            title: "Montagem de Treino Assistida com Inteligência",
            slug: "montagem-treino-assistida-inteligencia",
            description: "Gerador assistido de sequências de treinos personalizadas com base na anamnese e histórico do aluno.",
            statusId: devStatus,
            categoryId: treinosCat,
            source: "ATLASFIT",
            voteCount: 156,
            rank: 3000,
          },
          {
            title: "Migração Inteligente de Alunos",
            slug: "migracao-inteligente-de-alunos",
            description: "Importação em lote de fichas de alunos via planilha com auto-mapeamento de campos.",
            statusId: releasedStatus,
            categoryId: alunosCat,
            source: "COMMUNITY",
            voteCount: 230,
            isCommunityChoice: true,
            releasedAt: new Date(),
            rank: 4000,
          },
        ],
      });
    }
  }

  // 4. Ensure active community poll
  await prisma.roadmapPoll.updateMany({
    data: { allowVoteChange: true },
  });

  const pollCount = await prisma.roadmapPoll.count();
  if (pollCount === 0) {
    const adminUser = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    });

    if (adminUser) {
      await prisma.roadmapPoll.create({
        data: {
          title: "Qual funcionalidade devemos priorizar na próxima sprint?",
          description: "Vote na funcionalidade que você gostaria de ver primeiro no AtlasFit.",
          status: "ACTIVE",
          allowVoteChange: true,
          createdById: adminUser.id,
          options: {
            create: [
              { title: "Ranking e Desafios entre Alunos", position: 1, voteCount: 43 },
              { title: "Lembretes Automáticos no WhatsApp", position: 2, voteCount: 32 },
              { title: "Loja Virtual Integrada para Personal", position: 3, voteCount: 25 },
            ],
          },
        },
      });
    }
  }
}
