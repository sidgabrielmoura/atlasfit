import { previewGymImport, commitGymImport } from "./gym-import-commands";
import { parseBrlCents } from "../domain/currency-input";
import { WorkspaceAccessError } from "../domain/types";

export interface PreviewGymImportInput {
  workspaceId: string;
  csvContent: string;
  unitId?: string;
  actorUserId: string;
}

export interface GymImportPreviewRow {
  rowNumber: number;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  registrationNumber?: string;
  isMinor: boolean;
  hasGuardianData: boolean;
  guardianName?: string;
  guardianCpf?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
  planName?: string;
  planId?: string;
  planPriceInCents?: number;
  planVersionId?: string;
  existingMemberId?: string;
  startDate?: string;
  endDate?: string;
  openingDueDate?: string;
  openingDebitInCents: number;
  openingCreditInCents: number;
  status: "VALID" | "WARNING" | "INVALID";
  action: "NEW_STUDENT_AND_CONTRACT" | "LINK_EXISTING_STUDENT" | "SKIP_ALREADY_ACTIVE" | "INVALID";
  messages: string[];
}

export interface GymImportPreviewResult {
  previewId?: string;
  unitId?: string;
  expiresAt?: string;
  importBatchHash: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  totalNewStudents: number;
  totalExistingStudents: number;
  totalContracts: number;
  totalOpeningDebitInCents: number;
  totalOpeningCreditInCents: number;
  rows: GymImportPreviewRow[];
  securityNotice: string;
}

export interface CommitGymImportInput {
  workspaceId: string;
  importBatchHash: string;
  rows?: unknown;
  previewId?: string;
  acceptLegacyBalances?: boolean;
  unitId?: string;
  actorUserId: string;
  overrideAmbiguities?: boolean;
}

export interface GymImportCommitResult {
  success: boolean;
  importBatchHash: string;
  alreadyCommitted?: boolean;
  message: string;
  totalProcessed: number;
  createdStudentsCount: number;
  linkedStudentsCount: number;
  createdEnrollmentsCount: number;
  createdInvoicesCount: number;
  totalOpeningDebitInCents: number;
  totalOpeningCreditInCents: number;
}

export class GymImportService {
  /**
   * Gera modelo CSV oficial com colunas e linhas de exemplo explicativas.
   */
  static generateSampleCsv(): string {
    return "\uFEFF" + ["Nome", "Email", "Telefone", "CPF", "Data_Nascimento", "Matricula", "Plano", "Valor_Mensalidade", "Data_Inicio", "Data_Termino", "Saldo_Devedor", "Vencimento_Saldo", "Saldo_Credor", "Responsavel_Nome", "Responsavel_CPF", "Responsavel_Telefone", "Parentesco"].join(";") + "\r\n";
  }

  /**
   * Converte strings monetárias flexíveis (BRL e internacional) em centavos inteiros.
   */
  static parseCurrencyToCents(valStr: string): number {
    const amount = valStr ? parseBrlCents(valStr) : 0;
    if (amount === null) throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "Valor monetário inválido.");
    return amount;
  }

  /**
   * Realiza a análise preliminar (Dry Run / Prévia) da importação,
   * identificando alunos existentes, menores sem responsável, planos e reconciliando os totais de abertura.
   */
  static async previewImport(input: PreviewGymImportInput): Promise<GymImportPreviewResult> {
    return previewGymImport(input);
  }

  /**
   * Executa a importação definitiva do lote com idempotência matemática,
   * criando alunos, responsáveis, contratos, faturas de abertura.
   */
  static async commitImport(input: CommitGymImportInput): Promise<GymImportCommitResult> {
    return commitGymImport(input);
  }
}
