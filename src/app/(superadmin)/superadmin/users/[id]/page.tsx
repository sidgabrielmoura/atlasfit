"use client"

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Mail,
  ShieldAlert,
  Building2,
  CreditCard,
  LogIn,
  AlertCircle,
  Ban,
  Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function StatSkeleton() {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserDeepViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isTogglingRole, setIsTogglingRole] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/superadmin/users/${unwrappedParams.id}`);
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
      } catch (error) {
        toast.error("Erro ao carregar os dados do usuário.");
        router.push("/superadmin/users");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [unwrappedParams.id, router]);

  const handleImpersonate = async () => {
    setIsImpersonating(true);
    const toastId = toast.loading("Gerando token de acesso...");
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id })
      });
      if (!res.ok) throw new Error("Falha ao gerar token");
      const { token } = await res.json();

      toast.loading("Realizando login seguro...", { id: toastId });
      
      const result = await signIn("credentials", {
        impersonateToken: token,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Login realizado com sucesso!", { id: toastId });
      // Redireciona o superadmin direto pra base da plataforma para ver as permissões do usuário
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      toast.error("Erro ao tentar acessar a conta.", { id: toastId });
      setIsImpersonating(false);
    }
  };

  const handleToggleRole = async () => {
    setIsTogglingRole(true);
    try {
      const newRole = user.role === "SUPERADMIN" ? "USER" : "SUPERADMIN";
      const res = await fetch(`/api/superadmin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error("Erro na atualização");
      setUser({ ...user, role: newRole });
      toast.success(`Role alterada para ${newRole}!`);
    } catch (error) {
      toast.error("Erro ao alterar as permissões globais.");
    } finally {
      setIsTogglingRole(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-secondary/30 hover:bg-secondary">
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 border border-primary/20 text-lg uppercase">
              {user.name?.substring(0, 2) || user.email?.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight">{user.name || "Sem Nome"}</h1>
                <Badge className={cn(
                  "font-bold uppercase tracking-wider border",
                  user.role === "SUPERADMIN" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}>
                  {user.role}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm font-medium mt-1">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="h-11 rounded-xl font-bold gap-2 shadow-sm border-border/60"
              >
                <ShieldAlert className="size-4 text-primary" />
                Alterar Role Global
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-border/50">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black text-xl flex items-center gap-2">
                  <ShieldAlert className="size-5 text-primary" />
                  Tem certeza?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                  {user.role === "SUPERADMIN" 
                    ? "Você está prestes a REVOGAR o acesso de SuperAdmin deste usuário. Ele voltará a ser um usuário comum."
                    : "Você está prestes a CONCEDER acesso irrestrito de SuperAdmin a este usuário. Ele poderá ver todos os workspaces, planos e excluir dados globais."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-2">
                <AlertDialogCancel className="rounded-xl font-bold h-11">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleToggleRole} 
                  disabled={isTogglingRole}
                  className={`rounded-xl h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90`}
                >
                  {isTogglingRole ? "Alterando..." : "Confirmar Alteração"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="h-11 rounded-xl font-black gap-2 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="size-4" />
                Login As (Acessar)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-border/50">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black text-xl flex items-center gap-2">
                  <AlertCircle className="size-5 text-destructive" />
                  Aviso de Segurança (Auditoria)
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                  Você está prestes a entrar na plataforma <strong>como se fosse {user.name} ({user.email})</strong>. 
                  Qualquer ação tomada dentro do workspace deste usuário será registrada como se ele próprio tivesse feito. Use com extrema cautela e apenas para suporte.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-2">
                <AlertDialogCancel className="rounded-xl font-bold h-11">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleImpersonate} 
                  disabled={isImpersonating}
                  className="rounded-xl h-11 font-black bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isImpersonating ? (
                    <><Loader2 className="size-4 animate-spin mr-2"/> Gerando Sessão...</>
                  ) : "Sim, Entrar como Usuário"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Workspaces List */}
        <Card className="border-border/40 shadow-sm bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-primary" /> Workspaces Vinculados
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">Onde este usuário tem acesso</CardDescription>
          </CardHeader>
          <CardContent>
            {user.workspaces?.length > 0 ? (
              <div className="space-y-4">
                {user.workspaces.map((wm: any) => (
                  <div key={wm.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-secondary/20 transition-colors">
                    <div>
                      <p className="font-bold text-sm">{wm.workspace.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">ID: {wm.workspace.id}</p>
                    </div>
                    <Badge variant="outline" className="font-semibold uppercase text-[10px]">{wm.role}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-border/60 rounded-xl">
                <p className="text-sm font-medium text-muted-foreground">O usuário não faz parte de nenhum workspace.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions List */}
        <Card className="border-border/40 shadow-sm bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="size-5 text-primary" /> Assinaturas Ativas
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">Planos contratados pelo usuário</CardDescription>
          </CardHeader>
          <CardContent>
            {user.subscriptions?.length > 0 ? (
              <div className="space-y-4">
                {user.subscriptions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-secondary/20 transition-colors">
                    <div>
                      <p className="font-bold text-sm">{sub.plan.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Workspace: {sub.workspace.name}</p>
                    </div>
                    <Badge className={cn("font-semibold uppercase text-[10px]", sub.status.toLowerCase() === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border border-dashed border-border/60 rounded-xl">
                <p className="text-sm font-medium text-muted-foreground">Nenhuma assinatura ativa.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overlay de Transição de Conta (Impersonate) */}
      {isImpersonating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6 py-8 rounded-2xl border border-border/50 bg-card shadow-2xl">
            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 animate-bounce">
              <LogIn className="size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight">Transição de Conta</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                Estabelecendo login seguro...
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1 font-medium">
                Acessando o ecossistema do AtlasFit com as credenciais do usuário para suporte. Por favor, aguarde.
              </p>
            </div>
            <Loader2 className="size-6 text-primary animate-spin mt-2" />
          </div>
        </div>
      )}
    </div>
  );
}
