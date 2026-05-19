// ============================================================
// AtlasFit — Mock Data for Personal Trainer Dashboard
// ============================================================

export const personalInfo = {
  id: "u_1",
  name: "Gabriel",
  role: "Personal Trainer",
  email: "gabriel@atlasfit.com",
  avatarFallback: "GA",
};

// --- Multi-Workspace Architecture ---
export const globalUser = {
  id: "u_1",
  email: "gabriel@atlasfit.com",
  name: "Gabriel Silva",
  avatar: null,
};

export const workspaces = [
  {
    id: "ws_1",
    name: "AtlasFit Academy",
    slug: "atlasfit",
    logo: "AF",
    primaryColor: "#0ea5e9",
    plan: "Elite",
  },
  {
    id: "ws_2",
    name: "CP Treinamento",
    slug: "cp-treino",
    logo: "CP",
    primaryColor: "#10b981", // emerald
    plan: "Pro",
  },
  {
    id: "ws_3",
    name: "Runner Consultoria",
    slug: "runner",
    logo: "RC",
    primaryColor: "#f59e0b", // amber
    plan: "Basic",
  }
];

export const memberships = [
  { userId: "u_1", workspaceId: "ws_1", role: "owner" },
  { userId: "u_1", workspaceId: "ws_2", role: "coach" },
  { userId: "u_1", workspaceId: "ws_3", role: "student" },
];

// --- Students Metrics ---
export const studentsMetrics = {
  totalActive: 50,
  totalActiveChange: 12.5,
  inactive: 8,
  inactiveChange: -2,
  churnRisk: 5,
  avgWeeklyFrequency: 3.8,
  frequencyChange: 5.2,
  completionRate: 87,
  completionChange: 3.1,
  avgEvolution: 12,
  evolutionChange: 2.4,
};

// --- Financial Metrics ---
export const financialMetrics = {
  mrr: 14280,
  mrrChange: 8.3,
  avgTicket: 297,
  ticketChange: 4.1,
  activePlans: 52,
  plansChange: 6,
  financialChurn: 4.2,
  churnChange: -1.3,
  revenueProjection: 16500,
  projectionChange: 15.5,
};

// --- Revenue History (last 6 months) ---
export const revenueHistory = [
  { month: "Jan", current: 9800, previous: 8200 },
  { month: "Fev", current: 10500, previous: 9100 },
  { month: "Mar", current: 11200, previous: 9800 },
  { month: "Abr", current: 12800, previous: 10500 },
  { month: "Mai", current: 13600, previous: 11200 },
  { month: "Jun", current: 14280, previous: 12800 },
];

// --- Plan Distribution ---
export const planDistribution = [
  { plan: "Mensal", count: 18, revenue: 4500, fill: "var(--chart-1)" },
  { plan: "Trimestral", count: 15, revenue: 4950, fill: "var(--chart-2)" },
  { plan: "Semestral", count: 12, revenue: 3360, fill: "var(--chart-3)" },
  { plan: "Anual", count: 7, revenue: 1470, fill: "var(--chart-4)" },
];

// --- Top Students of the Week ---
export const topStudentsWeek = [
  { id: 1, name: "Lucas Ferreira", sessions: 6, streak: 24, avatarFallback: "LF", progress: 95 },
  { id: 2, name: "Ana Beatriz", sessions: 5, streak: 18, avatarFallback: "AB", progress: 88 },
  { id: 3, name: "Pedro Henrique", sessions: 5, streak: 15, avatarFallback: "PH", progress: 82 },
  { id: 4, name: "Mariana Costa", sessions: 4, streak: 12, avatarFallback: "MC", progress: 78 },
  { id: 5, name: "Rafael Santos", sessions: 4, streak: 10, avatarFallback: "RS", progress: 75 },
];

// --- Inactive Students (churn risk) ---
export const inactiveStudents = [
  { id: 1, name: "Carlos Eduardo", daysInactive: 14, lastSession: "24/04", risk: "high" as const, avatarFallback: "CE" },
  { id: 2, name: "Juliana Mendes", daysInactive: 10, lastSession: "28/04", risk: "high" as const, avatarFallback: "JM" },
  { id: 3, name: "Thiago Oliveira", daysInactive: 7, lastSession: "01/05", risk: "medium" as const, avatarFallback: "TO" },
  { id: 4, name: "Fernanda Lima", daysInactive: 5, lastSession: "03/05", risk: "medium" as const, avatarFallback: "FL" },
  { id: 5, name: "Bruno Martins", daysInactive: 4, lastSession: "04/05", risk: "low" as const, avatarFallback: "BM" },
];

