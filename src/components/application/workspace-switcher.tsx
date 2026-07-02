"use client";
import * as React from "react";
import { ChevronsUpDown, Plus, Check, Loader2, Sparkles, Building, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPersonalWorkspaces, getAvailablePlans, createWorkspace, getTrainerWorkspaceLimit } from "./actions";
import { useSnapshot } from "valtio";
import { workspaceStore, workspaceActions } from "@/stores/workspace.store";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/--+/g, "-") // Replace multiple hyphens
    .trim();
}

export function WorkspaceSwitcher() {
  const { isMobile } = useSidebar();
  const snap = useSnapshot(workspaceStore);

  const [plansList, setPlansList] = React.useState<any[]>([]);
  const [limitData, setLimitData] = React.useState<{ current: number; limit: number; planName: string; primaryDomain?: string } | null>(null);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isUpgradeWarningOpen, setIsUpgradeWarningOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [isSlugManual, setIsSlugManual] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      workspaceActions.setLoading(true);
      try {
        const [workspacesData, plansData, limitRes] = await Promise.all([
          getPersonalWorkspaces(),
          getAvailablePlans(),
          getTrainerWorkspaceLimit(),
        ]);
        workspaceActions.setWorkspaces(workspacesData);
        setPlansList(plansData);
        setLimitData(limitRes);
      } catch (err) {
        console.error("Failed to load switcher data:", err);
      } finally {
        workspaceActions.setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugManual) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setIsSlugManual(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, informe o nome do workspace.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createWorkspace({
        name,
        slug: slug.trim() || undefined,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Workspace criado com sucesso! 🎉");

      // Reload workspaces list, limit details and select newly created workspace
      const [updated, limitRes] = await Promise.all([
        getPersonalWorkspaces(),
        getTrainerWorkspaceLimit(),
      ]);
      workspaceActions.setWorkspaces(updated);
      setLimitData(limitRes);

      const newWs = updated.find((w: any) => w.id === res.workspace?.id) || res.workspace;
      if (newWs) {
        workspaceActions.setActiveWorkspace(newWs);
      }

      // Reset modal state
      setIsCreateOpen(false);
      setName("");
      setSlug("");
      setIsSlugManual(false);
    } catch (err) {
      console.error(err);
      toast.error("Ocorreu um erro ao criar o workspace. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (snap.isLoading && snap.workspaces.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-neutral-400/5 animate-pulse">
            <div className="size-8 rounded-lg bg-neutral-400/20 shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-4 w-28 bg-neutral-400/20 rounded" />
              <div className="h-3 w-16 bg-neutral-400/20 rounded" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }


  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              >
                {snap.activeWorkspace ? (
                  <>
                    <div
                      className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground font-bold text-sm shrink-0 overflow-hidden"
                      style={{ backgroundColor: snap.activeWorkspace.primaryColor }}
                    >
                      {snap.activeWorkspace.logoUrl ? (
                        <img
                          src={snap.activeWorkspace.logoUrl}
                          alt={snap.activeWorkspace.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span>{snap.activeWorkspace.logo}</span>
                      )}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden min-w-0">
                      <span className="truncate font-semibold">
                        {snap.activeWorkspace.name}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        {snap.activeWorkspace.plan}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                      <Plus className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden min-w-0">
                      <span className="truncate font-semibold text-muted-foreground">Adicionar Workspace</span>
                    </div>
                  </>
                )}
                <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-2"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center justify-between px-2.5 py-2">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Workspaces</span>
                {limitData && limitData.limit > 1 && (
                  <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {limitData.current} de {limitData.limit}
                  </span>
                )}
              </DropdownMenuLabel>
              {snap.workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => workspaceActions.setActiveWorkspace(workspace)}
                  className="gap-2 p-2 rounded-xl cursor-pointer"
                >
                  <div
                    className="flex size-6 items-center justify-center rounded-md border text-[10px] font-bold text-white shrink-0 overflow-hidden"
                    style={{ backgroundColor: workspace.primaryColor, borderColor: workspace.primaryColor }}
                  >
                    {workspace.logoUrl ? (
                      <img
                        src={workspace.logoUrl}
                        alt={workspace.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      workspace.logo
                    )}
                  </div>
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {snap.activeWorkspace?.id === workspace.id && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  if (limitData && limitData.current >= limitData.limit) {
                    setIsUpgradeWarningOpen(true);
                  } else {
                    setIsCreateOpen(true);
                  }
                }}
                className="gap-2 p-2 rounded-xl cursor-pointer"
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-background shrink-0">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">Adicionar Workspace</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Premium Create Workspace Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-125 rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              Criar Novo Workspace
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Crie uma nova marca de assessoria esportiva. Todos os seus alunos, treinos e finanças serão organizados de forma independente neste espaço.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-4">
              {/* Workspace Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Nome da Marca / Assessoria
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="ex: Silva Assessoria Esportiva"
                    className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              {/* Workspace Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-semibold">
                  Endereço Exclusivo (Slug)
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="slug"
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="silva-assessoria"
                    className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all font-mono text-sm"
                    required
                  />
                </div>
                {slug && (
                  <p className="text-[11px] text-muted-foreground px-1">
                    Link do portal: <span className="text-primary font-semibold">{limitData?.primaryDomain || "atlasfit.app"}/t/{slug}</span>
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando Workspace...
                  </>
                ) : (
                  <>
                    Confirmar e Criar Brand
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpgradeWarningOpen} onOpenChange={setIsUpgradeWarningOpen}>
        <DialogContent className="sm:max-w-112.5 rounded-2xl! border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="space-y-2 text-center flex flex-col items-center">
            <DialogTitle className="text-2xl font-black tracking-tight">
              Limite de Workspaces Atingido
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-[350px]">
              Seu plano atual (<strong className="text-foreground">{limitData?.planName}</strong>) permite no máximo <strong className="text-foreground">{limitData?.limit} workspace(s)</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Planos Recomendados</div>
            {plansList
              .filter((p) => p.maxWorkspaces > (limitData?.limit || 1))
              .map((plan) => (
                <div key={plan.id} className="p-3.5 rounded-xl bg-background border border-border/30 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{plan.name}</span>
                    <span className="text-[10px] text-muted-foreground">Permite até {plan.maxWorkspaces} workspaces</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-primary">R$ {plan.price}</div>
                    <div className="text-[9px] text-muted-foreground">/mês</div>
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col!">
            <Button
              onClick={() => {
                toast.success("Solicitação de upgrade enviada com sucesso! 🚀 Nosso time entrará em contato.");
                setIsUpgradeWarningOpen(false);
              }}
              className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/15 gap-2 cursor-pointer bg-primary text-primary-foreground"
            >
              Fazer Upgrade do Plano
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsUpgradeWarningOpen(false)}
              className="w-full h-11 rounded-xl text-xs font-bold text-muted-foreground cursor-pointer"
            >
              Voltar ao Início
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
