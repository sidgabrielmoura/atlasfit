"use client"

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export function moneyDigits(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 6)
}

export function moneyDisplay(digits: string) {
  if (!digits) return ""
  return (Number(digits) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function MoneyInput({ value, onValueChange, className, ...props }: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string
  onValueChange: (digits: string) => void
}) {
  return <Input {...props} type="text" inputMode="numeric" placeholder="0,00" className={cn("tabular-nums", className)} value={moneyDisplay(value)}
    onBeforeInput={(event) => {
      const data = (event.nativeEvent as InputEvent).data
      if (data && /[^0-9]/.test(data)) event.preventDefault()
    }}
    onChange={(event) => onValueChange(moneyDigits(event.target.value))}
  />
}
