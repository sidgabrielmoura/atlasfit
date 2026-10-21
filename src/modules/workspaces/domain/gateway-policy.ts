import { WorkspaceAccessError } from "./types";

export function rejectActiveGymGateway(): never {
  throw new WorkspaceAccessError(410, "GYM_GATEWAY_RETIRED", "A academia opera com mensalidades internas e baixa manual. Operações externas legadas exigem consulta e transição administrativa específica.");
}
