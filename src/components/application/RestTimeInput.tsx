"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RestTimeInputProps {
  value?: string;
  onChange: (newValue: string) => void;
  className?: string;
}

export function RestTimeInput({ value = "01:00", onChange, className }: RestTimeInputProps) {
  // Parse value like "01:30" or "90s" or "2 min" into minutes and seconds
  let initialMinutes = 1;
  let initialSeconds = 0;

  if (value) {
    const valClean = String(value).trim();
    if (valClean.includes(":")) {
      const parts = valClean.split(":");
      initialMinutes = parseInt(parts[0]) || 0;
      initialSeconds = parseInt(parts[1]) || 0;
    } else if (valClean.toLowerCase().includes("min")) {
      const parts = valClean.split("min");
      initialMinutes = parseInt(parts[0]) || 0;
      // check if there's seconds after min
      const secondsPart = parts[1] || "";
      initialSeconds = parseInt(secondsPart) || 0;
    } else if (valClean.toLowerCase().endsWith("s")) {
      const totalSeconds = parseInt(valClean) || 60;
      initialMinutes = Math.floor(totalSeconds / 60);
      initialSeconds = totalSeconds % 60;
    } else {
      const totalSeconds = parseInt(valClean);
      if (!isNaN(totalSeconds)) {
        initialMinutes = Math.floor(totalSeconds / 60);
        initialSeconds = totalSeconds % 60;
      }
    }
  }

  // Bound check
  initialMinutes = Math.max(0, Math.min(10, initialMinutes));
  initialSeconds = Math.max(0, Math.min(59, initialSeconds));

  const minutesOptions = Array.from({ length: 11 }, (_, i) => i); // 0 to 10 minutes
  const secondsOptions = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, 15, ..., 55 seconds

  const handleMinutesChange = (newM: string) => {
    const m = parseInt(newM) || 0;
    const s = initialSeconds;
    const mStr = String(m).padStart(2, "0");
    const sStr = String(s).padStart(2, "0");
    onChange(`${mStr}:${sStr}`);
  };

  const handleSecondsChange = (newS: string) => {
    const m = initialMinutes;
    const s = parseInt(newS) || 0;
    const mStr = String(m).padStart(2, "0");
    const sStr = String(s).padStart(2, "0");
    onChange(`${mStr}:${sStr}`);
  };

  return (
    <div className={`flex items-center gap-1.5 min-w-[130px] ${className}`}>
      <Select value={String(initialMinutes)} onValueChange={handleMinutesChange}>
        <SelectTrigger className="h-8 text-[11px] bg-card border-border px-1.5 flex-1 rounded-md focus:ring-0">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          {minutesOptions.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m} min
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-[10px] font-bold">:</span>
      <Select value={String(initialSeconds)} onValueChange={handleSecondsChange}>
        <SelectTrigger className="h-8 text-[11px] bg-card border-border px-1.5 flex-1 rounded-md focus:ring-0">
          <SelectValue placeholder="Seg" />
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          {secondsOptions.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {String(s).padStart(2, "0")}s
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
