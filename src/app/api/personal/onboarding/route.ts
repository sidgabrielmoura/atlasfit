import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { createPrivatePersonalWorkspace } from "@/modules/workspaces/application/personal-affiliation";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { slugify } from "@/lib/utils";

const text = z.string().trim().max(2000).nullable().optional();
const schema = z.object({
  name: z.string().trim().min(1).max(120), specialty: z.string().trim().min(1).max(120), whatsapp: z.string().trim().min(1).max(30), city: z.string().trim().min(1).max(120), experience: z.string().trim().min(1).max(120), brandName: z.string().trim().min(1).max(120),
  image: text, imageKey: text, bio: text, instagram: text, linkedin: text, cref: text, brandSlogan: text,
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), logoUrl: text, logoKey: text, watermarkUrl: text, watermarkKey: text, workoutCoverUrl: text, workoutCoverKey: text,
}).strict();

export async function POST(req: Request) {
  const restricted = await personalCommercialContextResponse({ allowExpired: true }); if (restricted) return restricted;
  const session = await auth(); if (!session?.user?.id) return NextResponse.json({ error: "Sessão não autenticada." }, { status: 401 });
  try {
    const body = schema.parse(await req.json());
    const { workspace } = await createPrivatePersonalWorkspace(session.user.id, { name: body.brandName, slug: slugify(body.brandName) }, {
      autoSlug: true,
      profile: { name: body.name, image: body.image || null, imageKey: body.imageKey || null, bio: body.bio || null, specialty: body.specialty, whatsapp: body.whatsapp, instagram: body.instagram || null, linkedin: body.linkedin || null, city: body.city, experience: body.experience, cref: body.cref || null },
      branding: { slogan: body.brandSlogan || null, primaryColor: body.brandColor || "#2B4FCC", logoUrl: body.logoUrl || null, logoKey: body.logoKey || null, watermarkUrl: body.watermarkUrl || null, watermarkKey: body.watermarkKey || null, workoutCoverUrl: body.workoutCoverUrl || null, workoutCoverKey: body.workoutCoverKey || null },
    });
    return NextResponse.json({ success: true, workspaceId: workspace.id });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados de cadastro inválidos." }, { status: 400 });
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    throw error;
  }
}
