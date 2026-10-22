"use client";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Check, Edit2, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isAutoFeature(feature: string): boolean {
   const trimmed = feature.trim().toLowerCase();
   if (/^até\s+\d+\s+alunos\s+ativos$/i.test(trimmed) || /^alunos\s+ilimitados$/i.test(trimmed)) return true;
   if (/^\d+\s+importações\s+de\s+alunos\/mês$/i.test(trimmed) || /^importações\s+de\s+alunos\s+ilimitadas$/i.test(trimmed)) return true;
   if (/^\d+\s+workspace(s)?\s+de\s+trabalho$/i.test(trimmed) || /^workspaces\s+ilimitados$/i.test(trimmed)) return true;
   if (/^.*armazenamento\s+em\s+nuvem.*$/i.test(trimmed)) return true;
   return false;
}

export function buildAutoFeatures(maxStudents: string, importQuota: string, maxWorkspaces: string, storageLimitMb: string = "1024"): string[] {
   const studentsNum = maxStudents ? parseInt(maxStudents) : null;
   const studentsText = studentsNum && studentsNum > 0 ? `Até ${studentsNum} alunos ativos` : "Alunos ilimitados";

   const quotaNum = importQuota ? parseInt(importQuota) : null;
   const importsText = quotaNum && quotaNum > 0 ? `${quotaNum} importações de alunos/mês` : "Importações de alunos ilimitadas";

   const wsNum = maxWorkspaces ? parseInt(maxWorkspaces) : 1;
   const workspacesText = wsNum > 1 ? `${wsNum} workspaces de trabalho` : (wsNum === 1 ? "1 workspace de trabalho" : "Workspaces ilimitados");

   const storageNum = storageLimitMb ? parseInt(storageLimitMb) : 1024;
   let storageText = "Armazenamento em nuvem ilimitado";
   if (storageNum > 0) {
      if (storageNum >= 1024 && storageNum % 1024 === 0) {
         storageText = `${storageNum / 1024} GB de armazenamento em nuvem`;
      } else {
         storageText = `${storageNum} MB de armazenamento em nuvem`;
      }
   }

   return [studentsText, importsText, workspacesText, storageText];
}

export function updateFeaturesWithFields(currentFeatures: string, maxStudents: string, importQuota: string, maxWorkspaces: string, storageLimitMb: string = "1024"): string {
   const autoFeatures = buildAutoFeatures(maxStudents, importQuota, maxWorkspaces, storageLimitMb);
   const existingList = currentFeatures ? currentFeatures.split(",").map(f => f.trim()).filter(Boolean) : [];

   const customFeatures = existingList.filter(f => !isAutoFeature(f));

   return [...autoFeatures, ...customFeatures].join(", ");
}

interface FeaturesManagerProps {
   value: string;
   onChange: (value: string) => void;
   label?: string;
}

