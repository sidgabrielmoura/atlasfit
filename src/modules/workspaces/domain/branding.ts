import { z } from "zod";

export const DEFAULT_WORKSPACE_COLOR = "#2B4FCC";
export function normalizeWorkspaceColor(value: string | null | undefined): string {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value.trim())) return DEFAULT_WORKSPACE_COLOR;
  return value.trim().toUpperCase();
}
export function brandingForeground(color: string): "#000000" | "#FFFFFF" {
  const clean = normalizeWorkspaceColor(color).slice(1);
  const rgb = [0, 2, 4].map(offset => parseInt(clean.slice(offset, offset + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#FFFFFF";
}
const imageUrl = z.string().max(2048).refine(value => !value || value.startsWith("/api/storage/file?key=") || /^https:\/\/[^\s<>"']+$/.test(value), "Use uma imagem HTTPS ou um upload da academia.").nullable().optional();
export const workspaceBrandingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(80).optional(),
  slogan: z.string().trim().max(160).nullable().optional(),
  primaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i).transform(value => value.toUpperCase()),
  logoUrl: imageUrl, logoKey: z.string().max(1024).nullable().optional(),
  watermarkUrl: imageUrl, watermarkKey: z.string().max(1024).nullable().optional(),
  workoutCoverUrl: imageUrl, workoutCoverKey: z.string().max(1024).nullable().optional(),
}).strict();
export type WorkspaceBrandingInput = z.infer<typeof workspaceBrandingSchema>;