// --- Training Feedback (difficulty distribution) ---
export const trainingFeedback = [
  { difficulty: "Muito Fácil", count: 12, fill: "var(--chart-5)" },
  { difficulty: "Fácil", count: 28, fill: "var(--chart-4)" },
  { difficulty: "Adequado", count: 45, fill: "var(--chart-1)" },
  { difficulty: "Difícil", count: 18, fill: "var(--chart-2)" },
  { difficulty: "Muito Difícil", count: 7, fill: "var(--chart-3)" },
];

// --- Load Evolution (8 weeks) ---
export const loadEvolution = [
  { week: "Sem 1", avg: 42, benchmark: 40 },
  { week: "Sem 2", avg: 44, benchmark: 41 },
  { week: "Sem 3", avg: 43, benchmark: 42 },
  { week: "Sem 4", avg: 47, benchmark: 43 },
  { week: "Sem 5", avg: 49, benchmark: 44 },
  { week: "Sem 6", avg: 51, benchmark: 45 },
  { week: "Sem 7", avg: 50, benchmark: 46 },
  { week: "Sem 8", avg: 54, benchmark: 47 },
];

// --- Physical Progress (avg of all students) ---
export const physicalProgress = [
  { month: "Jan", avgWeight: 78.2, avgBodyFat: 22.1 },
  { month: "Fev", avgWeight: 77.5, avgBodyFat: 21.4 },
  { month: "Mar", avgWeight: 76.8, avgBodyFat: 20.8 },
  { month: "Abr", avgWeight: 76.2, avgBodyFat: 20.1 },
  { month: "Mai", avgWeight: 75.5, avgBodyFat: 19.5 },
  { month: "Jun", avgWeight: 75.0, avgBodyFat: 19.0 },
];

// --- Personal Records (recent PRs) ---
export const personalRecords = [
  { id: 1, student: "Lucas Ferreira", exercise: "Supino Reto", value: "120kg", date: "07/05", previousBest: "115kg", avatarFallback: "LF" },
  { id: 2, student: "Ana Beatriz", exercise: "Agachamento", value: "95kg", date: "06/05", previousBest: "90kg", avatarFallback: "AB" },
  { id: 3, student: "Pedro Henrique", exercise: "Terra", value: "180kg", date: "05/05", previousBest: "170kg", avatarFallback: "PH" },
  { id: 4, student: "Mariana Costa", exercise: "Leg Press", value: "280kg", date: "04/05", previousBest: "260kg", avatarFallback: "MC" },
];

// --- Weekly Frequency ---
export const weeklyFrequencyData = [
  { day: "Seg", count: 32 },
  { day: "Ter", count: 28 },
  { day: "Qua", count: 35 },
  { day: "Qui", count: 30 },
  { day: "Sex", count: 38 },
  { day: "Sáb", count: 22 },
  { day: "Dom", count: 8 },
];

// --- Training Consistency ---
export const trainingConsistency = {
  overall: 82,
  trending: "up" as const,
  weeklyData: [
    { week: "Sem 1", rate: 78 },
    { week: "Sem 2", rate: 80 },
    { week: "Sem 3", rate: 79 },
    { week: "Sem 4", rate: 83 },
    { week: "Sem 5", rate: 85 },
    { week: "Sem 6", rate: 82 },
  ],
};

// --- Recent Activity Timeline ---
export const recentActivity = [
  { id: 1, student: "Lucas Ferreira", action: "Completou treino de Peito", time: "Há 15 min", type: "workout" as const, avatarFallback: "LF" },
  { id: 2, student: "Ana Beatriz", action: "Novo PR: Agachamento 95kg", time: "Há 1 hora", type: "record" as const, avatarFallback: "AB" },
  { id: 3, student: "Carlos Eduardo", action: "Não treinou hoje (14 dias inativo)", time: "Há 2 horas", type: "alert" as const, avatarFallback: "CE" },
  { id: 4, student: "Pedro Henrique", action: "Avaliou treino: Adequado ⭐", time: "Há 3 horas", type: "feedback" as const, avatarFallback: "PH" },
  { id: 5, student: "Mariana Costa", action: "Completou treino de Pernas", time: "Há 4 horas", type: "workout" as const, avatarFallback: "MC" },
  { id: 6, student: "Rafael Santos", action: "Renovou plano trimestral", time: "Há 5 horas", type: "financial" as const, avatarFallback: "RS" },
];

