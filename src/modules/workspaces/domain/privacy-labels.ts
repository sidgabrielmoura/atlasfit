const types: Record<string, string> = { ACCESS: "Acesso aos dados", PORTABILITY: "Portabilidade", CORRECTION: "Correção", DELETION: "Exclusão", CONSENT_REVOCATION: "Revogação de consentimento", INFORMATION: "Informações", OTHER: "Outro pedido" };
const statuses: Record<string, string> = { PENDING: "Recebido", IDENTITY_VERIFICATION: "Conferência de identidade", IN_REVIEW: "Em análise", PROCESSING: "Em processamento", COMPLETED: "Concluído", PARTIALLY_COMPLETED: "Atendido com retenções", REJECTED: "Encerrado com justificativa" };
export const privacyTypeLabel = (value: string) => types[value] || "Solicitação de privacidade";
export const privacyStatusLabel = (value: string) => statuses[value] || "Aguardando análise";
