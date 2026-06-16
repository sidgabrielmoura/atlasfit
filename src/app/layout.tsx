import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { ImpersonationBanner } from "@/components/application/impersonation-banner";

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import prisma from "@/lib/prisma";
import { PWARegister } from "@/components/pwa-register";

export const viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  let platformName = "AtlasFit";
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "platform_name" }
    });
    if (setting?.value) {
      platformName = setting.value;
    }
  } catch (error) {
    // Fail silently in build if DB is not set up yet
  }

  const title = `${platformName} — Gestão Inteligente para Personal Trainers`;
  const description = "Plataforma completa para personal trainers gerenciarem alunos, treinos, finanças e performance com inteligência de dados.";
  const siteUrl = "https://atlasfit.app"; // Domain for SEO

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    manifest: "/manifest.json",
    icons: {
      icon: "/logos_atlasfit/favicon.ico",
      apple: "/logos_atlasfit/favicon.ico",
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: platformName,
      type: "website",
      images: [
        {
          url: "/logos_atlasfit/atlasfit (4).png",
          width: 1024,
          height: 1024,
          alt: `${platformName} — Gestão Inteligente para Personal Trainers`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logos_atlasfit/atlasfit (4).png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", figtree.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col transition-colors duration-500 ease-in-out">
        <Providers>
          <PWARegister />
          <ImpersonationBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