// --- All Students List ---
export const allStudents = [
  { id: "1", name: "Lucas Ferreira", status: "active", plan: "Trimestral", phone: "5511999999991", avatarFallback: "LF", lastActive: "Hoje", progress: 95, streak: 24 },
  { id: "2", name: "Ana Beatriz", status: "active", plan: "Mensal", phone: "5511999999992", avatarFallback: "AB", lastActive: "Ontem", progress: 88, streak: 18 },
  { id: "3", name: "Carlos Eduardo", status: "inactive", plan: "Mensal", phone: "5511999999993", avatarFallback: "CE", lastActive: "Há 14 dias", progress: 45, streak: 0 },
  { id: "4", name: "Mariana Costa", status: "active", plan: "Anual", phone: "5511999999994", avatarFallback: "MC", lastActive: "Hoje", progress: 78, streak: 12 },
  { id: "5", name: "Rafael Santos", status: "active", plan: "Trimestral", phone: "5511999999995", avatarFallback: "RS", lastActive: "Há 2 dias", progress: 75, streak: 10 },
  { id: "6", name: "Juliana Mendes", status: "inactive", plan: "Semestral", phone: "5511999999996", avatarFallback: "JM", lastActive: "Há 10 dias", progress: 60, streak: 0 },
  { id: "7", name: "Thiago Oliveira", status: "active", plan: "Mensal", phone: "5511999999997", avatarFallback: "TO", lastActive: "Há 7 dias", progress: 82, streak: 5 },
  { id: "8", name: "Fernanda Lima", status: "active", plan: "Anual", phone: "5511999999998", avatarFallback: "FL", lastActive: "Há 5 dias", progress: 91, streak: 3 },
];

// --- Workout Templates ---
export const workoutTemplates = [
  { id: "1", title: "Hipertrofia - Costas e Bíceps", focus: "Hipertrofia", level: "Intermediário", duration: "60 min", exercises: 8 },
  { id: "2", title: "Emagrecimento - Full Body HIIT", focus: "Emagrecimento", level: "Iniciante", duration: "45 min", exercises: 6 },
  { id: "3", title: "Força - Lower Body", focus: "Força", level: "Avançado", duration: "75 min", exercises: 7 },
  { id: "4", title: "Resistência - Core e Cárdio", focus: "Resistência", level: "Intermediário", duration: "50 min", exercises: 9 },
  { id: "5", title: "Hipertrofia - Peito e Tríceps", focus: "Hipertrofia", level: "Intermediário", duration: "60 min", exercises: 8 },
];

// --- Exercise Library ---
export const exerciseLibrary = [
  { id: "1", name: "Supino Reto com Barra", muscleGroup: "Peito", equipment: "Barra, Banco", level: "Intermediário" },
  { id: "2", name: "Agachamento Livre", muscleGroup: "Pernas", equipment: "Barra, Rack", level: "Avançado" },
  { id: "3", name: "Puxada Frontal", muscleGroup: "Costas", equipment: "Polia", level: "Iniciante" },
  { id: "4", name: "Rosca Direta com Halteres", muscleGroup: "Bíceps", equipment: "Halteres", level: "Iniciante" },
  { id: "5", name: "Tríceps Testa", muscleGroup: "Tríceps", equipment: "Barra W", level: "Intermediário" },
  { id: "6", name: "Elevação Lateral", muscleGroup: "Ombros", equipment: "Halteres", level: "Iniciante" },
  { id: "7", name: "Leg Press 45º", muscleGroup: "Pernas", equipment: "Máquina", level: "Intermediário" },
  { id: "8", name: "Prancha Abdominal", muscleGroup: "Core", equipment: "Nenhum", level: "Iniciante" },
  { id: "9", name: "Levantamento Terra", muscleGroup: "Costas", equipment: "Barra", level: "Avançado" },
  { id: "10", name: "Afundo com Halteres", muscleGroup: "Pernas", equipment: "Halteres", level: "Intermediário" },
];

