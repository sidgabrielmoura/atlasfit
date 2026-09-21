"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Lock,
  Phone,
  CreditCard,
  Calendar,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  CheckCircle2,
} from "lucide-react";

interface EditUserDialogProps {
  user: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedUser: any) => void;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("TRAINER");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && open) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPassword("");
      setShowPassword(false);
      setRole(user.role || "TRAINER");
      setWhatsapp(user.whatsapp || "");
      setCpfCnpj(user.cpfCnpj || "");
      setGender(user.gender || "none");

      if (user.birthDate) {
        try {
          const d = new Date(user.birthDate);
          if (!isNaN(d.getTime())) {
            setBirthDate(d.toISOString().split("T")[0]);
          } else {
            setBirthDate("");
          }
        } catch {
          setBirthDate("");
        }
      } else {
        setBirthDate("");
      }
    }
  }, [user, open]);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let gen = "";
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(gen);
    setShowPassword(true);
    toast.info("Senha temporária gerada! Não se esqueça de salvá-la.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      toast.error("O nome do usuário é obrigatório.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Insira um endereço de e-mail válido.");
      return;
    }

    if (password.trim() && password.trim().length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Atualizando dados do usuário...");

    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        whatsapp: whatsapp.trim() || null,
        cpfCnpj: cpfCnpj.trim() || null,
        birthDate: birthDate ? new Date(birthDate).toISOString() : null,
        gender: gender && gender !== "none" ? gender : null,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await fetch(`/api/superadmin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao atualizar usuário.");
      }

      toast.success("Dados do usuário atualizados com sucesso!", { id: toastId });
      onSuccess?.(data);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao atualizar usuário.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-3xl! border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
        <DialogHeader className="space-y-1.5 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <User className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">
                Editar Dados do Usuário
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Altere informações cadastrais, e-mail e credenciais de acesso de {user?.name || user?.email}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Seção 1: Informações Principais */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5" /> Identificação & Acesso
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-bold">
                  Nome Completo *
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do usuário"
                  required
                  disabled={isSubmitting}
                  className="rounded-xl h-11 border-border/60 bg-background text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs font-bold">
                  E-mail de Login *
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                  disabled={isSubmitting}
                  className="rounded-xl h-11 border-border/60 bg-background text-sm font-semibold"
                />
              </div>
            </div>

            {/* Senha de Acesso */}
            <div className="p-4 rounded-2xl bg-secondary/20 border border-border/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-password" className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="size-3.5 text-primary" /> Redefinir Senha de Acesso
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateRandomPassword}
                  disabled={isSubmitting}
                  className="h-7 text-[11px] font-bold gap-1 text-primary hover:text-primary/80 hover:bg-primary/10 px-2 rounded-lg cursor-pointer"
                >
                  Gerar Senha Segura
                </Button>
              </div>

              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha (mínimo 6 caracteres)"
                  disabled={isSubmitting}
                  className="rounded-xl h-11 border-border/60 bg-background pr-10 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Deixe em branco caso queira <strong>manter a senha atual</strong> do usuário inalterada.
              </p>
            </div>
          </div>

          {/* Seção 2: Permissões e Perfil */}
          <div className="space-y-4 pt-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="size-3.5" /> Perfil & Permissões
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-role" className="text-xs font-bold">
                  Tipo de Conta (Role Global)
                </Label>
                <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
                  <SelectTrigger id="edit-role" className="rounded-xl h-11 border-border/60 bg-background font-bold text-xs">
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="TRAINER" className="font-bold text-xs">
                      Personal Trainer (TRAINER)
                    </SelectItem>
                    <SelectItem value="STUDENT" className="font-bold text-xs">
                      Aluno (STUDENT)
                    </SelectItem>
                    <SelectItem value="SUPERADMIN" className="font-bold text-xs text-rose-500">
                      Super Administrador (SUPERADMIN)
                    </SelectItem>
                    <SelectItem value="USER" className="font-bold text-xs">
                      Usuário Geral (USER)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-gender" className="text-xs font-bold">
                  Gênero
                </Label>
                <Select value={gender} onValueChange={setGender} disabled={isSubmitting}>
                  <SelectTrigger id="edit-gender" className="rounded-xl w-full h-11 border-border/60 bg-background font-semibold text-xs">
                    <SelectValue placeholder="Selecione o gênero" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="none" className="font-medium text-xs text-muted-foreground">
                      Não especificado
                    </SelectItem>
                    <SelectItem value="Masculino" className="font-semibold text-xs">
                      Masculino
                    </SelectItem>
                    <SelectItem value="Feminino" className="font-semibold text-xs">
                      Feminino
                    </SelectItem>
                    <SelectItem value="Outro" className="font-semibold text-xs">
                      Outro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 3: Contato & Dados Complementares */}
          <div className="space-y-4 pt-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" /> Contato & Documento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-whatsapp" className="text-xs font-bold">
                  WhatsApp / Telefone
                </Label>
                <Input
                  id="edit-whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={isSubmitting}
                  className="rounded-xl h-11 border-border/60 bg-background text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-cpf" className="text-xs font-bold">
                  CPF / CNPJ
                </Label>
                <Input
                  id="edit-cpf"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder="000.000.000-00"
                  disabled={isSubmitting}
                  className="rounded-xl h-11 border-border/60 bg-background text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-birth" className="text-xs font-bold">
                  Data de Nascimento
                </Label>
                <Input
                  id="edit-birth"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={isSubmitting}
                  className="rounded-xl h-11 border-border/60 bg-background text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 pt-4 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl h-11 text-xs font-bold border-border cursor-pointer flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-11 text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-md shadow-primary/20 cursor-pointer flex-1 gap-2 active:scale-95 transition-transform"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando alterações...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
