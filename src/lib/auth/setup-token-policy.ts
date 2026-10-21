// Shared lifetime for newly issued invitations; legacy links without expiry need reissue.
export const SETUP_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
export function newSetupTokenExpiry(now = new Date()): Date { return new Date(now.getTime() + SETUP_TOKEN_TTL_MS); }
