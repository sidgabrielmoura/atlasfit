"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Plus, LogOut, Flame } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { workspaceActions } from "@/stores/workspace.store";

interface WorkspaceProps {
  id: string;
  name: string;
  slug: string;
  logo: string;
  logoUrl?: string | null;
  primaryColor: string;
  plan: string;
}

interface SelectWorkspaceClientProps {
  workspaces: WorkspaceProps[];
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function SelectWorkspaceClient({ workspaces, user }: SelectWorkspaceClientProps) {
  const router = useRouter();

  const userInitials = user.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "U";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/student" });
  };

  const handleSelectWorkspace = (workspace: WorkspaceProps) => {
    // 1. Set active workspace cookie for Server-side parsing
    document.cookie = `student_active_workspace_id=${workspace.id}; path=/; max-age=31536000; SameSite=Lax`;

    // 2. Set active workspace inside Valtio client store
    workspaceActions.setWorkspaces(workspaces);
    workspaceActions.setActiveWorkspace(workspace);

    // 3. Redirect to dashboard
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-5xl px-4 md:px-6 py-12 relative z-10">
        <div className="text-center space-y-6 mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center"
          >
            <Image
              src="/logos_atlasfit/atlasfit (4).png"
              alt="AtlasFit Logo"
              width={180}
              height={60}
              priority
              className="object-contain"
            />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Bem-vindo, <span className="text-primary">{user.name?.split(" ")[0] || "Aluno"}</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Selecione em qual assessoria você deseja entrar agora para gerenciar seus treinos.
            </p>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-6 max-w-md mx-auto border border-dashed border-border/50 bg-card/30 backdrop-blur-sm rounded-2xl space-y-6"
          >
            <div className="p-4 size-16 mx-auto rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <Flame className="size-8 opacity-40" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Nenhuma assessoria vinculada</h3>
              <p className="text-sm text-muted-foreground">
                Sua conta ainda não está associada a nenhuma assessoria ou personal trainer ativo. Entre em contato com seu treinador.
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Entrar com outra conta
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {workspaces.map((workspace, index) => (
              <motion.div
                key={workspace.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  onClick={() => handleSelectWorkspace(workspace)}
                  className="h-full cursor-pointer"
                >
                  <Card className="h-full hover:border-primary/50 transition-all duration-300 group hover:bg-primary/5 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
                    <CardContent className="p-6 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-6 flex-1">
                      <div
                        className="flex aspect-square size-14 md:size-16 items-center justify-center rounded-2xl text-white font-bold text-xl md:text-2xl shadow-md transition-transform group-hover:scale-110 duration-300 overflow-hidden"
                        style={{ backgroundColor: workspace.primaryColor }}
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
                      <div className="flex-1 min-w-0 md:w-full">
                        <p className="font-bold text-xl truncate group-hover:text-primary transition-colors">
                          {workspace.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                            Plano {workspace.plan}
                          </span>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-2 text-primary font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity mt-auto pt-4">
                        Acessar Workspace <ChevronRight className="size-4" />
                      </div>
                      <ChevronRight className="md:hidden size-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: workspaces.length * 0.1 }}
            >
              <Button variant="outline" className="w-full h-full min-h-[120px] md:min-h-[160px] border-dashed rounded-2xl gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group flex-col p-6">
                <div className="p-3 rounded-full bg-secondary group-hover:bg-primary/10 transition-colors">
                  <Plus className="size-6" />
                </div>
                <span className="font-semibold">Entrar em outra assessoria</span>
              </Button>
            </motion.div>
          </div>
        )}

        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 pt-12 mt-12 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border border-border/50">
              <AvatarImage src={user.image || ""} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold">{user.email}</p>
              <p className="text-xs text-muted-foreground">Conta Global AtlasFit</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
