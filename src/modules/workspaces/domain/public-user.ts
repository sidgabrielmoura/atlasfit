import type { Prisma } from "@prisma/client";

/** Identity fields needed by operational gym DTOs. Authentication material is never selected. */
export const gymPublicUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  cpfCnpj: true,
  whatsapp: true,
  birthDate: true,
  gender: true,
} satisfies Prisma.UserSelect;