export function FeaturesManager({ value, onChange, label }: FeaturesManagerProps) {
   const [isAdding, setIsAdding] = useState(false);
   const [newItemText, setNewItemText] = useState("");
   const [editingIndex, setEditingIndex] = useState<number | null>(null);
   const [editingText, setEditingText] = useState("");

   const featuresList = value
      ? value
         .split(",")
         .map((f) => f.trim())
         .filter(Boolean)
      : [];

   const handleAddItem = () => {
      const trimmed = newItemText.trim();
      if (!trimmed) return;
      if (featuresList.includes(trimmed)) {
         toast.error("Esta vantagem já foi adicionada!");
         return;
      }
      const newList = [...featuresList, trimmed];
      onChange(newList.join(", "));
      setNewItemText("");
      setIsAdding(false);
   };

   const handleRemoveItem = (index: number) => {
      const newList = featuresList.filter((_, i) => i !== index);
      onChange(newList.join(", "));
      if (editingIndex === index) {
         setEditingIndex(null);
         setEditingText("");
      }
   };

   const handleStartEdit = (index: number, text: string) => {
      setEditingIndex(index);
      setEditingText(text);
   };

   const handleSaveEdit = (index: number) => {
      const trimmed = editingText.trim();
      if (!trimmed) {
         handleRemoveItem(index);
         return;
      }
      const newList = [...featuresList];
      newList[index] = trimmed;
      onChange(newList.join(", "));
      setEditingIndex(null);
      setEditingText("");
   };

   return (
      <div className="space-y-3">
         {label && (
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
               {label}
            </Label>
         )}

         <div className="space-y-2 max-h-55 overflow-y-auto pr-1">
            {featuresList.length === 0 ? (
               <p className="text-xs text-muted-foreground italic py-1">Nenhuma vantagem adicionada ainda.</p>
            ) : (
               featuresList.map((feature, index) => {
                  const isEditing = editingIndex === index;
                  const isAuto = isAutoFeature(feature);
                  return (
                     <div
                        key={index}
                        className="flex items-center justify-between gap-2 bg-secondary/20 hover:bg-secondary/35 border border-border/40 p-2.5 rounded-xl transition-all animate-in fade-in slide-in-from-top-1 duration-200"
                     >
                        {isEditing ? (
                           <div className="flex items-center gap-2 flex-1">
                              <Input
                                 aria-label="Editar vantagem"
                                 value={editingText}
                                 onChange={(e) => setEditingText(e.target.value)}
                                 className="h-8 rounded-lg text-xs py-1 px-2.5 flex-1 bg-background"
                                 autoFocus
                                 onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                       e.preventDefault();
                                       handleSaveEdit(index);
                                    }
                                 }}
                              />
                              <Button
                                 aria-label="Salvar vantagem"
                                 type="button"
                                 size="icon"
                                 onClick={() => handleSaveEdit(index)}
                                 className="h-8 w-8 rounded-lg shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                 <Check className="size-3.5" />
                              </Button>
                              <Button
                                 aria-label="Cancelar edição da vantagem"
                                 type="button"
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => setEditingIndex(null)}
                                 className="h-8 w-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                              >
                                 <X className="size-3.5" />
                              </Button>
                           </div>
                        ) : (
                           <>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                 <BadgeCheck className="size-4 text-emerald-500 shrink-0" />
                                 <span className="text-xs text-foreground font-medium truncate">
                                    {feature}
                                 </span>
                                 {isAuto && (
                                    <Badge variant="outline" className="text-[9px] font-bold border-primary/30 text-primary bg-primary/10 px-1.5 py-0 shrink-0">
                                       Auto
                                    </Badge>
                                 )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                 <Button
                                    aria-label={`Editar vantagem: ${feature}`}
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEdit(index, feature)}
                                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                                 >
                                    <Edit2 className="size-3.5" />
                                 </Button>
                                 <Button
                                    aria-label={`Remover vantagem: ${feature}`}
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(index)}
                                    className="h-7 w-7 rounded-lg text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10"
                                 >
                                    <Trash2 className="size-3.5" />
                                 </Button>
                              </div>
                           </>
                        )}
                     </div>
                  );
               })
            )}
         </div>

         {/* Adicionar Vantagem */}
         {isAdding ? (
            <div className="flex items-center gap-2 bg-secondary/10 p-2 border border-dashed border-border/80 rounded-xl animate-in zoom-in-95 duration-200">
               <Input
                  aria-label="Nova vantagem"
                  placeholder="Nova vantagem..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="h-9 rounded-lg text-xs py-1 px-3 flex-1 bg-background"
                  autoFocus
                  onKeyDown={(e) => {
                     if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddItem();
                     }
                  }}
               />
               <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddItem()}
                  className="h-9 px-3 rounded-lg font-bold shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 text-xs"
               >
                  Confirmar
               </Button>
               <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cancelar nova vantagem"
                  onClick={() => {
                     setIsAdding(false);
                     setNewItemText("");
                  }}
                  className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
               >
                  <X className="size-4" />
               </Button>
            </div>
         ) : (
            <Button
               type="button"
               variant="outline"
               onClick={() => setIsAdding(true)}
               className="w-full h-9 rounded-xl border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs font-bold text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-1.5"
            >
               <Plus className="size-3.5" /> Adicionar Vantagem
            </Button>
         )}
      </div>
   );
}