// --- Financial Data ---
export const recentTransactions = [
  { id: "tx_1", student: "Thiago Oliveira", plan: "Consultoria Mensal", amount: 150.00, date: "2026-05-08", status: "pago", method: "PIX" },
  { id: "tx_2", student: "Fernanda Lima", plan: "Plano Anual", amount: 1200.00, date: "2026-05-07", status: "pago", method: "Cartão de Crédito" },
  { id: "tx_3", student: "Lucas Santos", plan: "Consultoria Trimestral", amount: 350.00, date: "2026-05-05", status: "pendente", method: "Boleto" },
  { id: "tx_4", student: "Amanda Costa", plan: "Consultoria Mensal", amount: 150.00, date: "2026-05-01", status: "atrasado", method: "PIX" },
  { id: "tx_5", student: "Roberto Almeida", plan: "Mentoria VIP", amount: 500.00, date: "2026-04-28", status: "pago", method: "PIX" },
];

export const revenueChartData = [
  { name: "Jan", revenue: 8500 },
  { name: "Fev", revenue: 9200 },
  { name: "Mar", revenue: 11400 },
  { name: "Abr", revenue: 13100 },
  { name: "Mai", revenue: 14280 },
  { name: "Jun", revenue: 16500 },
];

export const subscriptionPlans = [
  { id: "plan_1", name: "Consultoria Mensal", price: 150, subscribers: 35, interval: "mês", active: true },
  { id: "plan_2", name: "Consultoria Trimestral", price: 350, subscribers: 12, interval: "trimestre", active: true },
  { id: "plan_3", name: "Plano Anual", price: 1200, subscribers: 5, interval: "ano", active: true },
  { id: "plan_4", name: "Mentoria VIP", price: 500, subscribers: 0, interval: "mês", active: false },
];

// --- Organization Data ---
export const organizationAlerts = [
  { id: "alt_1", type: "danger", title: "Lucas Santos está há 7 dias sem treinar.", action: "Mandar Mensagem" },
  { id: "alt_2", type: "warning", title: "Maria teve queda de 40% na frequência esta semana.", action: "Analisar Treino" },
  { id: "alt_3", type: "warning", title: "João não respondeu o feedback semanal.", action: "Cobrar Aluno" },
];

export const dailyAgenda = [
  { id: "ag_1", time: "10:00", title: "Avaliação Física - Marcos Silva", type: "avaliação" },
  { id: "ag_2", time: "14:30", title: "Vencimento de Plano - Amanda Costa", type: "financeiro" },
  { id: "ag_3", time: "18:00", title: "Check-in de Evolução - Thiago Oliveira", type: "check-in" },
];

export const pendingTasks = [
  { id: "pt_1", title: "Mensagens não respondidas", count: 3, icon: "MessageSquare" },
  { id: "pt_2", title: "Alunos aguardando novo treino", count: 2, icon: "Dumbbell" },
  { id: "pt_3", title: "Avaliações pendentes de análise", count: 1, icon: "ClipboardList" },
];

export const intelligentStudentsList = [
  { id: "ist_1", name: "Lucas Santos", priority: "Alta", priorityScore: 3, visualStatus: "⚠", statusText: "Sem treinar há 7 dias", plan: "Consultoria Mensal" },
  { id: "ist_2", name: "Amanda Costa", priority: "Alta", priorityScore: 3, visualStatus: "💬", statusText: "Aguardando resposta", plan: "Consultoria Mensal" },
  { id: "ist_3", name: "Marcos Silva", priority: "Média", priorityScore: 2, visualStatus: "😴", statusText: "Baixa frequência (2x na semana)", plan: "Plano Trimestral" },
  { id: "ist_4", name: "João Pedro", priority: "Média", priorityScore: 2, visualStatus: "⚠", statusText: "Treino vence em 3 dias", plan: "Plano Anual" },
  { id: "ist_5", name: "Fernanda Lima", priority: "Baixa", priorityScore: 1, visualStatus: "🔥", statusText: "Ativo hoje", plan: "Plano Anual" },
  { id: "ist_6", name: "Thiago Oliveira", priority: "Baixa", priorityScore: 1, visualStatus: "📈", statusText: "Evoluindo bem (Bateu PR)", plan: "Consultoria Mensal" },
];

