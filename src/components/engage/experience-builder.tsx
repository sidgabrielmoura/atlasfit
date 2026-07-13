"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Heading,
  Type,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Ticket,
  Trophy,
  Minus,
  Move,
  Smartphone,
  Eye,
  CheckCircle,
  FileText,
  Upload,
  Loader2,
  ChevronRight,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function convertToEmbedUrl(url: string): string {
  if (!url) return "";
  url = url.trim();

  // YouTube standard watch link, shorts, or share link
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([^"&?\/ ]{11})/i);
  if (ytShortsMatch && ytShortsMatch[1]) {
    return `https://www.youtube.com/embed/${ytShortsMatch[1]}`;
  }

  // Vimeo standard, channel or album video links
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

export interface EngageBlock {
  id: string;
  type: "TITLE" | "TEXT" | "IMAGE" | "VIDEO" | "BUTTON" | "BANNER" | "CARD" | "LIST" | "COUNTER" | "CTA" | "COUPON" | "CHALLENGE" | "SEPARATOR" | "SPACER";
  content: any;
}

interface ExperienceBuilderProps {
  blocks: EngageBlock[];
  onChange: (blocks: EngageBlock[]) => void;
  format: "BANNER" | "CARD" | "DRAWER" | "MODAL" | "FULLSCREEN";
  onFileSelect?: (blockId: string, file: File) => void;
  isAdmin?: boolean;
}

export function ExperienceBuilder({ blocks, onChange, format, onFileSelect, isAdmin }: ExperienceBuilderProps) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const addBlock = (type: EngageBlock["type"]) => {
    const newBlock: EngageBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: getInitialContent(type),
    };
    onChange([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const getInitialContent = (type: EngageBlock["type"]) => {
    switch (type) {
      case "TITLE":
        return { text: "Novo Título" };
      case "TEXT":
        return { text: "Escreva a mensagem aqui..." };
      case "IMAGE":
        return { imageUrl: "", imageKey: "" };
      case "VIDEO":
        return { videoUrl: "" };
      case "BUTTON":
        return { text: "Clique Aqui", action: "URL_EXTERNAL", link: "" };
      case "COUPON":
        return { code: "DESCONTO10" };
      case "CHALLENGE":
        return { title: "Complete seu Treino", points: 100, goal: 5 };
      case "SPACER":
        return { height: 16 };
      default:
        return {};
    }
  };

  const updateBlockContent = (id: string, newContent: any) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content: { ...b.content, ...newContent } } : b));
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[nextIndex];
    newBlocks[nextIndex] = temp;
    onChange(newBlocks);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const localUrl = URL.createObjectURL(file);
      onFileSelect?.(id, file);
      updateBlockContent(id, { imageUrl: localUrl, imageKey: "pending" });
      toast.success("Imagem selecionada! Será enviada ao salvar a campanha.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao selecionar imagem.");
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const localUrl = URL.createObjectURL(file);
      onFileSelect?.(id, file);
      updateBlockContent(id, { videoUrl: localUrl, videoKey: "pending" });
      toast.success("Vídeo selecionado! Será enviado ao salvar a campanha.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao selecionar vídeo.");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
      {/* Block List Editor Section */}
      <div className="flex-1 w-full space-y-4">
        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Engage Experience Builder</Label>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Clique nos blocos para editá-los ou ordene-os.</p>
        </div>

        <div className="bg-muted/10 border border-border/40 p-4 rounded-2xl space-y-3 min-h-[250px] shadow-inner bg-background">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-[200px] border border-dashed border-border/30 rounded-xl">
              <Type className="size-8 mb-2 opacity-50" />
              <p className="text-xs font-bold uppercase tracking-wider">Nenhum bloco adicionado</p>
              <p className="text-[10px] mt-1">Adicione blocos abaixo para começar a criar.</p>
            </div>
          ) : (
            blocks.map((block, idx) => {
              const isActive = activeBlockId === block.id;
              return (
                <div
                  key={block.id}
                  onClick={() => setActiveBlockId(block.id)}
                  className={cn(
                    "group relative border rounded-xl p-3.5 transition-all bg-card cursor-pointer",
                    isActive ? "border-primary shadow-md bg-secondary/5" : "border-border/30 hover:border-border/60 hover:bg-secondary/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-secondary/20 border-border/40 text-muted-foreground flex items-center gap-1 select-none">
                        {block.type === "TITLE" && <Heading className="size-3 text-amber-500" />}
                        {block.type === "TEXT" && <Type className="size-3 text-blue-500" />}
                        {block.type === "IMAGE" && <ImageIcon className="size-3 text-emerald-500" />}
                        {block.type === "VIDEO" && <Video className="size-3 text-indigo-500" />}
                        {block.type === "BUTTON" && <LinkIcon className="size-3 text-purple-500" />}
                        {block.type === "COUPON" && <Ticket className="size-3 text-red-500" />}
                        {block.type === "CHALLENGE" && <Trophy className="size-3 text-yellow-500" />}
                        {block.type === "SEPARATOR" && <Minus className="size-3 text-neutral-500" />}
                        {block.type === "SPACER" && <Move className="size-3 text-teal-500" />}
                        {block.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0}
                        onClick={(e) => { e.stopPropagation(); moveBlock(idx, "up"); }}
                        className="size-6 rounded-md"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idx === blocks.length - 1}
                        onClick={(e) => { e.stopPropagation(); moveBlock(idx, "down"); }}
                        className="size-6 rounded-md"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                        className="size-6 rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline Block Fields */}
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    {block.type === "TITLE" && (
                      <Input
                        value={block.content.text || ""}
                        onChange={(e) => updateBlockContent(block.id, { text: e.target.value })}
                        placeholder="Insira o texto do título..."
                        className="h-9 rounded-lg border-border/40 text-xs bg-background"
                      />
                    )}

                    {block.type === "TEXT" && (
                      <Textarea
                        value={block.content.text || ""}
                        onChange={(e) => updateBlockContent(block.id, { text: e.target.value })}
                        placeholder="Digite a mensagem..."
                        className="min-h-[70px] rounded-lg border-border/40 text-xs bg-background leading-relaxed"
                      />
                    )}

                    {block.type === "IMAGE" && (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <Input
                            value={block.content.imageUrl || ""}
                            onChange={(e) => updateBlockContent(block.id, { imageUrl: e.target.value, imageKey: "" })}
                            placeholder="Link da imagem (https://...)"
                            className="h-9 rounded-lg border-border/40 text-xs bg-background"
                          />
                          <div className="relative shrink-0">
                            <input
                              type="file"
                              accept="image/*"
                              id={`upload-${block.id}`}
                              onChange={(e) => handleFileUpload(e, block.id)}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-9 rounded-lg border-border/60"
                              onClick={() => document.getElementById(`upload-${block.id}`)?.click()}
                            >
                              <Upload className="size-4" />
                            </Button>
                          </div>
                        </div>
                        {block.content.imageUrl && (
                          <div className="size-16 border rounded-lg bg-secondary/10 overflow-hidden shadow-inner">
                            <img src={block.content.imageUrl} alt="Preview" className="size-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}

                    {block.type === "VIDEO" && (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <Input
                            value={block.content.videoUrl || ""}
                            onChange={(e) => {
                              const converted = convertToEmbedUrl(e.target.value);
                              updateBlockContent(block.id, { videoUrl: converted, videoKey: "" });
                            }}
                            placeholder="URL do Vídeo (ex: YouTube, Vimeo ou cole o link)"
                            className="h-9 rounded-lg border-border/40 text-xs bg-background"
                          />
                          <div className="relative shrink-0">
                            <input
                              type="file"
                              accept="video/*"
                              id={`upload-video-${block.id}`}
                              onChange={(e) => handleVideoUpload(e, block.id)}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-9 rounded-lg border-border/60"
                              onClick={() => document.getElementById(`upload-video-${block.id}`)?.click()}
                            >
                              <Upload className="size-4" />
                            </Button>
                          </div>
                        </div>
                        {block.content.videoUrl && (
                          <div className="border rounded-lg bg-secondary/10 overflow-hidden shadow-inner max-w-xs aspect-video relative flex items-center justify-center">
                            {block.content.videoUrl.startsWith("blob:") || block.content.videoUrl.endsWith(".mp4") || block.content.videoUrl.includes("campaign_banner") || block.content.videoUrl.includes("/api/storage/file") ? (
                              <video src={block.content.videoUrl} controls className="size-full object-cover rounded" />
                            ) : (
                              <iframe src={block.content.videoUrl} className="size-full border-0 rounded" allowFullScreen />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {block.type === "BUTTON" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          value={block.content.text || ""}
                          onChange={(e) => updateBlockContent(block.id, { text: e.target.value })}
                          placeholder="Texto do Botão"
                          className="h-9 rounded-lg border-border/40 text-xs bg-background font-bold col-span-1"
                        />
                        <Select
                          value={block.content.action || "URL_EXTERNAL"}
                          onValueChange={(val) => updateBlockContent(block.id, { action: val })}
                        >
                          <SelectTrigger className="h-9 w-full rounded-lg border-border/40 text-xs font-bold bg-background col-span-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
                            <SelectItem value="URL_EXTERNAL" className="text-xs font-semibold">Link Externo</SelectItem>
                            <SelectItem value="OPEN_WORKOUT" className="text-xs font-semibold">Abrir Treinos</SelectItem>
                            <SelectItem value="OPEN_ASSESSMENT" className="text-xs font-semibold">Abrir Avaliações</SelectItem>
                            <SelectItem value="OPEN_FINANCE" className="text-xs font-semibold">Abrir Financeiro</SelectItem>
                            <SelectItem value="OPEN_CRM" className="text-xs font-semibold">Abrir CRM</SelectItem>
                            {isAdmin && (
                              <SelectItem value="APPLY_COUPON" className="text-xs font-semibold">Aplicar Cupom</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Input
                          value={block.content.link || ""}
                          onChange={(e) => updateBlockContent(block.id, { link: e.target.value })}
                          placeholder="https://... (para links)"
                          disabled={block.content.action !== "URL_EXTERNAL" && block.content.action !== "APPLY_COUPON"}
                          className="h-9 rounded-lg border-border/40 text-xs bg-background col-span-1"
                        />
                      </div>
                    )}

                    {block.type === "COUPON" && (
                      <Input
                        value={block.content.code || ""}
                        onChange={(e) => updateBlockContent(block.id, { code: e.target.value.toUpperCase() })}
                        placeholder="Ex: PROMO15"
                        className="h-9 rounded-lg border-border/40 text-xs bg-background font-black uppercase tracking-wider text-emerald-500"
                      />
                    )}

                    {block.type === "CHALLENGE" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          value={block.content.title || ""}
                          onChange={(e) => updateBlockContent(block.id, { title: e.target.value })}
                          placeholder="Nome do desafio (ex: Treine 3x na semana)"
                          className="h-9 rounded-lg border-border/40 text-xs bg-background font-bold"
                        />
                        <Input
                          type="number"
                          value={block.content.goal || 0}
                          onChange={(e) => updateBlockContent(block.id, { goal: parseInt(e.target.value) || 1 })}
                          placeholder="Meta de Conclusão"
                          className="h-9 rounded-lg border-border/40 text-xs bg-background"
                        />
                        <Input
                          type="number"
                          value={block.content.points || 0}
                          onChange={(e) => updateBlockContent(block.id, { points: parseInt(e.target.value) || 0 })}
                          placeholder="Pontos/XP"
                          className="h-9 rounded-lg border-border/40 text-xs bg-background"
                        />
                      </div>
                    )}

                    {block.type === "SPACER" && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-semibold">Altura:</span>
                        <Input
                          type="number"
                          value={block.content.height || 16}
                          onChange={(e) => updateBlockContent(block.id, { height: parseInt(e.target.value) || 8 })}
                          className="h-8 w-20 rounded-md border-border/40 text-xs bg-background"
                        />
                        <span className="text-[10px] text-muted-foreground">px</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Toolbar to Add Blocks (Notion + Toolbar Style) */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adicionar Bloco</Label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-secondary/10 border border-border/40 rounded-xl">
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("TITLE")} className="h-8 flex-1 text-[10px] font-bold gap-1 rounded-lg">
              <Heading className="size-3.5 text-amber-500" /> Título
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("TEXT")} className="h-8 flex-1 text-[10px] font-bold gap-1 rounded-lg">
              <Type className="size-3.5 text-blue-500" /> Texto
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("IMAGE")} className="h-8 flex-1 text-[10px] font-bold gap-1 rounded-lg">
              <ImageIcon className="size-3.5 text-emerald-500" /> Imagem
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("VIDEO")} className="h-8 flex-1 text-[10px] font-bold gap-1 rounded-lg">
              <Video className="size-3.5 text-indigo-500" /> Vídeo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("BUTTON")} className="h-8 flex-1 text-[10px] font-bold gap-1 rounded-lg">
              <LinkIcon className="size-3.5 text-purple-500" /> Botão/CTA
            </Button>
            {isAdmin && (
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("COUPON")} className="h-8 flex-1 text-[10px] font-bold gap-1 rounded-lg">
                <Ticket className="size-3.5 text-red-500" /> Cupom
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("SEPARATOR")} className="h-8 flex-1 text-[10px] font-bold gap-1 rounded-lg">
              <Minus className="size-3.5 text-neutral-500" /> Separador
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("SPACER")} className="h-8 flex-1 text-[10px] font-bold gap-1 rounded-lg">
              <Move className="size-3.5 text-teal-500" /> Espaçador
            </Button>
          </div>
        </div>
      </div>

      {/* Simulator / Real-time Mobile Preview */}
      <div className="w-full lg:w-[350px] shrink-0 sticky top-6">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="size-4 text-primary" />
          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Simulador Mobile Live</Label>
        </div>

        <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] rounded-[36px] border-8 border-muted bg-background p-3 shadow-2xl flex flex-col justify-between select-none overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Top Notch Simulator */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-muted rounded-b-xl z-20 flex items-center justify-center">
            <span className="size-1.5 rounded-full bg-muted-foreground/30 mr-2" />
            <span className="w-8 h-1 rounded bg-muted-foreground/30" />
          </div>

          <div className="flex-1 w-full h-full flex flex-col justify-center items-center overflow-hidden z-10 pt-4">
            {format === "BANNER" && (
              <div className="w-full bg-gradient-to-br from-card to-card/90 border border-border p-3 rounded-2xl flex flex-col gap-3.5 scale-[0.95] translate-y-[-10%] animate-in slide-in-from-top-4 duration-300 shadow-xl">
                {/* Extract first image or video block for simulator thumbnail */}
                {blocks.some(b => b.type === "IMAGE" && b.content.imageUrl) ? (
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-secondary/40 relative shadow-inner">
                    <img 
                      src={blocks.find(b => b.type === "IMAGE")?.content.imageUrl} 
                      className="size-full object-cover" 
                      alt="Banner thumbnail" 
                    />
                  </div>
                ) : blocks.some(b => b.type === "VIDEO" && b.content.videoUrl) ? (
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-secondary/40 flex items-center justify-center relative shadow-inner">
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                      <div className="size-5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white shadow-xs">
                        <Play className="size-2.5 fill-white ml-0.5" />
                      </div>
                    </div>
                    <Video className="size-4.5 text-muted-foreground" />
                  </div>
                ) : null}

                <div className="flex-1 min-w-0 space-y-1 text-left">
                  <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary mb-1 inline-block">
                    Categoria
                  </span>
                  {blocks.map(b => {
                    if (b.type === "TITLE") {
                      return <h4 key={b.id} className="text-xs font-black tracking-tight text-foreground leading-snug">{b.content.text || "Novo Título"}</h4>;
                    }
                    if (b.type === "TEXT") {
                      return <p key={b.id} className="text-[10px] font-medium text-muted-foreground line-clamp-2 leading-relaxed">{b.content.text || "Mensagem do banner..."}</p>;
                    }
                    return null;
                  })}
                </div>

                <div className="w-full">
                  {blocks.map(b => {
                    if (b.type === "BUTTON") {
                      return (
                        <Button 
                          key={b.id} 
                          size="sm" 
                          className="w-full h-8 text-[9px] font-black rounded-lg bg-primary text-primary-foreground pointer-events-none select-none"
                        >
                          {b.content.text || "Clique Aqui"} <ChevronRight className="size-3 ml-1" />
                        </Button>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {format === "CARD" && (
              <div className="w-full bg-card border border-border p-3 rounded-2xl space-y-2 scale-[0.95] animate-in fade-in duration-300 shadow-inner">
                {renderPreviewBlocks(blocks)}
              </div>
            )}

            {(format === "MODAL" || format === "DRAWER" || format === "FULLSCREEN") && (
              <div className={cn(
                "w-full bg-card border border-border p-4 flex flex-col text-left space-y-3.5 shadow-2xl",
                format === "MODAL" && "rounded-2xl scale-[0.95] max-h-[85%] overflow-y-auto",
                format === "DRAWER" && "rounded-t-2xl mt-auto translate-y-[10%] border-b-0 max-h-[85%] overflow-y-auto",
                format === "FULLSCREEN" && "h-full rounded-[24px] border-0 max-h-full overflow-y-auto pt-8"
              )}>
                <div className="flex items-center justify-between text-[7px] text-muted-foreground uppercase tracking-widest font-black">
                  <span>Comunicado</span>
                  <span className="px-1.5 py-0.5 rounded border border-border bg-secondary cursor-pointer">Fechar</span>
                </div>
                {renderPreviewBlocks(blocks)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderPreviewBlocks(blocks: EngageBlock[]) {
  if (blocks.length === 0) {
    return <div className="text-[10px] text-center text-muted-foreground font-bold py-4">Estrutura Vazia</div>;
  }

  return (
    <div className="space-y-2.5 w-full">
      {blocks.map(block => {
        switch (block.type) {
          case "TITLE":
            return (
              <h4 key={block.id} className="text-xs sm:text-sm font-black tracking-tight text-foreground leading-snug">
                {block.content.text || "Novo Título"}
              </h4>
            );
          case "TEXT":
            return (
              <p key={block.id} className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-relaxed">
                {block.content.text || "Escreva a mensagem..."}
              </p>
            );
          case "IMAGE":
            return block.content.imageUrl ? (
              <div key={block.id} className="relative w-full aspect-[21/9] rounded-lg overflow-hidden border border-border bg-secondary">
                <img src={block.content.imageUrl} className="size-full object-cover" alt="Preview banner" />
              </div>
            ) : null;
          case "VIDEO":
            if (!block.content.videoUrl) {
              return (
                <div key={block.id} className="w-full aspect-video rounded-lg bg-secondary border border-border flex items-center justify-center">
                  <Video className="size-5 text-muted-foreground animate-pulse" />
                </div>
              );
            }
            const isDirectVideoPreview = 
              block.content.videoUrl.startsWith("blob:") || 
              block.content.videoUrl.endsWith(".mp4") || 
              block.content.videoUrl.includes("campaign_banner") ||
              block.content.videoUrl.includes("/api/storage/file");
            return (
              <div key={block.id} className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-secondary">
                {isDirectVideoPreview ? (
                  <video src={block.content.videoUrl} controls className="absolute inset-0 size-full object-cover" />
                ) : (
                  <iframe src={block.content.videoUrl} className="absolute inset-0 size-full border-0" allowFullScreen />
                )}
              </div>
            );
          case "BUTTON":
            return (
              <Button key={block.id} size="sm" className="w-full h-7 rounded-lg text-[9px] font-black bg-primary text-primary-foreground select-none pointer-events-none">
                {block.content.text || "Clique Aqui"}
              </Button>
            );
          case "COUPON":
            return (
              <div key={block.id} className="w-full border border-dashed border-emerald-500/30 bg-emerald-500/5 p-2 rounded-lg text-center flex items-center justify-between gap-2">
                <Ticket className="size-3.5 text-emerald-500 shrink-0" />
                <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase flex-1">{block.content.code || "CUPOM"}</span>
                <span className="text-[7px] font-bold text-muted-foreground border border-border bg-secondary px-1 py-0.5 rounded uppercase">Copiar</span>
              </div>
            );
          case "CHALLENGE":
            return (
              <div key={block.id} className="w-full border border-yellow-500/20 bg-yellow-500/5 p-2.5 rounded-xl space-y-1.5 flex flex-col text-left">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="size-3.5 text-yellow-500" />
                    <span className="text-[10px] font-black tracking-tight text-foreground leading-none">{block.content.title || "Novo Desafio"}</span>
                  </div>
                  <span className="text-[8px] font-black text-yellow-500">+{block.content.points || 0} XP</span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full w-[40%]" />
                </div>
                <span className="text-[7px] font-bold text-muted-foreground uppercase leading-none">Progresso: 2 / {block.content.goal || 5}</span>
              </div>
            );
          case "SEPARATOR":
            return <div key={block.id} className="w-full h-px bg-border my-2" />;
          case "SPACER":
            return <div key={block.id} style={{ height: `${block.content.height || 16}px` }} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
