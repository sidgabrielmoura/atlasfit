import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { 
  handlers: { GET, POST }, 
  auth, 
  signIn, 
  signOut 
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (credentials?.impersonateToken) {
          const dbToken = await prisma.verificationToken.findFirst({
            where: {
              token: credentials.impersonateToken as string,
              identifier: { startsWith: "IMPERSONATION:" },
              expires: { gt: new Date() }
            }
          });

          if (!dbToken) return null;

          // Remove the token after first use to ensure it's one-time
          await prisma.verificationToken.delete({
            where: { token: dbToken.token }
          });

          const parts = dbToken.identifier.split(":");
          const targetEmail = parts[1] || (credentials.email as string);
          const originalAdminEmail = parts[2] || "";

          // Se não houver originalAdminEmail, significa que é o administrador voltando para a própria conta
          const isImpersonated = !!originalAdminEmail && originalAdminEmail !== targetEmail;

          const user = await prisma.user.findUnique({
            where: { email: targetEmail }
          });

          if (!user) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isImpersonated,
            originalAdminEmail,
          };
        }

        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.password) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) return null;

        // Verificar modo de manutenção para logins diretos (não impersonados)
        const maintenanceSetting = await prisma.systemSetting.findUnique({
          where: { key: "maintenance_mode" }
        });

        if (maintenanceSetting?.value === "true" && user.role !== "SUPERADMIN") {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;

        if (token.isImpersonated) {
          (session.user as any).isImpersonated = true;
          (session.user as any).originalAdminEmail = token.originalAdminEmail;
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            name: true,
            image: true,
            bio: true,
            specialty: true,
            whatsapp: true,
            instagram: true,
            linkedin: true,
            city: true,
            experience: true,
            cref: true,
          }
        });

        if (dbUser) {
          session.user.name = dbUser.name;
          session.user.image = dbUser.image;
          session.user.bio = dbUser.bio;
          session.user.specialty = dbUser.specialty;
          session.user.whatsapp = dbUser.whatsapp;
          session.user.instagram = dbUser.instagram;
          session.user.linkedin = dbUser.linkedin;
          session.user.city = dbUser.city;
          session.user.experience = dbUser.experience;
          session.user.cref = dbUser.cref;
        } else {
          // If the user exists in the token but is not found in the database (e.g., after a database reset/seed),
          // invalidate the session to prevent errors and force a re-login.
          return null as any;
        }
      }
      return session;
    },
  },
});
