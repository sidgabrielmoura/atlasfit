"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSnapshot } from "valtio";
import { useSession } from "next-auth/react";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Reply,
  Edit2,
  Trash2,
  Download,
  FileText,
  ChevronLeft,
  X,
  Mic,
  Image as ImageIcon,
  Video as VideoIcon,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  MessageSquare,
  Plus,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { chatStore, chatActions, Message, Conversation } from "@/stores/chat.store";
import { workspaceStore } from "@/stores/workspace.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { AudioRecorder } from "./AudioRecorder";
import { AudioPlayer } from "./AudioPlayer";
import { useAbly } from "@/providers/ably-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const compressImage = (file: File, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface ChatContainerProps {
  userRole: "TRAINER" | "STUDENT";
}

const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸"];

export function ChatContainer({ userRole }: ChatContainerProps) {
  const { data: session } = useSession();
  const workspaceSnap = useSnapshot(workspaceStore);
  const chatSnap = useSnapshot(chatStore);
  const ably = useAbly();

  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;
  const currentUserId = session?.user?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isTypingState, setIsTypingState] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [stagedFiles, setStagedFiles] = useState<any[]>([]);
  const [activeStagedIndex, setActiveStagedIndex] = useState(0);
  const [stagedCaption, setStagedCaption] = useState("");
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const [selectedGalleryImages, setSelectedGalleryImages] = useState<any[]>([]);
  const [galleryViewerIndex, setGalleryViewerIndex] = useState(0);
  const [isGalleryViewerOpen, setIsGalleryViewerOpen] = useState(false);

  const [isEditingLoading, setIsEditingLoading] = useState(false);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const galleryViewportRef = useRef<HTMLDivElement | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    setZoomScale(1);
  }, [galleryViewerIndex, isGalleryViewerOpen]);

  useEffect(() => {
    const el = galleryViewportRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }, 50);
    return () => clearTimeout(timer);
  }, [zoomScale]);

  const activeConversationId = chatSnap.activeConversationId;
  const conversations = chatSnap.conversations;
  const messages = activeConversationId ? (chatSnap.messages[activeConversationId] || []) : [];
  const nextCursor = activeConversationId ? chatSnap.nextCursors[activeConversationId] : null;

  // 1. Fetch Conversations on workspace change
  useEffect(() => {
    if (!activeWorkspaceId) return;

    chatActions.setLoadingConversations(true);
    fetch(`/api/chat/conversations?workspaceId=${activeWorkspaceId}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        chatActions.setConversations(data);
      })
      .catch(() => {
        toast.error("Erro ao carregar conversas.");
      })
      .finally(() => {
        chatActions.setLoadingConversations(false);
      });
  }, [activeWorkspaceId]);

  // 2. Fetch Messages on active conversation change
  useEffect(() => {
    if (!activeConversationId) return;

    chatActions.setLoadingMessages(true);
    fetch(`/api/chat/messages?conversationId=${activeConversationId}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        chatActions.setMessages(activeConversationId, data.messages, data.nextCursor);
        // Scroll to bottom
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      })
      .catch(() => {
        toast.error("Erro ao carregar mensagens.");
      })
      .finally(() => {
        chatActions.setLoadingMessages(false);
      });
  }, [activeConversationId]);

  // Scroll to bottom on new incoming message if already near bottom
  useEffect(() => {
    if (!activeConversationId) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, activeConversationId]);

  // 3. Load Workspace Contacts
  const handleOpenContactDialog = () => {
    if (!activeWorkspaceId) return;
    setIsContactDialogOpen(true);
    fetch(`/api/chat/contacts?workspaceId=${activeWorkspaceId}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        setContacts(data);
      })
      .catch(() => {
        toast.error("Erro ao carregar contatos.");
      });
  };

  const handleStartConversation = async (targetUserId: string) => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          targetUserId,
        }),
      });

      if (!res.ok) throw new Error();

      const conv = await res.json();
      chatActions.addConversation(conv);
      chatActions.setActiveConversationId(conv.id);
      setIsContactDialogOpen(false);
    } catch {
      toast.error("Não foi possível iniciar a conversa.");
    }
  };

  // 4. Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || !activeConversationId || !currentUserId) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId,
      senderId: currentUserId,
      type: "TEXT",
      content: textToSend,
      replyToId: chatSnap.replyToMessage?.id || null,
      replyTo: chatSnap.replyToMessage,
      status: "SENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update locally immediately
    chatActions.addMessage(activeConversationId, optimisticMessage);
    chatActions.updateConversation(activeConversationId, textToSend, new Date());
    setInputText("");
    chatActions.setReplyToMessage(null);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          type: "TEXT",
          content: textToSend,
          replyToId: optimisticMessage.replyToId,
        }),
      });

      if (!res.ok) throw new Error();
      const savedMessage = await res.json();
      chatActions.addMessage(activeConversationId, savedMessage);
    } catch {
      toast.error("Falha ao enviar mensagem.");
      chatActions.updateMessageStatus(activeConversationId, optimisticMessage.id, "SENDING"); // keep sending/failed status
    }
  };

  // 5. Handle Typing Indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!activeConversationId || !currentUserId) return;

    if (!isTypingState) {
      setIsTypingState(true);
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingState(false);
      sendTypingStatus(false);
    }, 2000);
  };

  const sendTypingStatus = async (typing: boolean) => {
    if (!ably || !activeConversationId) return;
    try {
      const channelName = `conversation:${activeConversationId}`;
      const channel = ably.channels.get(channelName);
      await channel.publish("typing", {
        userId: currentUserId,
        name: session?.user?.name || "Outro",
        isTyping: typing,
      });
    } catch (e) {
      // Ignore typing delivery failures silently
    }
  };

  // 6. Handle File Uploads
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeConversationId || !activeWorkspaceId) return;

    const newStaged = Array.from(files).map((f) => {
      let type: "IMAGE" | "VIDEO" | "FILE" = "FILE";
      if (f.type.startsWith("image/")) type = "IMAGE";
      else if (f.type.startsWith("video/")) type = "VIDEO";

      return {
        id: `staged-${Date.now()}-${Math.random()}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
        type,
      };
    });

    setStagedFiles((prev) => [...prev, ...newStaged]);
    setIsPreviewDialogOpen(true);
    e.target.value = ""; // Clear to allow selecting same files later
  };

  const handleCancelPreview = () => {
    stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setStagedFiles([]);
    setStagedCaption("");
    setIsPreviewDialogOpen(false);
  };

  const handleRemoveStagedFile = (idx: number) => {
    URL.revokeObjectURL(stagedFiles[idx].previewUrl);
    const updated = stagedFiles.filter((_, i) => i !== idx);
    setStagedFiles(updated);
    if (updated.length === 0) {
      setIsPreviewDialogOpen(false);
    } else if (activeStagedIndex >= updated.length) {
      setActiveStagedIndex(updated.length - 1);
    }
  };

  const uploadStagedFilesAndSend = async () => {
    if (stagedFiles.length === 0 || !activeConversationId || !activeWorkspaceId) return;

    const filesToUpload = [...stagedFiles];
    const captionToSend = stagedCaption;

    setStagedFiles([]);
    setStagedCaption("");
    setIsPreviewDialogOpen(false);

    const imageFiles = filesToUpload.filter((f) => f.type === "IMAGE");
    const otherFiles = filesToUpload.filter((f) => f.type !== "IMAGE");

    const uploadSingleFile = async (staged: any) => {
      const fileId = `upload-${Date.now()}-${Math.random()}`;
      try {
        let fileToUpload = staged.file;
        let contentType = staged.file.type;
        let fileSize = staged.file.size;
        let fileName = staged.file.name;

        if (staged.type === "IMAGE") {
          try {
            const compressedBlob = await compressImage(staged.file, 0.7);
            fileToUpload = new File([compressedBlob], fileName.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            contentType = "image/jpeg";
            fileSize = fileToUpload.size;
            fileName = fileToUpload.name;
          } catch (err) {
            console.error("Failed to compress image, uploading original file:", err);
          }
        }

        const res = await fetch("/api/storage/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            fileName: fileName,
            fileSize: fileSize,
            contentType: contentType || "application/octet-stream",
            targetType: "chat_attachment",
          }),
        });

        if (!res.ok) throw new Error(await res.text());
        const { uploadUrl, fileUrl } = await res.json();

        return new Promise<{ url: string; name: string; size: number; mimeType: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl, true);
          xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");

          chatActions.addUpload({
            fileId,
            name: fileName,
            size: fileSize,
            progress: 0,
            cancelUpload: () => {
              xhr.abort();
              reject(new Error("Canceled"));
            },
          });

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              chatActions.updateUploadProgress(fileId, progress);
            }
          };

          xhr.onload = () => {
            chatActions.removeUpload(fileId);
            if (xhr.status === 200) {
              resolve({
                url: fileUrl,
                name: fileName,
                size: fileSize,
                mimeType: contentType || "application/octet-stream",
              });
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            chatActions.removeUpload(fileId);
            reject(new Error("Connection error"));
          };

          xhr.onabort = () => {
            chatActions.removeUpload(fileId);
            reject(new Error("Canceled"));
          };

          xhr.send(fileToUpload);
        });
      } catch (err: any) {
        chatActions.removeUpload(fileId);
        toast.error(`Falha no upload de ${staged.file.name}`);
        throw err;
      }
    };

    try {
      // 1. Upload non-image files first (videos, files)
      for (const staged of otherFiles) {
        const uploaded = await uploadSingleFile(staged);
        let type: Message["type"] = "FILE";
        if (staged.file.type.startsWith("video/")) type = "VIDEO";
        else if (staged.file.type.startsWith("audio/")) type = "AUDIO";

        // Give caption to the first other file only if there are no images
        const fileCaption = otherFiles.indexOf(staged) === 0 && imageFiles.length === 0 ? captionToSend : undefined;

        const msgRes = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversationId,
            type,
            content: fileCaption || undefined,
            attachment: uploaded,
          }),
        });

        if (msgRes.ok) {
          const savedMsg = await msgRes.json();
          chatActions.addMessage(activeConversationId, savedMsg);
        }
      }

      // 2. Upload images and group them
      if (imageFiles.length > 0) {
        if (imageFiles.length === 1) {
          const uploaded = await uploadSingleFile(imageFiles[0]);
          const msgRes = await fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: activeConversationId,
              type: "IMAGE",
              content: captionToSend || undefined,
              attachment: uploaded,
            }),
          });
          if (msgRes.ok) {
            const savedMsg = await msgRes.json();
            chatActions.addMessage(activeConversationId, savedMsg);
          }
        } else {
          // Multiple images gallery
          const uploadedImages: any[] = [];
          for (const staged of imageFiles) {
            const uploaded = await uploadSingleFile(staged);
            uploadedImages.push(uploaded);
          }

          const msgRes = await fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: activeConversationId,
              type: "IMAGE",
              content: captionToSend || undefined,
              attachment: {
                isGallery: true,
                images: uploadedImages,
              },
            }),
          });
          if (msgRes.ok) {
            const savedMsg = await msgRes.json();
            chatActions.addMessage(activeConversationId, savedMsg);
          }
        }
      }
    } catch (err: any) {
      if (err.message !== "Canceled") {
        toast.error("Houve um erro ao enviar alguns arquivos.");
      }
    }
  };

  // 7. Handle Audio voice recording completion
  const handleAudioRecordingComplete = async (blob: Blob, durationSeconds: number) => {
    setIsRecordingAudio(false);
    setAudioStream(null);
    if (!activeConversationId || !activeWorkspaceId) return;
    const fileId = `audio-${Date.now()}`;
    const mimeType = blob.type || "audio/webm";
    const extension = mimeType.split("/")[1]?.split(";")[0] || "webm";
    const fileName = `voice-message-${Date.now()}.${extension}`;

    try {
      const res = await fetch("/api/storage/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          fileName,
          fileSize: blob.size,
          contentType: mimeType,
          targetType: "chat_attachment",
        }),
      });

      if (!res.ok) throw new Error();

      const { uploadUrl, fileUrl } = await res.json();

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", mimeType);

      chatActions.addUpload({
        fileId,
        name: `Gravação de voz.${extension}`,
        size: blob.size,
        progress: 0,
        cancelUpload: () => xhr.abort(),
      });

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          chatActions.updateUploadProgress(fileId, progress);
        }
      };

      xhr.onload = async () => {
        chatActions.removeUpload(fileId);
        if (xhr.status === 200) {
          const attMetadata = {
            url: fileUrl,
            name: `Mensagem de voz.${extension}`,
            size: blob.size,
            mimeType: mimeType,
            duration: durationSeconds,
          };

          const msgRes = await fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: activeConversationId,
              type: "AUDIO",
              attachment: attMetadata,
            }),
          });

          if (msgRes.ok) {
            const savedMsg = await msgRes.json();
            chatActions.addMessage(activeConversationId, savedMsg);
          } else {
            toast.error("Erro ao enviar gravação.");
          }
        } else {
          toast.error("Erro no envio da gravação.");
        }
      };

      xhr.send(blob);
    } catch {
      toast.error("Erro ao processar envio do áudio.");
    }
  };

  const handleScrollToMessage = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    }
  };

  // 8. Edit / Delete / Reply message helpers
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditText(message.content || "");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editText.trim() || !activeConversationId) return;
    setIsEditingLoading(true);
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText.trim() }),
      });

      if (!res.ok) throw new Error();
      const updated = await res.json();
      chatActions.updateMessageContent(activeConversationId, messageId, updated.content);
      setEditingMessageId(null);
      setEditText("");
      toast.success("Mensagem editada.");
    } catch {
      toast.error("Não foi possível editar a mensagem.");
    } finally {
      setIsEditingLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeConversationId) return;
    setIsDeletingLoading(true);
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();
      const softDeleted = await res.json();
      chatActions.deleteMessage(activeConversationId, messageId, softDeleted);
      setIsDeleteDialogOpen(false);
      setDeletingMessageId(null);
      toast.success("Mensagem excluída.");
    } catch {
      toast.error("Não foi possível excluir a mensagem.");
    } finally {
      setIsDeletingLoading(false);
    }
  };

  // 9. Infinite Scroll / Load History Handler
  const handleScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport || !activeConversationId || !nextCursor || chatSnap.isLoadingMessages) return;

    if (viewport.scrollTop === 0) {
      const previousScrollHeight = viewport.scrollHeight;

      fetch(`/api/chat/messages?conversationId=${activeConversationId}&cursor=${nextCursor}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data) => {
          chatActions.appendOlderMessages(activeConversationId, data.messages, data.nextCursor);
          // Restore scroll position
          setTimeout(() => {
            if (viewportRef.current) {
              viewportRef.current.scrollTop = viewportRef.current.scrollHeight - previousScrollHeight;
            }
          }, 50);
        })
        .catch(() => {
          toast.error("Erro ao carregar histórico.");
        });
    }
  };

  // 10. Emoji input helper
  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleStartAudioRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Seu navegador não suporta gravação de áudio ou a origem não é segura (HTTP sem ser localhost).");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setIsRecordingAudio(true);
    } catch (err: any) {
      console.error("Microphone permission denied:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error(
          "Permissão de microfone negada. Clique no ícone de cadeado (ao lado da URL) para liberar o acesso ao microfone."
        );
      } else {
        toast.error(`Não foi possível acessar o microfone (${err.name || "Erro"}): ${err.message || "Erro desconhecido"}`);
      }
    }
  };

  // Helpers to fetch participant details
  const getOtherParticipant = (conv: any) => {
    return conv.participants.find((p: any) => p.userId !== currentUserId);
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const otherParticipant = activeConv ? getOtherParticipant(activeConv) : null;
  const isOtherOnline = otherParticipant ? chatSnap.presence[otherParticipant.userId] : false;

  // Typing participants string list
  const activeTypingMap = activeConversationId ? chatSnap.isTyping[activeConversationId] || {} : {};
  const typingList = Object.values(activeTypingMap);

  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Group messages by date
  const groupMessagesByDate = (msgList: readonly any[]) => {
    const groups: Record<string, any[]> = {};
    // Chronological order for displaying
    const sorted = [...msgList].reverse();

    sorted.forEach((m) => {
      const date = new Date(m.createdAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    });

    return Object.entries(groups);
  };

  const messageGroups = groupMessagesByDate(messages);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const renderGalleryGrid = (message: any) => {
    const images = message.attachment?.images || [];
    const total = images.length;
    if (total === 0) return null;

    const handleOpenGalleryViewer = (startIndex: number) => {
      setSelectedGalleryImages(images);
      setGalleryViewerIndex(startIndex);
      setIsGalleryViewerOpen(true);
    };

    if (total === 1) {
      return (
        <div className="relative rounded-lg overflow-hidden border border-border/50 max-w-xs cursor-pointer" onClick={() => handleOpenGalleryViewer(0)}>
          <img src={images[0].url} className="w-full h-auto object-cover max-h-[300px]" alt="" />
        </div>
      );
    }

    if (total === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden max-w-sm cursor-pointer border border-border/40 bg-muted/5" onClick={() => handleOpenGalleryViewer(0)}>
          {images.map((img: any, idx: number) => (
            <img key={idx} src={img.url} className="w-full h-36 object-cover hover:opacity-90 transition" alt="" />
          ))}
        </div>
      );
    }

    if (total === 3) {
      return (
        <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden max-w-sm cursor-pointer border border-border/40" onClick={() => handleOpenGalleryViewer(0)}>
          <div className="col-span-2">
            <img src={images[0].url} className="w-full h-48 object-cover hover:opacity-90 transition" alt="" />
          </div>
          <div className="grid grid-rows-2 gap-1">
            <img src={images[1].url} className="w-full h-[94px] object-cover hover:opacity-90 transition" alt="" />
            <img src={images[2].url} className="w-full h-[94px] object-cover hover:opacity-90 transition" alt="" />
          </div>
        </div>
      );
    }

    const displayImages = images.slice(0, 4);
    const hasMore = total > 4;

    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden max-w-sm cursor-pointer border border-border/40" onClick={() => handleOpenGalleryViewer(0)}>
        {displayImages.map((img: any, idx: number) => {
          const isLast = idx === 3;
          return (
            <div key={idx} className="relative aspect-square">
              <img src={img.url} className="w-full h-full object-cover hover:opacity-90 transition" alt="" />
              {isLast && hasMore && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-lg select-none">
                  +{total - 4}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const filteredConversations = conversations.filter((c) => {
    const other = getOtherParticipant(c);
    return other?.user.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      className={cn(
        "flex overflow-hidden bg-card shadow-lg transition-all duration-300",
        isMaximized
          ? "fixed inset-0 z-50 w-screen h-screen border-none rounded-none md:inset-6 md:h-[calc(100vh-3rem)] md:w-[calc(100vw-3rem)] md:rounded-2xl md:border md:border-border"
          : "h-[calc(100vh-10rem)] w-full rounded-2xl border border-border"
      )}
    >
      <div
        className={cn(
          "w-full md:w-80 flex flex-col border-r border-border bg-card shrink-0 transition-all duration-300",
          activeConversationId && "hidden md:flex"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            Mensagens
          </h2>
          <Button
            size="sm"
            onClick={handleOpenContactDialog}
            className="rounded-xl px-3 bg-primary hover:bg-primary/95 font-semibold text-xs shadow-sm"
          >
            Novo Chat
          </Button>
        </div>

        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Pesquisar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/30 border-none h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/45"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatSnap.isLoadingConversations ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <span className="text-sm font-semibold text-muted-foreground">Nenhuma conversa encontrada.</span>
              <span className="text-xs text-muted-foreground/60 mt-1">Inicie uma nova conversa clicando em "Novo Chat".</span>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const other = getOtherParticipant(c);
              const isSelected = c.id === activeConversationId;
              const isOnline = other ? chatSnap.presence[other.userId] : false;
              const currentParticipant = c.participants.find((p: any) => p.userId === currentUserId);
              const unread = currentParticipant ? currentParticipant.unreadCount : 0;
              const convTyping = chatSnap.isTyping[c.id] || {};
              const isConvTyping = Object.keys(convTyping).length > 0;

              return (
                <button
                  key={c.id}
                  onClick={() => chatActions.setActiveConversationId(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 cursor-pointer select-none",
                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-secondary/40 text-foreground"
                  )}
                >
                  <div className="relative">
                    <Avatar className="size-10">
                      {other?.user.image && (
                        <AvatarImage src={other.user.image} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {other?.user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold truncate">
                        {other?.user.name}
                      </span>
                      {c.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground/75 font-semibold shrink-0">
                          {new Date(c.lastMessageAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      {isConvTyping ? (
                        <span className="text-xs text-primary font-bold animate-pulse">
                          Digitando...
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground truncate font-medium">
                          {c.lastMessage || "Nenhuma mensagem enviada."}
                        </span>
                      )}
                      {unread > 0 && (
                        <Badge className="h-5 min-w-5 px-1 bg-primary text-primary-foreground hover:bg-primary font-extrabold text-[10px] rounded-full flex items-center justify-center shrink-0">
                          {unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={cn("flex-1 flex flex-col bg-secondary/15", !activeConversationId && "hidden md:flex")}>
        {activeConversationId && otherParticipant ? (
          <>
            <div className="h-16 px-4 border-b border-border bg-card flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => chatActions.setActiveConversationId(null)}
                  className="size-8 rounded-lg md:hidden text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-5" />
                </Button>

                <div className="relative">
                  <Avatar className="size-9">
                    {otherParticipant.user.image && (
                      <AvatarImage src={otherParticipant.user.image} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {otherParticipant.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOtherOnline && (
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-foreground truncate">
                    {otherParticipant.user.name}
                  </span>
                  {typingList.length > 0 ? (
                    <span className="text-[10px] font-black text-primary animate-pulse">
                      Digitando...
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {isOtherOnline ? "Online" : "Offline"}
                    </span>
                  )}
                </div>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setIsMaximized((prev) => !prev)}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              >
                {isMaximized ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
            </div>

            <div
              ref={viewportRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {chatSnap.isLoadingMessages && messages.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={cn("flex gap-3 max-w-[70%]", i % 2 === 0 ? "mr-auto" : "ml-auto flex-row-reverse")}
                    >
                      <Skeleton className="size-8 rounded-full shrink-0" />
                      <Skeleton className="h-10 w-44 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {nextCursor && (
                    <div className="flex justify-center p-2">
                      <Skeleton className="h-4 w-28 rounded-full" />
                    </div>
                  )}
                  {messageGroups.map(([date, groupMessages]) => (
                    <div key={date} className="space-y-3">
                      <div className="flex justify-center my-2">
                        <span className="text-[10px] font-extrabold px-3 py-1 bg-secondary/50 backdrop-blur border border-border/40 text-muted-foreground rounded-full select-none">
                          {date}
                        </span>
                      </div>

                      {groupMessages.map((m) => {
                        const isSelf = m.senderId === currentUserId;
                        const isSystem = m.content === "Esta mensagem foi excluída.";

                        return (
                          <div
                            key={m.id}
                            id={`message-${m.id}`}
                            className={cn(
                              "flex gap-2 max-w-[80%] relative group animate-in slide-in-from-bottom-2 duration-200 transition-all",
                              isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                          >
                            <Avatar className="size-7 mt-1 shrink-0 select-none">
                              {m.sender?.image && (
                                <AvatarImage src={m.sender.image} className="object-cover" />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                {m.sender?.name?.slice(0, 2).toUpperCase() || "PT"}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex flex-col gap-0.5 items-end max-w-full">
                              {m.replyTo && (
                                <div
                                  onClick={() => m.replyToId && handleScrollToMessage(m.replyToId)}
                                  className="w-full text-left p-2 rounded-lg bg-black/5 dark:bg-white/5 border-l-2 border-primary/60 text-xs mb-1 opacity-80 max-w-[280px] truncate cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                >
                                  <span className="font-bold block text-[10px] text-primary">
                                    {m.replyTo.sender?.name}
                                  </span>
                                  {m.replyTo.type === "TEXT" ? (
                                    <span>{m.replyTo.content}</span>
                                  ) : (
                                    <span className="italic">Anexo</span>
                                  )}
                                </div>
                              )}

                              <div
                                className={cn(
                                  "relative rounded-2xl text-sm break-all font-medium max-w-full shadow-xs border transition-all duration-500",
                                  ["IMAGE", "AUDIO"].includes(m.type)
                                    ? cn(
                                      "p-1 bg-white/15 dark:bg-black/45 backdrop-blur-md border-white/25 dark:border-white/10 text-foreground",
                                      isSelf ? "rounded-tr-none" : "rounded-tl-none"
                                    )
                                    : isSelf
                                      ? "p-3 bg-primary text-primary-foreground border-primary/10 rounded-tr-none"
                                      : "p-3 bg-card text-foreground border-border/60 rounded-tl-none",
                                  isSystem && "p-3 bg-secondary/25 border-none italic text-muted-foreground",
                                  highlightedMessageId === m.id && (
                                    isSelf
                                      ? "ring-4 ring-white/80 scale-[1.03] z-10 duration-200"
                                      : "ring-4 ring-primary/80 scale-[1.03] z-10 bg-primary/10 duration-200"
                                  )
                                )}
                              >
                                {editingMessageId === m.id ? (
                                  <div className="flex flex-col gap-2 min-w-[200px]">
                                    <Input
                                      value={editText}
                                      disabled={isEditingLoading}
                                      onChange={(e) => setEditText(e.target.value)}
                                      className="bg-background text-foreground border-border rounded-lg text-xs"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isEditingLoading}
                                        onClick={() => setEditingMessageId(null)}
                                        className="h-7 text-[10px] rounded-md px-2"
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={isEditingLoading}
                                        onClick={() => handleSaveEdit(m.id)}
                                        className="h-7 text-[10px] rounded-md px-2.5 bg-background text-foreground hover:bg-background/90"
                                      >
                                        {isEditingLoading ? "Salvando..." : "Salvar"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {m.type === "IMAGE" && (
                                      <>
                                        {m.attachment?.isGallery ? (
                                          renderGalleryGrid(m)
                                        ) : (
                                          m.attachment?.url && (
                                            <div
                                              className="relative rounded-lg overflow-hidden border border-border/50 max-w-xs cursor-pointer bg-muted/5"
                                              onClick={() => {
                                                setSelectedGalleryImages([m.attachment]);
                                                setGalleryViewerIndex(0);
                                                setIsGalleryViewerOpen(true);
                                              }}
                                            >
                                              <img
                                                src={m.attachment.url}
                                                alt={m.attachment.name || "Foto"}
                                                className="w-full object-cover max-h-48 hover:opacity-95 transition"
                                              />
                                            </div>
                                          )
                                        )}
                                      </>
                                    )}

                                    {m.type === "VIDEO" && m.attachment?.url && (
                                      <div className="relative rounded-lg overflow-hidden border border-border/50 max-w-xs">
                                        <video
                                          src={m.attachment.url}
                                          controls
                                          className="w-full max-h-48"
                                        />
                                      </div>
                                    )}

                                    {m.type === "AUDIO" && m.attachment?.url && (
                                      <AudioPlayer
                                        src={m.attachment.url}
                                        duration={m.attachment.duration}
                                      />
                                    )}

                                    {m.type === "FILE" && m.attachment?.url && (
                                      <div className="flex items-center gap-2.5 p-2 bg-secondary/20 rounded-xl max-w-[240px]">
                                        <FileText className="size-7 text-primary shrink-0" />
                                        <div className="flex flex-col min-w-0 text-left">
                                          <span className="text-xs font-bold truncate text-foreground">
                                            {m.attachment.name}
                                          </span>
                                          <span className="text-[10px] font-semibold text-muted-foreground">
                                            {formatFileSize(m.attachment.size)}
                                          </span>
                                        </div>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => window.open(m.attachment.url, "_blank")}
                                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                                        >
                                          <Download className="size-3.5" />
                                        </Button>
                                      </div>
                                    )}

                                    {m.type === "TEXT" && <p>{m.content}</p>}
                                    {m.type !== "TEXT" && m.content && (
                                      <p className="mt-2 text-left whitespace-pre-wrap px-2 pb-1.5 pt-0.5 font-normal text-xs text-foreground/90">{m.content}</p>
                                    )}
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 mt-0.5 select-none font-semibold text-[9px] text-muted-foreground">
                                <span>
                                  {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {isSelf && !isSystem && (
                                  <span>
                                    {m.status === "SENDING" && <Clock className="size-2.5 text-muted-foreground" />}
                                    {m.status === "SENT" && <Check className="size-3 text-muted-foreground" />}
                                    {m.status === "DELIVERED" && <CheckCheck className="size-3 text-muted-foreground" />}
                                    {m.status === "READ" && <CheckCheck className="size-3 text-primary" />}
                                  </span>
                                )}
                              </div>
                            </div>

                            {!isSystem && editingMessageId !== m.id && (
                              <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center transition-all duration-200">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="size-6 rounded-lg text-muted-foreground hover:text-foreground"
                                    >
                                      <MoreVertical className="size-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="w-32 rounded-xl p-1 shadow-md" align="center">
                                    <DropdownMenuItem
                                      onClick={() => chatActions.setReplyToMessage(m)}
                                      className="text-xs p-2 rounded-lg cursor-pointer flex items-center"
                                    >
                                      <Reply className="size-3.5 mr-2" />
                                      Responder
                                    </DropdownMenuItem>
                                    {isSelf && m.type === "TEXT" && (
                                      <DropdownMenuItem
                                        onClick={() => handleStartEdit(m)}
                                        className="text-xs p-2 rounded-lg cursor-pointer flex items-center"
                                      >
                                        <Edit2 className="size-3.5 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                    )}
                                    {isSelf && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setDeletingMessageId(m.id);
                                          setIsDeleteDialogOpen(true);
                                        }}
                                        className="text-xs text-destructive p-2 rounded-lg cursor-pointer flex items-center"
                                      >
                                        <Trash2 className="size-3.5 mr-2" />
                                        Excluir
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {typingList.length > 0 && (
                    <div className="flex gap-2 max-w-[80%] mr-auto items-center animate-in fade-in duration-200 select-none">
                      <Avatar className="size-7 shrink-0 select-none">
                        {otherParticipant?.user?.image && (
                          <AvatarImage src={otherParticipant.user.image} className="object-cover" />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {otherParticipant?.user?.name?.slice(0, 2).toUpperCase() || "AL"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-card border border-border/60 text-muted-foreground rounded-2xl rounded-tl-none p-2.5 text-xs font-semibold flex items-center gap-1">
                        <span className="animate-pulse">Digitando</span>
                        <span className="flex items-center gap-0.5 ml-1">
                          <span className="size-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="size-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="size-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {chatSnap.activeUploads.length > 0 && (
              <div className="px-4 py-2 bg-background border-t border-border flex flex-col gap-1.5">
                {chatSnap.activeUploads.map((u) => (
                  <div key={u.fileId} className="flex items-center justify-between text-xs gap-3">
                    <span className="font-bold truncate max-w-[150px]">{u.name}</span>
                    <div className="flex-1 max-w-[200px] h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                    <span className="font-extrabold tabular-nums shrink-0">{u.progress}%</span>
                    {u.cancelUpload && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={u.cancelUpload}
                        className="size-5 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 border-t border-border bg-card flex flex-col gap-2 shrink-0">
              {chatSnap.replyToMessage && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/35 border-l-2 border-primary/60 text-xs animate-in slide-in-from-top-1">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[10px] text-primary">
                      Repondendo a {chatSnap.replyToMessage.sender?.name}
                    </span>
                    <span className="truncate max-w-[300px]">
                      {chatSnap.replyToMessage.type === "TEXT"
                        ? chatSnap.replyToMessage.content
                        : "Anexo"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => chatActions.setReplyToMessage(null)}
                    className="size-5 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {isRecordingAudio && audioStream ? (
                  <AudioRecorder
                    stream={audioStream}
                    onRecordingComplete={handleAudioRecordingComplete}
                    onCancel={() => {
                      audioStream.getTracks().forEach((track) => track.stop());
                      setIsRecordingAudio(false);
                      setAudioStream(null);
                    }}
                  />
                ) : (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      className="hidden"
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 shrink-0"
                        >
                          <Paperclip className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-36 rounded-xl p-1 shadow-md" align="start" side="top">
                        <DropdownMenuItem
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs p-2 rounded-lg cursor-pointer flex items-center"
                        >
                          <FileText className="size-3.5 mr-2" />
                          Documento
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = "image/*";
                              fileInputRef.current.click();
                            }
                          }}
                          className="text-xs p-2 rounded-lg cursor-pointer flex items-center"
                        >
                          <ImageIcon className="size-3.5 mr-2" />
                          Imagem
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = "video/*";
                              fileInputRef.current.click();
                            }
                          }}
                          className="text-xs p-2 rounded-lg cursor-pointer flex items-center"
                        >
                          <VideoIcon className="size-3.5 mr-2" />
                          Vídeo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 shrink-0"
                        >
                          <Smile className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64 max-h-48 overflow-y-auto p-2 rounded-xl grid grid-cols-8 gap-1 shadow-md" align="start" side="top">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleAddEmoji(emoji)}
                            className="text-lg p-1 hover:bg-secondary rounded-lg transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Input
                      placeholder="Escreva uma mensagem..."
                      value={inputText}
                      onChange={handleInputChange}
                      className="flex-1 bg-secondary/35 border-none h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/45"
                    />

                    {inputText.trim() === "" ? (
                      <Button
                        type="button"
                        size="icon"
                        onClick={handleStartAudioRecording}
                        className="size-9 rounded-xl bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground shrink-0 shadow-none"
                      >
                        <Mic className="size-4 text-foreground" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="icon"
                        className="size-9 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shrink-0 shadow-sm"
                      >
                        <Send className="size-4" />
                      </Button>
                    )}
                  </>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="bg-primary/10 p-5 rounded-full mb-4">
              <MessageSquare className="size-8 text-primary animate-bounce" />
            </div>
            <h3 className="text-base font-bold text-foreground">Sua Caixa de Entrada</h3>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              Selecione uma conversa ao lado para começar a enviar mensagens e arquivos em tempo real.
            </p>
          </div>
        )}
      </div>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl! border-border bg-card shadow-2xl p-4 gap-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Iniciar conversa</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 mt-2">
            {contacts.length === 0 ? (
              <span className="text-xs text-muted-foreground block text-center py-4">
                Nenhum contato disponível no momento.
              </span>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleStartConversation(contact.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-secondary/40 transition select-none cursor-pointer"
                >
                  <Avatar className="size-8">
                    {contact.image && <AvatarImage src={contact.image} className="object-cover" />}
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {contact.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      {contact.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {contact.role === "STUDENT" ? "Aluno" : "Coaching / Trainer"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewDialogOpen} onOpenChange={(open) => {
        if (!open) handleCancelPreview();
      }}>
        <DialogContent className="max-w-4xl! h-[90vh] flex flex-col p-0 gap-0! rounded-2xl! overflow-hidden!">
          {/* Floating Minimal Header */}
          <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none select-none">
            <div className="backdrop-blur-md bg-background/70 px-3 py-1.5 rounded-full border border-border/60 text-[10px] font-black tracking-widest text-muted-foreground">
              {activeStagedIndex + 1} DE {stagedFiles.length}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancelPreview}
              className="size-8 rounded-full bg-background/70 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-foreground backdrop-blur-md transition cursor-pointer pointer-events-auto shadow-md"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 bg-background relative overflow-hidden select-none">
            {stagedFiles.length > 0 && (
              <div className="w-full h-full max-h-[60vh] flex items-center justify-center">
                {stagedFiles[activeStagedIndex]?.type === "IMAGE" && (
                  <img
                    src={stagedFiles[activeStagedIndex].previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-border/30"
                  />
                )}
                {stagedFiles[activeStagedIndex]?.type === "VIDEO" && (
                  <video
                    src={stagedFiles[activeStagedIndex].previewUrl}
                    controls
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-border/30"
                  />
                )}
                {stagedFiles[activeStagedIndex]?.type === "FILE" && (
                  <div className="flex flex-col items-center gap-3 p-6 bg-muted/30 border border-border/50 rounded-2xl max-w-sm text-center">
                    <FileText className="size-16 text-primary animate-pulse" />
                    <span className="text-xs font-bold truncate max-w-[250px] text-foreground">
                      {stagedFiles[activeStagedIndex].file.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-black">
                      {formatFileSize(stagedFiles[activeStagedIndex].file.size)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Control Section */}
          <div className="p-4 border-t border-border/60 bg-secondary/20 backdrop-blur-md flex flex-col gap-4 shrink-0">
            {/* Timeline Carousel (iPhone-like) - Always visible for staging list */}
            {stagedFiles.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {stagedFiles.map((staged, idx) => (
                  <div
                    key={staged.id}
                    className={cn(
                      "relative size-12 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 shrink-0 select-none group",
                      idx === activeStagedIndex
                        ? "border-primary scale-105 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                        : "border-border opacity-60 hover:opacity-100"
                    )}
                    onClick={() => setActiveStagedIndex(idx)}
                  >
                    {staged.type === "IMAGE" && (
                      <img src={staged.previewUrl} className="w-full h-full object-cover" alt="" />
                    )}
                    {staged.type === "VIDEO" && (
                      <div className="relative w-full h-full bg-muted flex items-center justify-center">
                        <VideoIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    {staged.type === "FILE" && (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    {/* Delete Thumbnail Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveStagedFile(idx);
                      }}
                      className="absolute top-0.5 right-0.5 size-4 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md transition cursor-pointer"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}

                {/* Trigger to load more */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="size-12 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition shrink-0 cursor-pointer"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Input
                placeholder="Adicione uma legenda..."
                value={stagedCaption}
                onChange={(e) => setStagedCaption(e.target.value)}
                className="flex-1 h-10 rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/45 focus-visible:ring-offset-0 text-xs font-semibold"
              />
              <Button
                onClick={uploadStagedFilesAndSend}
                className="h-10 rounded-xl px-5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Send className="size-3.5" />
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isGalleryViewerOpen} onOpenChange={setIsGalleryViewerOpen}>
        <DialogContent showCloseButton={false} className="max-w-4xl! w-[95vw] h-[85vh] flex flex-col gap-0! sm:flex-row p-0 rounded-2xl! overflow-hidden!">
          <div className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10">
              <span className="text-xs font-bold bg-background/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground select-none">
                {galleryViewerIndex + 1} de {selectedGalleryImages.length}
              </span>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setZoomScale((prev) => Math.max(0.5, prev - 0.25))}
                className="size-9 rounded-full bg-background/70 backdrop-blur-md text-muted-foreground hover:text-foreground border border-border/60 hover:bg-secondary cursor-pointer"
                title="Afastar"
              >
                <ZoomOut className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setZoomScale((prev) => Math.min(3, prev + 0.25))}
                className="size-9 rounded-full bg-background/70 backdrop-blur-md text-muted-foreground hover:text-foreground border border-border/60 hover:bg-secondary cursor-pointer"
                title="Aproximar"
              >
                <ZoomIn className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsGalleryViewerOpen(false)}
                className="size-9 rounded-full bg-background/70 backdrop-blur-md text-muted-foreground hover:text-foreground border border-border/60 hover:bg-secondary cursor-pointer"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div
              ref={galleryViewportRef}
              className="flex-1 overflow-auto flex p-4 sm:p-8 select-none scrollbar-none"
            >
              {selectedGalleryImages.length > 0 && (
                <div
                  className="m-auto flex items-center justify-center transition-all duration-200 ease-out"
                  style={{
                    width: `${100 * zoomScale}%`,
                    height: `${100 * zoomScale}%`,
                    minWidth: "100%",
                    minHeight: "100%",
                  }}
                >
                  <img
                    src={selectedGalleryImages[galleryViewerIndex]?.url}
                    style={{
                      transform: `scale(${zoomScale})`,
                      transformOrigin: "center center",
                    }}
                    className="max-w-[90%] max-h-[90%] sm:max-w-[85%] sm:max-h-[85%] object-contain rounded-xl shadow-2xl transition-all duration-200"
                    alt="Gallery view"
                  />
                </div>
              )}
            </div>
          </div>

          {selectedGalleryImages.length > 1 && (
            <div className="w-full sm:w-56 h-27.5 sm:h-auto bg-muted/30 border-t sm:border-t-0 sm:border-l border-border flex flex-col p-1 sm:p-2 shrink-0">
              <span className="text-[9px] font-black tracking-widest text-muted-foreground mt-3 hidden sm:block select-none">GALERIA DE IMAGENS</span>
              <div className="flex-1 flex sm:flex-col mt-3 p-1 flex-row overflow-x-auto sm:overflow-y-auto gap-2 sm:space-y-3 sm:gap-0 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {selectedGalleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative aspect-square w-14 sm:w-full rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 group select-none shrink-0",
                      idx === galleryViewerIndex
                        ? "border-primary scale-[1.02] shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        : "border-border opacity-60 hover:opacity-100 hover:border-border/80"
                    )}
                    onClick={() => setGalleryViewerIndex(idx)}
                  >
                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-1 right-1 bg-background/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-foreground">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Message Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl! max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Essa ação não poderá ser desfeita. A mensagem selecionada será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={isDeletingLoading}
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingMessageId(null);
              }}
              className="text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingLoading}
              onClick={(e) => {
                e.preventDefault();
                if (deletingMessageId) handleDeleteMessage(deletingMessageId);
              }}
              className="text-xs font-bold rounded-xl cursor-pointer"
            >
              {isDeletingLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
