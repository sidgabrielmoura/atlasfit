import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { LegalDocumentType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ShieldCheck, Lock, Calendar, Hash, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
  const doc = await LegalAcceptanceService.getActiveDocument(LegalDocumentType.PRIVACY);

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4 mr-2" />
            Voltar ao início
          </Link>
          <Badge variant="outline" className="gap-1.5 py-1 px-3">
            <Lock className="size-3.5 text-primary" />
            Conformidade LGPD (Lei 13.709/2018)
          </Badge>
        </div>

        <Card className="border-border/60 shadow-xl bg-card/80 backdrop-blur-md">
          <CardHeader className="space-y-4 border-b border-border/40 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {doc?.title || "Política de Privacidade do AtlasFit"}
                </CardTitle>
                <CardDescription className="text-base">
                  Transparência integral sobre o tratamento de dados pessoais, saúde, biometria e direitos dos titulares.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
                Versão {doc?.version || "1.0"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-lg">
                <Calendar className="size-4 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-foreground">Vigência</div>
                  <div>{doc?.effectiveAt ? new Date(doc.effectiveAt).toLocaleDateString("pt-BR") : "01/03/2026"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-lg sm:col-span-2">
                <Hash className="size-4 text-primary shrink-0" />
                <div className="overflow-hidden">
                  <div className="font-semibold text-foreground">Assinatura Digital (SHA-256)</div>
                  <div className="font-mono text-[11px] truncate">{doc?.contentHash || "Calculando..."}</div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-8 prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
            <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed">
              {doc?.content}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} AtlasFit SaaS. Todos os direitos reservados.</p>
          <div className="flex justify-center space-x-4">
            <Link href="/termos-de-uso" className="hover:underline text-primary">
              Termos de Uso
            </Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:underline text-primary">
              Central de Privacidade (LGPD)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
