"use client";

import { useFcm } from "@/hooks/useFcm";

export function PwaFcmInit() {
  useFcm();
  return null;
}
