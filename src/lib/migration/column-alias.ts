export const COLUMN_ALIASES: Record<string, string[]> = {
  cpfCnpj: ["cpf", "cnpj", "cpf/cnpj", "cpf_cnpj", "documento"],
  name: [
    "nome",
    "aluno",
    "cliente",
    "nome completo",
    "nome_completo",
    "aluno(a)",
    "estudante",
  ],
  email: [
    "email",
    "e-mail",
    "correio eletrônico",
    "mail",
  ],
  phone: [
    "telefone",
    "celular",
    "whatsapp",
    "whats",
    "zap",
    "contato",
    "fone",
    "tel",
  ],
  birthDate: [
    "data de nascimento",
    "nascimento",
    "data_nascimento",
    "dt_nascimento",
    "aniversario",
    "aniversário",
  ],
  objective: [
    "objetivo",
    "meta",
    "foco",
    "finalidade",
  ],
  weight: [
    "peso",
    "peso (kg)",
    "peso_kg",
    "massa",
  ],
  height: [
    "altura",
    "altura (cm)",
    "altura (m)",
    "estatura",
  ],
  gender: [
    "gênero",
    "genero",
    "sexo",
  ],
  workoutName: [
    "treino",
    "nome do treino",
    "ficha",
    "programa",
    "nome_treino",
  ],
  exerciseName: [
    "exercício",
    "exercicio",
    "movimento",
    "nome do exercício",
    "nome_exercicio",
  ],
  sets: [
    "séries",
    "series",
    "sets",
  ],
  externalId: [
    "id",
    "id_aluno",
    "id aluno",
    "código",
    "codigo",
    "matrícula",
    "matricula",
    "identificador",
  ],
  dayOfWeek: [
    "dia",
    "dia da semana",
    "dia_da_semana",
    "dia de execução",
    "dia de execucao",
    "dia_execucao",
    "dia de treino",
  ],
  reps: [
    "repetições",
    "repeticoes",
    "reps",
    "repetições / série",
    "repeticoes / serie",
    "repetições/série",
    "repeticoes/serie",
  ],
  load: [
    "carga",
    "peso (kg)",
    "carga (kg)",
    "peso_exercicio",
  ],
  restSeconds: [
    "descanso",
    "pausa",
    "intervalo",
    "rest",
  ],
  notes: [
    "referência da carga",
    "referencia da carga",
    "referência",
    "referencia",
    "observação",
    "observações",
    "observacao",
    "observacoes",
    "obs",
    "nota",
    "notas",
  ],
};

/**
 * Normalizes a header text string (lowercase, trim, remove accents/special chars).
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Maps a list of raw column headers to canonical fields using local aliases.
 * Returns mapped canonical fields and any unrecognized headers.
 */
export function mapColumnHeaders(rawHeaders: string[]): {
  mapped: Record<string, string>; // rawHeader -> canonicalField
  unrecognized: string[];
} {
  const mapped: Record<string, string> = {};
  const unrecognized: string[] = [];

  for (const rawHeader of rawHeaders) {
    const normalized = normalizeHeader(rawHeader);
    let foundCanonical: string | null = null;

    for (const [canonicalField, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((alias) => normalizeHeader(alias) === normalized)) {
        foundCanonical = canonicalField;
        break;
      }
    }

    if (foundCanonical) {
      mapped[rawHeader] = foundCanonical;
    } else {
      unrecognized.push(rawHeader);
    }
  }

  return { mapped, unrecognized };
}
