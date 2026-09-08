"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const WORKOUT_DURATIONS = [
  "15 min",
  "20 min",
  "25 min",
  "30 min",
  "35 min",
  "40 min",
  "45 min",
  "50 min",
  "55 min",
  "60 min",
  "70 min",
  "75 min",
  "80 min",
  "90 min",
  "105 min",
  "120 min",
];

interface WorkoutDurationSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}

export function WorkoutDurationSelect({
  value,
  onValueChange,
  disabled = false,
  className,
  placeholder = "Selecione o tempo estimado",
  id,
}: WorkoutDurationSelectProps) {
  const currentVal = value?.trim() || "";

  // Garante que se o treino tiver uma duração personalizada salva (ex: "45-60 min"), ela apareça na lista
  const options = currentVal && !WORKOUT_DURATIONS.includes(currentVal)
    ? [currentVal, ...WORKOUT_DURATIONS]
    : WORKOUT_DURATIONS;

  return (
    <Select
      value={currentVal || "60 min"}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "w-full bg-background border-border text-sm h-10 cursor-pointer",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border max-h-60 overflow-y-auto">
        {options.map((dur) => (
          <SelectItem key={dur} value={dur} className="text-sm cursor-pointer font-medium">
            {dur}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