export const calendarEvents = [
  { id: "cev_1", date: new Date().toISOString().split("T")[0], time: "09:00", title: "Avaliação Lucas", type: "avaliação" },
  { id: "cev_2", date: new Date().toISOString().split("T")[0], time: "11:30", title: "Aula Presencial - Marcos", type: "aula" },
  { id: "cev_3", date: new Date().toISOString().split("T")[0], time: "14:00", title: "Renovação - Amanda", type: "financeiro" },

  { id: "cev_4", date: new Date(Date.now() + 86400000).toISOString().split("T")[0], time: "10:00", title: "Montar Treino João", type: "lembrete" },
  { id: "cev_5", date: new Date(Date.now() + 86400000).toISOString().split("T")[0], time: "16:00", title: "Reunião de Feedback", type: "avaliação" },

  { id: "cev_6", date: new Date(Date.now() + 172800000).toISOString().split("T")[0], time: "08:00", title: "Treino Personal", type: "aula" },
];

// --- Subscription Data ---
export const currentSubscription = {
  planId: "pl_pro",
  status: "active",
  nextBillingDate: "2026-06-15",
  usage: {
    students: { current: 18, limit: 20 },
    storage: { current: 2.5, limit: 5, unit: "GB" }
  }
};

export const platformPlans = [
  {
    id: "pl_basic",
    name: "Basic",
    price: "R$ 49",
    interval: "/mês",
    description: "Ideal para quem está começando na consultoria online.",
    features: [
      "Até 5 alunos ativos",
      "Treinos ilimitados",
      "Suporte por email",
      "App para o aluno"
    ],
    highlight: false,
    buttonText: "Regredir plano",
    disabled: false
  },
  {
    id: "pl_pro",
    name: "Pro",
    price: "R$ 99",
    interval: "/mês",
    description: "A escolha perfeita para escalar seu negócio.",
    features: [
      "Até 20 alunos ativos",
      "Tudo do plano Basic",
      "Relatórios financeiros",
      "Link de captação exclusivo",
      "Suporte prioritário (WhatsApp)"
    ],
    highlight: true,
    buttonText: "Seu Plano Atual",
    disabled: true
  },
  {
    id: "pl_elite",
    name: "Elite",
    price: "R$ 199",
    interval: "/mês",
    description: "Para grandes equipes e consultorias sem limites.",
    features: [
      "Alunos ilimitados",
      "Tudo do plano Pro",
      "Múltiplos treinadores",
      "White-label (Sua marca no app)",
      "Gerente de conta dedicado"
    ],
    highlight: false,
    buttonText: "Fazer Upgrade",
    disabled: false
  }
];

// --- Settings Data ---
export const settingsData = {
  brand: {
    name: "AtlasFit Consultoria",
    slogan: "Resultados reais para pessoas ocupadas",
    colors: {
      primary: "#0ea5e9", // azul oceano
      secondary: "#1e293b",
      accent: "#38bdf8"
    }
  },
  profile: {
    name: "Gabriel Personal",
    bio: "Treinador especialista em hipertrofia e emagrecimento com mais de 10 anos de experiência transformando vidas.",
    specialty: "Hipertrofia e Emagrecimento",
    social: {
      instagram: "@gabriel.personal",
      linkedin: "linkedin.com/in/gabrielpersonal"
    },
    whatsapp: "+55 (11) 99999-9999",
    city: "São Paulo, SP",
    experience: "10 anos",
    cref: "012345-G/SP"
  }
};

export const studentDashboard = {
  streak: 15,
  weeklyFrequency: 4,
  currentWeight: 75.2,
  evolution: 3.5,
  dailyWorkout: {
    id: "w_1",
    name: "Superior A - Foco Empurrar",
    muscles: "Peito, Ombros e Tríceps",
    duration: "55 min",
    progress: 35,
    status: "pending",
  },
  insights: [
    { id: "in_1", text: "Você treinou 4x esta semana 🔥", type: "success" },
    { id: "in_2", text: "Nova carga máxima no supino: 85kg 📈", type: "achievement" },
  ],
  recentActivity: [
    { id: "act_1", text: "Completou: Treino B - Inferior", date: "Ontem", type: "workout" },
    { id: "act_2", text: "Bateu PR: Agachamento 110kg", date: "Há 2 dias", type: "achievement" },
    { id: "act_3", text: "Enviou feedback do treino", date: "Há 2 dias", type: "feedback" },
  ]
};

