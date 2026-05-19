"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { 
  Sun, 
  Moon, 
  Monitor, 
  Shield, 
  Bell, 
  Globe, 
  Scale, 
  LogOut,
  ChevronRight,
  User,
  CreditCard,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudentSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize sua experiência no AtlasFit.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Aparência */}
        <Card className="border-border/50 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Sun className="size-3.5" /> Aparência e Tema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Modo Escuro</Label>
                <p className="text-[11px] text-muted-foreground font-medium">Alternar entre tema claro e escuro</p>
              </div>
              <Switch 
                checked={theme === "dark"} 
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Idioma do Sistema</Label>
                <p className="text-[11px] text-muted-foreground font-medium">Escolha sua língua de preferência</p>
              </div>
              <Select defaultValue="pt-br">
                <SelectTrigger className="w-[140px] h-9 rounded-lg bg-secondary/50 border-none text-xs font-bold">
                  <SelectValue placeholder="Idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-br">Português (BR)</SelectItem>
                  <SelectItem value="en">English (US)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preferências de Treino */}
        <Card className="border-border/50 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Scale className="size-3.5" /> Preferências de Treino
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Unidade de Medida</Label>
                <p className="text-[11px] text-muted-foreground font-medium">Peso em Quilos ou Libras</p>
              </div>
              <Select defaultValue="kg">
                <SelectTrigger className="w-[100px] h-9 rounded-lg bg-secondary/50 border-none text-xs font-bold">
                  <SelectValue placeholder="Unid." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">KG</SelectItem>
                  <SelectItem value="lb">LB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Auto-Timer de Descanso</Label>
                <p className="text-[11px] text-muted-foreground font-medium">Iniciar descanso ao marcar série</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Segurança e Dados */}
        <Card className="border-border/50 bg-card shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Shield className="size-3.5" /> Segurança e Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-border/50">
                {[
                  { label: "Alterar Senha", icon: Shield, desc: "Atualize sua chave de acesso" },
                  { label: "Verificação em Duas Etapas", icon: Bell, desc: "Aumente a segurança da conta" },
                  { label: "Gerenciar Dispositivos", icon: Monitor, desc: "Sessões ativas em outros aparelhos" },
                ].map((item, idx) => (
                  <button key={idx} className="w-full flex items-center justify-between p-5 hover:bg-secondary/20 transition-all text-left">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-secondary rounded-xl text-muted-foreground">
                        <item.icon className="size-4" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground font-medium">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
             </div>
          </CardContent>
        </Card>

        {/* Zona de Perigo */}
        <div className="pt-8 space-y-4">
           <Button variant="ghost" className="w-full h-14 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/5 font-bold gap-3 border border-dashed border-destructive/20">
              <Trash2 className="size-5" /> EXCLUIR MINHA CONTA DEFINITIVAMENTE
           </Button>
           <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-[0.3em] opacity-50">
             AtlasFit Privacy Policy • Termos de Uso
           </p>
        </div>
      </div>
    </div>
  );
}
