"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import {
  Send,
  Mic,
  Paperclip,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Volume2,
} from "lucide-react";
import { AudioRecorder } from "./AudioRecorder";

interface MassMessageModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function MassMessageModal({
  isOpen,
  onOpenChange,
  workspaceId,
}: MassMessageModalProps) {
  // Filters State
  const [objective, setObjective] = useState("all");
  const [chatStatus, setChatStatus] = useState("all");
  const [modality, setModality] = useState("all");

  // Recipient count state
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);

  // Message Content State
  const [messageText, setMessageText] = useState("");

  // Audio Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Attachment State
  const [attachment, setAttachment] = useState<{
    url: string;
    name: string;
    size: number;
    mimeType: string;
    duration?: number;
    type: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
  } | null>(null);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submit and Confirmation States
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 1. Fetch recipient count when filters change
  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    const fetchCount = async () => {
      setIsCounting(true);
      try {
        const queryParams = new URLSearchParams({
          workspaceId,
          objective,
          chatStatus,
          modality,
        });
        const res = await fetch(`/api/personal/chat/mass-message?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRecipientCount(data.count);
        } else {
          setRecipientCount(null);
        }
      } catch (err) {
        console.error("Error fetching target student count:", err);
        setRecipientCount(null);
      } finally {
        setIsCounting(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchCount();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [isOpen, workspaceId, objective, chatStatus, modality]);

  // 2. Handle file selection & upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let file = files[0];

    // Compress image client-side to save bandwidth
    if (file.type.startsWith("image/")) {
      try {
        file = await compressImage(file);
      } catch (err) {
        console.warn("Failing compression, uploading original:", err);
      }
    }

    // Detect attachment type
    let type: "IMAGE" | "VIDEO" | "FILE" = "FILE";
    if (file.type.startsWith("image/")) type = "IMAGE";
    else if (file.type.startsWith("video/")) type = "VIDEO";

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get presigned URL from API
      const res = await fetch("/api/storage/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || "application/octet-stream",
          targetType: "chat_attachment",
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const { uploadUrl, fileUrl } = await res.json();

      // Upload file using XMLHttpRequest for progress feedback
      const xhr = new XMLHttpRequest();
      uploadXhrRef.current = xhr;
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        setUploadProgress(null);
        if (xhr.status === 200) {
          setAttachment({
            url: fileUrl,
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            type,
          });
          toast.success("Arquivo enviado com sucesso!");
        } else {
          toast.error("Erro ao enviar arquivo para o servidor.");
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setUploadProgress(null);
        toast.error("Ocorreu um erro na rede durante o upload.");
      };

      xhr.send(file);
    } catch (err: any) {
      console.error(err);
      setIsUploading(false);
      setUploadProgress(null);
      toast.error(err.message || "Erro no processamento do upload.");
    }
  };

  // Cancel running file upload
  const cancelUpload = () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      uploadXhrRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(null);
    toast.info("Upload cancelado.");
  };

  // 3. Audio Recording Actions
  const startAudioRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Navegador não suporta gravação de áudio.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsRecordingAudio(true);
    } catch (err: any) {
      console.error("Microphone permission denied:", err);
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const handleAudioRecordingComplete = async (blob: Blob, durationSeconds: number) => {
    setIsRecordingAudio(false);
    setAudioStream(null);
    setIsUploading(true);
    setUploadProgress(0);

    const mimeType = blob.type || "audio/webm";
    const extension = mimeType.split("/")[1]?.split(";")[0] || "webm";
    const fileName = `voice-message-${Date.now()}.${extension}`;

    try {
      const res = await fetch("/api/storage/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          fileName,
          fileSize: blob.size,
          contentType: mimeType,
          targetType: "chat_attachment",
        }),
      });

      if (!res.ok) throw new Error();
      const { uploadUrl, fileUrl } = await res.json();

      const xhr = new XMLHttpRequest();
      uploadXhrRef.current = xhr;
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", mimeType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        setUploadProgress(null);
        if (xhr.status === 200) {
          setAttachment({
            url: fileUrl,
            name: `Mensagem de voz.${extension}`,
            size: blob.size,
            mimeType: mimeType,
            duration: durationSeconds,
            type: "AUDIO",
          });
          toast.success("Áudio gravado e processado!");
        } else {
          toast.error("Erro ao fazer upload do áudio.");
        }
      };

      xhr.send(blob);
    } catch {
      setIsUploading(false);
      setUploadProgress(null);
      toast.error("Erro ao processar gravação.");
    }
  };

  const cancelAudioRecording = () => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    setIsRecordingAudio(false);
    setAudioStream(null);
  };

  // Remove attachment
  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  // 4. Trigger Broadcasting submit
  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() && !attachment) {
      toast.warning("Por favor, digite uma mensagem ou envie um anexo.");
      return;
    }

    if (recipientCount === 0) {
      toast.error("Nenhum aluno selecionado com os filtros atuais.");
      return;
    }

    // Open confirmation alert dialog
    setIsConfirmAlertOpen(true);
  };

  const handleSendBroadcast = async () => {
    setIsConfirmAlertOpen(false);
    setIsSending(true);

    const messageType = attachment ? attachment.type : "TEXT";

    try {
      const res = await fetch("/api/personal/chat/mass-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          filters: {
            objective,
            chatStatus,
            modality,
          },
          messageType,
          content: messageText.trim() || null,
          attachment: attachment
            ? {
              url: attachment.url,
              name: attachment.name,
              size: attachment.size,
              mimeType: attachment.mimeType,
              duration: attachment.duration,
            }
            : null,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const result = await res.json();
      toast.success(`Mensagem enviada com sucesso para ${result.count} alunos! 🚀`);

      // Close Modal and clear inputs
      onOpenChange(false);
      setMessageText("");
      setAttachment(null);
      setObjective("all");
      setChatStatus("all");
      setModality("all");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao enviar a mensagem em massa.");
    } finally {
      setIsSending(false);
    }
  };

  // Helpers for file size formatting
  const formatBytes = (bytes: number, decimals = 1) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg bg-popover border border-border rounded-2xl! p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Send className="size-5 text-primary shrink-0" />
              <span>Mensagem em Massa</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione filtros para segmentar os destinatários, digite sua mensagem, adicione arquivos ou grave um áudio para enviar a múltiplos alunos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenConfirmation} className="space-y-5 pt-3">
            {/* Filters segment */}
            <div className="space-y-3.5 bg-secondary/20 p-4 border border-border/40 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Filtros de Destinatários
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="mass-objective" className="text-[10px] font-bold text-muted-foreground uppercase">
                    Grupo / Objetivo
                  </Label>
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger id="mass-objective" className="h-9 text-xs w-full rounded-lg border-border/50 bg-card">
                      <SelectValue placeholder="Objetivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      <SelectItem value="hipertrofia" className="text-xs">Hipertrofia 💪</SelectItem>
                      <SelectItem value="definição corporal" className="text-xs">Definição corporal ✨</SelectItem>
                      <SelectItem value="perda de peso" className="text-xs">Perda de peso 🏃</SelectItem>
                      <SelectItem value="condicionamento físico" className="text-xs">Condicionamento físico ⚡</SelectItem>
                      <SelectItem value="força" className="text-xs">Força 🏋️</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Histórico no Chat */}
                <div className="space-y-1">
                  <Label htmlFor="mass-chat-status" className="text-[10px] font-bold text-muted-foreground uppercase">
                    Atividade Chat
                  </Label>
                  <Select value={chatStatus} onValueChange={setChatStatus}>
                    <SelectTrigger id="mass-chat-status" className="h-9 text-xs rounded-lg border-border/50 bg-card">
                      <SelectValue placeholder="Histórico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos os alunos</SelectItem>
                      <SelectItem value="no_messages" className="text-xs">Sem msg no chat</SelectItem>
                      <SelectItem value="active_chat" className="text-xs">Já conversaram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Modalidade */}
                <div className="space-y-1">
                  <Label htmlFor="mass-modality" className="text-[10px] font-bold text-muted-foreground uppercase">
                    Modalidade
                  </Label>
                  <Select value={modality} onValueChange={setModality}>
                    <SelectTrigger id="mass-modality" className="h-9 text-xs rounded-lg border-border/50 bg-card">
                      <SelectValue placeholder="Modalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos os planos</SelectItem>
                      <SelectItem value="presencial" className="text-xs">Presencial</SelectItem>
                      <SelectItem value="online" className="text-xs">Online / Consultoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic matching student count indicator */}
              <div className="pt-2 flex items-center gap-1.5 text-xs">
                {isCounting ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin text-primary" />
                    Calculando alunos correspondentes...
                  </span>
                ) : (
                  <span className="text-foreground font-semibold flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Destinatários: <strong className="text-primary font-black">{recipientCount ?? 0}</strong> {recipientCount === 1 ? 'aluno' : 'alunos'}
                  </span>
                )}
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-2">
              <Label htmlFor="mass-message-text" className="text-[10px] font-bold text-muted-foreground uppercase">
                Sua Mensagem
              </Label>
              <Textarea
                id="mass-message-text"
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                disabled={isSending || isUploading || isRecordingAudio}
                className="bg-secondary/10 border-border/60 focus-visible:ring-primary rounded-xl text-xs leading-relaxed"
              />
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div className="p-3 bg-secondary/30 border border-border/40 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 min-w-0">
                  {attachment.type === "IMAGE" && <ImageIcon className="size-4 text-emerald-500 shrink-0" />}
                  {attachment.type === "VIDEO" && <VideoIcon className="size-4 text-blue-500 shrink-0" />}
                  {attachment.type === "AUDIO" && <Volume2 className="size-4 text-orange-500 shrink-0" />}
                  {attachment.type === "FILE" && <FileText className="size-4 text-neutral-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-foreground leading-none">{attachment.name}</p>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {attachment.duration ? `${attachment.duration}s • ` : ""}{formatBytes(attachment.size)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleRemoveAttachment}
                  className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}

            {/* File Upload Progress */}
            {isUploading && uploadProgress !== null && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span>Enviando anexo...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={uploadProgress} className="h-1.5 flex-1" />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={cancelUpload}
                    className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10 rounded-md"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Bottom inputs and attachments trigger */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
              <div className="flex items-center gap-1">
                {/* Audio recorder view or simple buttons */}
                {isRecordingAudio && audioStream ? (
                  <div className="w-64 sm:w-80">
                    <AudioRecorder
                      stream={audioStream}
                      onRecordingComplete={handleAudioRecordingComplete}
                      onCancel={cancelAudioRecording}
                    />
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={isSending || isUploading || !!attachment}
                      onClick={() => fileInputRef.current?.click()}
                      title="Adicionar arquivo (Imagem, vídeo, documento)"
                      className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 shrink-0 cursor-pointer"
                    >
                      <Paperclip className="size-4.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={isSending || isUploading || !!attachment}
                      onClick={startAudioRecording}
                      title="Gravar áudio"
                      className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 shrink-0 cursor-pointer"
                    >
                      <Mic className="size-4.5" />
                    </Button>
                  </>
                )}
              </div>

              {!isRecordingAudio && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSending || isUploading}
                    className="rounded-xl h-10 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSending || isUploading || (recipientCount ?? 0) === 0 || (!messageText.trim() && !attachment)}
                    className="rounded-xl h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider gap-1.5 cursor-pointer shadow-lg shadow-primary/10"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>Enviar</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Step (AlertDialog for double approval) */}
      <AlertDialog open={isConfirmAlertOpen} onOpenChange={setIsConfirmAlertOpen}>
        <AlertDialogContent className="bg-popover border border-border max-w-sm rounded-xl!">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-warning">
              <AlertTriangle className="size-5 text-amber-500 shrink-0" />
              <span>Confirmar Envio</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Você está prestes a enviar uma mensagem em massa para <strong className="text-foreground">{recipientCount}</strong> alunos.
              Essa ação não pode ser desfeita e enviará notificações para todos eles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="rounded-xl h-9 text-xs font-bold uppercase tracking-wider cursor-pointer">
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleSendBroadcast}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Sim, Enviar Agora
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
