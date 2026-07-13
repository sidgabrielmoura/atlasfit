"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Trash2, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Seu navegador não suporta gravação de áudio.");
        onCancel();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        if (duration > 0.5) {
          onRecordingComplete(audioBlob, duration);
        } else {
          toast.warning("Áudio muito curto para ser enviado.");
          onCancel();
        }
      };

      mediaRecorder.start(200); // chunk data every 200ms
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Permissão de microfone negada ou erro ao iniciar gravação.");
      onCancel();
    }
  };

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStopAndSend = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancel = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null; // discard onstop callback to avoid sending
      mediaRecorderRef.current.stop();
      // stop tracks manually
      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center justify-between w-full h-10 px-3 bg-secondary/50 rounded-xl border border-border animate-in fade-in duration-300">
      <style>{`
        @keyframes bounce-wave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>

      {/* Timer & Blink status */}
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatTime(duration)}
        </span>
      </div>

      {/* Waveform Visualization Placeholder */}
      <div className="flex items-center gap-0.5 h-4 flex-1 justify-center max-w-[200px] px-4">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="w-0.75 bg-red-500/80 rounded-full"
            style={{
              height: "100%",
              animation: "bounce-wave 0.8s ease-in-out infinite",
              animationDelay: `${i * 0.08}s`,
              transformOrigin: "center",
            }}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          onClick={handleStopAndSend}
          className="size-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
