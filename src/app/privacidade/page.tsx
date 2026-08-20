import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldCheck, UserCheck, Download, Trash2, Mail, Lock, ArrowLeft, ExternalLink, HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PrivacyCenterPage() {
  const dpoEmail = "hello@atlasfit.site";

  const rights = [
    {
      title: "Confirmação e Acesso",
      desc: "Confirme a existência de tratamento e obtenha cópia estruturada dos seus dados pessoais.",
      icon: UserCheck,
    },
    {
      title: "Portabilidade de Dados (Exportação)",
      desc: "Baixe um arquivo JSON com seu histórico completo de treinos, evolução física e pagamentos.",
      icon: Download,
    },
    {
      title: "Eliminação e Expurgo",
      desc: "Solicite a exclusão definitiva dos seus dados e arquivos de mídia armazenados no sistema.",
      icon: Trash2,
    },
    {
      title: "Revogação de Consentimento",
      desc: "Altere a qualquer momento suas preferências de recebimento de e-mails ou mensagens promocionais.",
      icon: Lock,
    },
  ];

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
            <ShieldCheck className="size-3.5 text-primary" />
            Central do Titular
          </Badge>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Central de Privacidade e Dados</h1>
          <p className="text-muted-foreground text-base max-w-2xl">
            No AtlasFit, a segurança, privacidade e governança dos seus dados pessoais e de saúde são tratadas com o mais alto rigor técnico e transparência jurídica.
          </p>
        </div>

        {/* Rights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rights.map((r, i) => {
            const Icon = r.icon;
            return (
              <Card key={i} className="border-border/50 bg-card/60">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold">{r.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">{r.desc}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Quick Links & DPO Channel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="border-border/60 bg-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileTextIcon className="size-4 text-primary" />
                Documentos Oficiais
              </CardTitle>
              <CardDescription className="text-xs">
                Acesse as versões vigentes dos nossos instrumentos jurídicos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/termos-de-uso"
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:border-primary/50 transition-all text-sm font-medium"
              >
                <span>Termos de Uso</span>
                <ExternalLink className="size-4 text-muted-foreground" />
              </Link>
              <Link
                href="/politica-de-privacidade"
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:border-primary/50 transition-all text-sm font-medium"
              >
                <span>Política de Privacidade</span>
                <ExternalLink className="size-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Mail className="size-4 text-primary" />
                Canal do Encarregado (DPO)
              </CardTitle>
              <CardDescription className="text-xs">
                Atendimento direto para dúvidas, solicitações ou comunicações de incidentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-xl bg-card border border-border/40 space-y-1">
                <div className="text-xs text-muted-foreground">E-mail oficial do Encarregado de Dados:</div>
                <div className="font-mono text-sm font-semibold text-primary select-all">{dpoEmail}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Usuários autenticados também podem gerenciar seus consentimentos e baixar seus dados diretamente na aba{" "}
                <span className="font-semibold text-foreground">Privacidade e Dados</span> dentro das configurações de perfil.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 space-y-1">
          <p>© {new Date().getFullYear()} AtlasFit SaaS • Plataforma exclusiva para maiores de 18 anos.</p>
        </div>
      </div>
    </div>
  );
}

function FileTextIcon(props: any) {
  return <ShieldCheck {...props} />;
}
