"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { cn } from "@/lib/utils";
import { superAdminStore } from "@/stores/superadmin.store";
import {
  LayoutDashboard,
  Users,
  Building2,
  DollarSign,
  Dumbbell,
  BadgeCheck,
  Database,
  Settings,
  Search,
  ArrowRight,
  Tag,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const NAV_PAGES = [
  { label: "Dashboard Global", href: "/superadmin/dashboard", icon: LayoutDashboard, description: "Métricas e visão geral" },
  { label: "Usuários", href: "/superadmin/users", icon: Users, description: "Gestão de acessos globais" },
  { label: "Workspaces", href: "/superadmin/workspaces", icon: Building2, description: "Estabelecimentos cadastrados" },
  { label: "Financeiro", href: "/superadmin/finance", icon: DollarSign, description: "Receitas e assinaturas" },
  { label: "Exercícios", href: "/superadmin/exercises", icon: Dumbbell, description: "Biblioteca global de exercícios" },
  { label: "Assinaturas", href: "/superadmin/subscriptions", icon: BadgeCheck, description: "Planos e cobranças" },
  { label: "Logs & Auditoria", href: "/superadmin/logs", icon: Database, description: "Registros do sistema" },
  { label: "Configurações", href: "/superadmin/settings", icon: Settings, description: "Configurações da plataforma" },
];

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const snap = useSnapshot(superAdminStore);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 border border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer group"
      >
        <Search className="size-3.5 group-hover:text-primary transition-colors" />
        <span className="text-xs font-semibold">Pesquisar...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded-md border border-border/60 bg-muted/80 px-1.5 font-mono text-[10px] font-medium">
          <span>⌘</span>K
        </kbd>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen} className="top-1/2 -translate-y-1/2 max-w-2xl">
        <Command className="rounded-none bg-transparent">
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <CommandInput
              placeholder="Pesquisar páginas, usuários, exercícios..."
              className="border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground/60 focus:ring-0"
            />
          </div>

          <CommandList className="max-h-[420px] overflow-y-auto p-2">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="size-12 rounded-2xl bg-secondary/80 flex items-center justify-center">
                  <Search className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Nenhum resultado encontrado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tente um nome diferente</p>
                </div>
              </div>
            </CommandEmpty>

            <CommandGroup
              heading={
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                  Navegação
                </span>
              }
            >
              {NAV_PAGES.map((page) => (
                <CommandItem
                  key={page.href}
                  onSelect={() => runCommand(() => router.push(page.href))}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer justify-between w-full"
                >
                  <div className="size-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-data-selected:bg-primary/10 transition-colors">
                    <page.icon className="size-4 text-muted-foreground group-data-selected:text-primary transition-colors" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold leading-none">{page.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 truncate">{page.description}</span>
                  </div>
                  <ArrowRight className="size-3.5 ml-auto text-muted-foreground/40 group-data-selected:text-primary group-data-selected:translate-x-0.5 transition-all" />
                </CommandItem>
              ))}
            </CommandGroup>

            {snap.users && snap.users.length > 0 && (
              <>
                <CommandSeparator className="my-2" />
                <CommandGroup
                  heading={
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                      Usuários
                    </span>
                  }
                >
                  {(snap.users as any[]).slice(0, 6).map((user: any) => {
                    const initials = (user.name || user.email || "?")
                      .split(" ")
                      .slice(0, 2)
                      .map((w: string) => w[0])
                      .join("")
                      .toUpperCase();
                    const roleColor =
                      user.role === "SUPERADMIN"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-emerald-500/10 text-emerald-600";
                    return (
                      <CommandItem
                        key={user.id}
                        value={`${user.name} ${user.email}`}
                        onSelect={() =>
                          runCommand(() =>
                            router.push(`/superadmin/users?q=${encodeURIComponent(user.name)}`)
                          )
                        }
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer"
                      >
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black shrink-0">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold leading-none truncate">{user.name || "Sem nome"}</span>
                          <span className="text-[11px] text-muted-foreground mt-0.5 truncate">{user.email}</span>
                        </div>
                        <span className={cn("ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0", roleColor)}>
                          {user.role}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}

            {snap.exercises && snap.exercises.length > 0 && (
              <>
                <CommandSeparator className="my-2" />
                <CommandGroup
                  heading={
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                      Exercícios
                    </span>
                  }
                >
                  {(snap.exercises as any[]).slice(0, 6).map((exercise: any) => (
                    <CommandItem
                      key={exercise.id}
                      value={`${exercise.name} ${exercise.muscleGroups && exercise.muscleGroups.length > 0 ? exercise.muscleGroups.map((g: any) => g.name).join(" ") : (exercise.muscleGroup?.name ?? "")}`}
                      onSelect={() =>
                        runCommand(() =>
                          router.push(`/superadmin/exercises?q=${encodeURIComponent(exercise.name)}`)
                        )
                      }
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer"
                    >
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="size-4 text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold leading-none truncate">{exercise.name}</span>
                        {exercise.muscleGroups && exercise.muscleGroups.length > 0 ? (
                          <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Tag className="size-2.5" />
                            {exercise.muscleGroups.map((g: any) => g.name).join(", ")}
                          </span>
                        ) : exercise.muscleGroup?.name ? (
                          <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Tag className="size-2.5" />
                            {exercise.muscleGroup.name}
                          </span>
                        ) : null}
                      </div>
                      <ArrowRight className="size-3.5 ml-auto text-muted-foreground/40 group-data-selected:text-primary group-data-selected:translate-x-0.5 transition-all" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          <div className="border-t border-border/40 px-4 py-2.5 flex items-center gap-4 text-[11px] text-muted-foreground/60">
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex h-4 items-center rounded border border-border/50 bg-muted/60 px-1 font-mono text-[10px]">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex h-4 items-center rounded border border-border/50 bg-muted/60 px-1 font-mono text-[10px]">↵</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex h-4 items-center rounded border border-border/50 bg-muted/60 px-1 font-mono text-[10px]">Esc</kbd>
              fechar
            </span>
            <span className="ml-auto opacity-50">AtlasFit Admin</span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
