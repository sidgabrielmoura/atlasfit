import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      bio?: string | null;
      specialty?: string | null;
      whatsapp?: string | null;
      instagram?: string | null;
      linkedin?: string | null;
      city?: string | null;
      experience?: string | null;
      cref?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    bio?: string | null;
    specialty?: string | null;
    whatsapp?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    city?: string | null;
    experience?: string | null;
    cref?: string | null;
  }

  interface AdapterUser {
    role?: string;
    bio?: string | null;
    specialty?: string | null;
    whatsapp?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    city?: string | null;
    experience?: string | null;
    cref?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
  }
}
