import prisma from "@/lib/prisma";
import crypto from "crypto";
import { LegalDocumentType, LegalDocumentStatus, LegalAcceptanceType } from "@prisma/client";

export function calculateDocumentHash(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

export const INITIAL_TERMS_CONTENT_V1 = `
# TERMOS DE USO — ATLASFIT (v1.0)
**Vigência a partir de:** 01 de Março de 2026
**Versão:** 1.0

## 1. NATUREZA DO SERVIÇO
O AtlasFit é uma plataforma de software como serviço (SaaS) destinada à gestão de assessorias esportivas e consultorias de personal training. O AtlasFit não presta serviços de Educação Física, nutrição ou medicina, atuando estritamente como provedor de tecnologia.

## 2. ELEGIBILIDADE E RESPONSABILIDADE PROFISSIONAL (CREF)
O uso da plataforma como Personal Trainer é exclusivo para profissionais devidamente registrados e habilitados no Conselho Regional de Educação Física (CONFEF/CREF). A responsabilidade técnica pela anamnese, prescrição de treinos, dosagem de cargas e exigência de atestados médicos é integral e exclusiva do respectivo profissional.

## 3. POLÍTICA DE IDADE (18+)
O AtlasFit é uma plataforma destinada exclusivamente a usuários maiores de 18 (dezoito) anos. O cadastro de menores é expressamente vedado.

## 4. ISENÇÃO DE RESPONSABILIDADE POR DANOS FÍSICOS
O AtlasFit não se responsabiliza por lesões, acidentes corporais ou intercorrências de saúde resultantes da execução dos treinos prescritos pelos Personal Trainers cadastrados.

## 5. REGRAS FINANCEIRAS E ATLAS PAY
As transações financeiras intermediadas pelo módulo Atlas Pay utilizam infraestrutura bancária autorizada pelo Banco Central (Asaas Gestão Financeira S.A.). Aplicam-se as taxas de intermediação e políticas de liquidação descritas nas configurações da conta.

## 6. PROPRIEDADE INTELECTUAL E USO ACEITÁVEL
O usuário concede ao AtlasFit licença não-exclusiva para hospedar, processar e exibir conteúdos enviados estritamente para a execução dos serviços contratados.
`.trim();

export const INITIAL_PRIVACY_CONTENT_V1 = `
# POLÍTICA DE PRIVACIDADE — ATLASFIT (v1.0)
**Vigência a partir de:** 01 de Março de 2026
**Versão:** 1.0

## 1. CONTROLADOR E OPERADOR
O AtlasFit atua como Controlador dos dados cadastrais dos Personal Trainers assinantes e como Operador dos dados pessoais e de saúde dos Alunos inseridos por seus respectivos treinadores (Controladores).

## 2. DADOS TRATADOS
- **Cadastrais:** Nome, e-mail, telefone/WhatsApp, data de nascimento, CPF/CNPJ.
- **Saúde e Biometria:** Peso, altura, dobras cutâneas (Pollock), histórico de lesões, mapas de dor, avaliações posturais e fotos comparativas.
- **Técnicos e Conexão:** Endereço IP, registros de login (Marco Civil da Internet), tokens de sessão e cookies essenciais.

## 3. BASES LEGAIS (LGPD)
O tratamento de dados é realizado com fundamento na Execução de Contrato (Art. 7º, V), Cumprimento de Obrigação Legal (Art. 7º, II), Tutela da Saúde e Procedimento por Profissionais de Saúde (Art. 11, II, "f") e Consentimento Específico (Art. 11, I) para registros fotográficos e comunicações.

## 4. SUBPROCESSADORES E TRANSFERÊNCIA INTERNACIONAL
Utilizamos provedores com altos padrões de segurança:
- **Banco de Dados:** Neon Tech Inc. (PostgreSQL Serverless, EUA).
- **Armazenamento de Mídia:** Cloudflare Inc. (R2 Storage, EUA).
- **Processamento de IA:** Google LLC (Gemini API, EUA) para migração estruturada.
- **Pagamentos:** Asaas Gestão Financeira S.A. (Brasil) e AbacatePay (Brasil).
- **Mensageria:** Resend Inc. (EUA) e Ably Realtime Ltd. (Reino Unido/EUA).

## 5. DIREITOS DOS TITULARES
Os titulares podem solicitar acesso, correção, exportação (portabilidade) e eliminação de seus dados através do Painel de Privacidade ou pelo e-mail oficial do DPO (hello@atlasfit.site).
`.trim();

export class LegalAcceptanceService {
  /**
   * Seeds initial v1.0 legal documents if not present in the database
   */
  static async seedInitialDocuments() {
    const termsHash = calculateDocumentHash(INITIAL_TERMS_CONTENT_V1);
    const privacyHash = calculateDocumentHash(INITIAL_PRIVACY_CONTENT_V1);

    await prisma.legalDocument.upsert({
      where: {
        type_version: {
          type: LegalDocumentType.TERMS,
          version: "1.0",
        },
      },
      update: {},
      create: {
        type: LegalDocumentType.TERMS,
        version: "1.0",
        title: "Termos de Uso do AtlasFit",
        content: INITIAL_TERMS_CONTENT_V1,
        contentHash: termsHash,
        status: LegalDocumentStatus.PUBLISHED,
        publishedAt: new Date("2026-03-01T00:00:00Z"),
        effectiveAt: new Date("2026-03-01T00:00:00Z"),
      },
    });

    await prisma.legalDocument.upsert({
      where: {
        type_version: {
          type: LegalDocumentType.PRIVACY,
          version: "1.0",
        },
      },
      update: {},
      create: {
        type: LegalDocumentType.PRIVACY,
        version: "1.0",
        title: "Política de Privacidade do AtlasFit",
        content: INITIAL_PRIVACY_CONTENT_V1,
        contentHash: privacyHash,
        status: LegalDocumentStatus.PUBLISHED,
        publishedAt: new Date("2026-03-01T00:00:00Z"),
        effectiveAt: new Date("2026-03-01T00:00:00Z"),
      },
    });
  }

  /**
   * Fetches active published document by type
   */
  static async getActiveDocument(type: LegalDocumentType) {
    let doc = await prisma.legalDocument.findFirst({
      where: {
        type,
        status: LegalDocumentStatus.PUBLISHED,
      },
      orderBy: { publishedAt: "desc" },
    });

    if (!doc) {
      await this.seedInitialDocuments();
      doc = await prisma.legalDocument.findFirst({
        where: {
          type,
          status: LegalDocumentStatus.PUBLISHED,
        },
        orderBy: { publishedAt: "desc" },
      });
    }

    return doc;
  }

  /**
   * Records an immutable acceptance entry in the database
   */
  static async recordAcceptance(params: {
    userId: string;
    documentType: LegalDocumentType;
    documentVersion?: string;
    acceptanceType?: LegalAcceptanceType;
    ipAddress?: string | null;
    userAgent?: string | null;
    source?: string;
    workspaceId?: string | null;
  }) {
    const { userId, documentType, acceptanceType = LegalAcceptanceType.TERMS_ACCEPTED, ipAddress, userAgent, source, workspaceId } = params;

    let doc = params.documentVersion
      ? await prisma.legalDocument.findUnique({
        where: {
          type_version: {
            type: documentType,
            version: params.documentVersion,
          },
        },
      })
      : await this.getActiveDocument(documentType);

    if (!doc) {
      await this.seedInitialDocuments();
      doc = await this.getActiveDocument(documentType);
    }

    if (!doc) {
      throw new Error(`Documento legal não encontrado para o tipo: ${documentType}`);
    }

    return prisma.legalAcceptance.create({
      data: {
        userId,
        documentId: doc.id,
        documentType: doc.type,
        documentVersion: doc.version,
        documentHash: doc.contentHash,
        acceptanceType,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.substring(0, 500) : null,
        source: source || "WEB",
        workspaceId: workspaceId || null,
      },
    });
  }

  /**
   * Verifies if user has accepted the latest published versions of TERMS and PRIVACY
   */
  static async checkUserCompliance(userId: string) {
    const activeTerms = await this.getActiveDocument(LegalDocumentType.TERMS);
    const activePrivacy = await this.getActiveDocument(LegalDocumentType.PRIVACY);

    const pendingDocuments: Array<{
      id: string;
      type: LegalDocumentType;
      version: string;
      title: string;
      content: string;
      contentHash: string;
    }> = [];

    if (activeTerms) {
      const acceptedTerms = await prisma.legalAcceptance.findFirst({
        where: {
          userId,
          documentType: LegalDocumentType.TERMS,
          documentVersion: activeTerms.version,
        },
        orderBy: { acceptedAt: "desc" },
      });

      if (!acceptedTerms) {
        pendingDocuments.push({
          id: activeTerms.id,
          type: activeTerms.type,
          version: activeTerms.version,
          title: activeTerms.title,
          content: activeTerms.content,
          contentHash: activeTerms.contentHash,
        });
      }
    }

    if (activePrivacy) {
      const acceptedPrivacy = await prisma.legalAcceptance.findFirst({
        where: {
          userId,
          documentType: LegalDocumentType.PRIVACY,
          documentVersion: activePrivacy.version,
        },
        orderBy: { acceptedAt: "desc" },
      });

      if (!acceptedPrivacy) {
        pendingDocuments.push({
          id: activePrivacy.id,
          type: activePrivacy.type,
          version: activePrivacy.version,
          title: activePrivacy.title,
          content: activePrivacy.content,
          contentHash: activePrivacy.contentHash,
        });
      }
    }

    return {
      isCompliant: pendingDocuments.length === 0,
      pendingDocuments,
    };
  }
}
