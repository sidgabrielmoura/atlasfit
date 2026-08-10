"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wallet, ShieldCheck, ArrowRight, ArrowLeft, Check, Sparkles, User, MapPin, Phone, FileText, Loader2, Search } from "lucide-react";

interface WalletOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail?: string;
  userName?: string;
}

export function WalletOnboardingModal({
  isOpen,
  onClose,
  onSuccess,
  userEmail = "",
  userName = ""
}: WalletOnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [province, setProvince] = useState("");
  const [companyType, setCompanyType] = useState("INDIVIDUAL");

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, "$1-$2");
  };

  const fetchAddressByCep = async (cepDigits: string) => {
    if (cepDigits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setAddress(data.logradouro);
          if (data.bairro) setProvince(data.bairro);
        } else {
          toast.error("CEP não localizado. Preencha o endereço manualmente.");
        }
      }
    } catch {
      toast.error("Erro ao consultar CEP.");
    } finally {
      setFetchingCep(false);
    }
  };

  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfCnpj(formatCpfCnpj(e.target.value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMobilePhone(formatPhone(e.target.value));
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setPostalCode(formatted);
    const cleanDigits = formatted.replace(/\D/g, "");
    if (cleanDigits.length === 8) {
      fetchAddressByCep(cleanDigits);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name || !email || !cpfCnpj) {
        toast.error("Preencha o nome, e-mail e CPF/CNPJ para continuar.");
        return;
      }
      const cleanDoc = cpfCnpj.replace(/\D/g, "");
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        toast.error("CPF ou CNPJ inválido. Digite os 11 dígitos do CPF ou 14 dígitos do CNPJ.");
        return;
      }
      if (/^(\d)\1+$/.test(cleanDoc)) {
        toast.error("CPF/CNPJ inválido. Digite um documento válido.");
        return;
      }
      if (companyType === "INDIVIDUAL" && !birthDate) {
        toast.error("Data de nascimento é obrigatória para Pessoa Física.");
        return;
      }
    } else if (step === 2) {
      if (!mobilePhone || !postalCode) {
        toast.error("Informe o celular e o CEP para continuar.");
        return;
      }
      const cleanPhone = mobilePhone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        toast.error("Número de celular inválido. Informe o DDD e o número completo.");
        return;
      }
      const cleanCep = postalCode.replace(/\D/g, "");
      if (cleanCep.length !== 8) {
        toast.error("CEP inválido. O CEP deve conter 8 dígitos.");
        return;
      }
    } else if (step === 3) {
      if (!address || !addressNumber || !province) {
        toast.error("Informe o endereço completo (Rua, Número e Bairro).");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/personal/wallet/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          cpfCnpj: cpfCnpj.replace(/\D/g, ""),
          birthDate: birthDate || undefined,
          mobilePhone: mobilePhone.replace(/\D/g, ""),
          postalCode: postalCode.replace(/\D/g, ""),
          address,
          addressNumber,
          province,
          companyType
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao ativar carteira financeira");
      }

      toast.success("Solicitação de abertura enviada com sucesso!");
      onSuccess();
      onClose();
      setStep(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-xl p-0 border border-border bg-card text-card-foreground rounded-3xl! overflow-hidden! shadow-2xl">
        <div className="relative overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-card via-background to-primary/10">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 size-64 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-foreground">Ativação Atlas Pay</h3>
                  <p className="text-xs text-muted-foreground">Etapa {step} de 4 • Cadastro BaaS Regulado</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 py-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? "bg-primary" : "bg-muted"
                    }`}
                />
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <User className="size-4" /> 1. Identificação Titular
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Nome Completo / Razão Social</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="h-10 text-xs bg-background border-input text-foreground rounded-xl"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">E-mail Principal</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="h-10 text-xs bg-background border-input text-foreground rounded-xl"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">Tipo de Pessoa</Label>
                      <Select value={companyType} onValueChange={setCompanyType} disabled={loading}>
                        <SelectTrigger className="h-10 w-full text-xs bg-background border-input text-foreground rounded-xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="INDIVIDUAL">Pessoa Física (CPF)</SelectItem>
                          <SelectItem value="MEI">MEI (CNPJ)</SelectItem>
                          <SelectItem value="LIMITED">Pessoa Jurídica (CNPJ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">CPF ou CNPJ</Label>
                      <Input
                        value={cpfCnpj}
                        onChange={handleCpfCnpjChange}
                        placeholder="000.000.000-00"
                        className="h-10 text-xs bg-background border-input text-foreground rounded-xl font-mono"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {companyType === "INDIVIDUAL" && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="h-10 text-xs bg-background border-input text-foreground rounded-xl"
                        disabled={loading}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Phone className="size-4" /> 2. Contato e Localização Inicial
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Celular / WhatsApp (DDD + Número)</Label>
                    <Input
                      value={mobilePhone}
                      onChange={handlePhoneChange}
                      placeholder="(85) 99999-9999"
                      className="h-10 text-xs bg-background border-input text-foreground rounded-xl font-mono"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">CEP (Busca Automática)</Label>
                      {fetchingCep && (
                        <div className="flex items-center gap-1 text-[11px] text-primary">
                          <Loader2 className="size-3 animate-spin" />
                          <span>Buscando endereço...</span>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        value={postalCode}
                        onChange={handlePostalCodeChange}
                        placeholder="61887-500"
                        className="h-10 text-xs bg-background border-input text-foreground rounded-xl font-mono pr-9"
                        disabled={loading || fetchingCep}
                      />
                      <Search className="size-4 text-muted-foreground absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <MapPin className="size-4" /> 3. Endereço Completo
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Logradouro (Rua / Avenida)</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Rua Francisco Damião"
                      className="h-10 text-xs bg-background border-input text-foreground rounded-xl"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">Número</Label>
                      <Input
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        placeholder="Ex: 156"
                        className="h-10 text-xs bg-background border-input text-foreground rounded-xl"
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">Bairro</Label>
                      <Input
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="Ex: Centro"
                        className="h-10 text-xs bg-background border-input text-foreground rounded-xl"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <FileText className="size-4" /> 4. Revisão e Ativação
                </div>

                <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2 text-xs">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Titular:</span>
                    <span className="font-bold text-foreground">{name}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">E-mail:</span>
                    <span className="font-bold text-foreground">{email}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Documento:</span>
                    <span className="font-bold text-foreground font-mono">{cpfCnpj}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">WhatsApp:</span>
                    <span className="font-bold text-foreground font-mono">{mobilePhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Endereço:</span>
                    <span className="font-bold text-foreground truncate max-w-[200px]">
                      {address}, {addressNumber} - {province}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  disabled={loading || fetchingCep}
                  className="h-10 px-4 text-xs font-bold gap-2 border-border bg-background hover:bg-muted text-foreground rounded-xl cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  <span>Voltar</span>
                </Button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  disabled={fetchingCep}
                  className="h-10 px-6 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
                >
                  <span>Próximo</span>
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-10 px-6 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Criando Subconta...</span>
                    </>
                  ) : (
                    <>
                      <span>Concluir & Ativar</span>
                      <Check className="size-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