export const studentWorkouts = [
  {
    id: "sw_1",
    type: "Treino A",
    name: "Superiores (Empurrar)",
    muscles: "Peito, Ombro e Tríceps",
    exercisesCount: 8,
    lastDone: "Hoje",
    exercises: [
      {
        id: "ex_1",
        name: "Supino Reto c/ Barra",
        sets: 4,
        reps: "8-10",
        rest: "90s",
        load: "80kg",
        videoUrl: "https://www.youtube.com/embed/rT7DgCr-3pg",
        instructions: "Mantenha as escápulas aduzidas e os pés firmes no chão.",
        notes: "Focar na cadência excêntrica."
      },
      {
        id: "ex_2",
        name: "Desenvolvimento de Ombros",
        sets: 3,
        reps: "10-12",
        rest: "60s",
        load: "22kg",
        videoUrl: "https://www.youtube.com/embed/HzIiNhHhhtA",
        instructions: "Evite curvar as costas ao subir os halteres.",
        notes: ""
      }
    ]
  },
  {
    id: "sw_2",
    type: "Treino B",
    name: "Inferiores",
    muscles: "Quadríceps e Glúteo",
    exercisesCount: 7,
    lastDone: "Há 2 dias",
    exercises: []
  },
  {
    id: "sw_3",
    type: "Treino C",
    name: "Superiores (Puxar)",
    muscles: "Costas e Bíceps",
    exercisesCount: 8,
    lastDone: "Há 4 dias",
    exercises: []
  }
];

export const studentEvolution = {
  weightHistory: [
    { date: "01/04", value: 78.5 },
    { date: "08/04", value: 77.8 },
    { date: "15/04", value: 77.2 },
    { date: "22/04", value: 76.5 },
    { date: "29/04", value: 75.8 },
    { date: "06/05", value: 75.2 },
  ],
  measurements: [
    { name: "Braço", current: 38, previous: 37, unit: "cm" },
    { name: "Cintura", current: 82, previous: 85, unit: "cm" },
    { name: "Perna", current: 62, previous: 60, unit: "cm" },
    { name: "Peito", current: 105, previous: 102, unit: "cm" },
  ]
};

// ============================================================
// AtlasFit — SuperAdmin Global Metrics
// ============================================================

export const superAdminMetrics = {
  users: {
    total: 12450,
    totalChange: 15.2,
    active: 8920,
    activeChange: 8.4,
    newToday: 142,
    dauMau: 0.72, // 72%
    distribution: [
      { role: "Alunos", count: 11200, color: "var(--chart-1)" },
      { role: "Trainers", count: 1180, color: "var(--chart-2)" },
      { role: "Admins", count: 70, color: "var(--chart-3)" },
    ]
  },
  workspaces: {
    total: 1120,
    totalChange: 12.8,
    active: 980,
    newThisWeek: 45,
    growth: 5.4,
    types: [
      { name: "Assessorias", count: 850 },
      { name: "Academias", count: 180 },
      { name: "Teams", count: 90 },
    ]
  },
  workouts: {
    totalExecuted: 145000,
    executedToday: 4200,
    topExercises: [
      { name: "Supino Reto", usage: 12500 },
      { name: "Agachamento", usage: 11800 },
      { name: "Levantamento Terra", usage: 9200 },
      { name: "Puxada Frontal", usage: 8500 },
    ]
  },
  retention: {
    churn: 3.8,
    churnChange: -0.5,
    avgFrequency: 3.9, // treinos/semana
    inactiveUsers: 1450,
    healthScore: 88,
  },
  financial: {
    mrr: 142800,
    mrrChange: 12.5,
    arr: 1713600,
    activePlans: 1050,
    cancellations: 42,
    cancellationsChange: -5.2,
    revenueHistory: [
      { month: "Jan", revenue: 98000 },
      { month: "Fev", revenue: 105000 },
      { month: "Mar", revenue: 112000 },
      { month: "Abr", revenue: 128000 },
      { month: "Mai", revenue: 136000 },
      { month: "Jun", revenue: 142800 },
    ]
  }
};
