import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError, logAuditEvent } from "@/lib/logger";

function sanitizeString(val: string): string {
  if (!val) return "";
  let clean = val.replace(/<[^>]*>/g, "");
  clean = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
  return clean;
}

function isValidHttpsUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  const lowerUrl = trimmed.toLowerCase();
  
  if (!lowerUrl.startsWith("https://")) return false;
  if (
    lowerUrl.includes("javascript:") ||
    lowerUrl.includes("data:") ||
    lowerUrl.includes("vbscript:")
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidHttpsOrBase64Image(url: string | null | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  const lowerUrl = trimmed.toLowerCase();

  if (lowerUrl.startsWith("data:image/")) {
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(trimmed);
  }

  return isValidHttpsUrl(trimmed);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const existingCampaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!existingCampaign) {
      return new NextResponse("Campaign not found", { status: 404 });
    }

    const {
      title,
      description,
      imageUrl,
      type,
      targetRole,
      startDate,
      endDate,
      buttonText,
      buttonLink,
      showOnlyOnce,
      isActive,
      priority,
    } = body;

    const dataToUpdate: any = {};

    // Basic date validations if provided
    let start = existingCampaign.startDate;
    let end = existingCampaign.endDate;

    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return new NextResponse("Invalid start date", { status: 400 });
      }
      dataToUpdate.startDate = start;
    }

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return new NextResponse("Invalid end date", { status: 400 });
      }
      dataToUpdate.endDate = end;
    }

    if (start > end) {
      return new NextResponse("Start date cannot be after end date", { status: 400 });
    }

    // URL Validations
    if (imageUrl !== undefined) {
      if (imageUrl && !isValidHttpsOrBase64Image(imageUrl)) {
        return new NextResponse("Image URL must be a valid HTTPS URL or Base64 Image", { status: 400 });
      }
      dataToUpdate.imageUrl = imageUrl ? imageUrl.trim() : null;
    }

    if (buttonLink !== undefined) {
      if (buttonLink && !isValidHttpsUrl(buttonLink)) {
        return new NextResponse("Button URL must use HTTPS", { status: 400 });
      }
      dataToUpdate.buttonLink = buttonLink ? buttonLink.trim() : null;
    }

    // Sanitize strings
    if (title !== undefined) {
      dataToUpdate.title = sanitizeString(title);
    }
    if (description !== undefined) {
      dataToUpdate.description = sanitizeString(description);
    }
    if (buttonText !== undefined) {
      dataToUpdate.buttonText = buttonText ? sanitizeString(buttonText) : null;
    }

    // Direct mappings
    if (type !== undefined) dataToUpdate.type = type;
    if (targetRole !== undefined) dataToUpdate.targetRole = targetRole;
    if (showOnlyOnce !== undefined) dataToUpdate.showOnlyOnce = !!showOnlyOnce;
    if (isActive !== undefined) dataToUpdate.isActive = !!isActive;
    if (priority !== undefined) dataToUpdate.priority = parseInt(priority);

    if (body.imageKey !== undefined) {
      dataToUpdate.imageKey = body.imageKey;
      if (existingCampaign.imageKey && existingCampaign.imageKey !== body.imageKey) {
        const { storageService } = require("@/lib/storage.service");
        await storageService.deleteObject(existingCampaign.imageKey).catch((e: any) =>
          console.error("Error deleting old campaign image from R2:", e)
        );
      }
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: dataToUpdate,
    });

    await logAuditEvent({
      action: "CAMPAIGN_UPDATE",
      userId: session.user.id,
      entity: "CAMPAIGN",
      entityId: updatedCampaign.id,
      severity: "info",
    });

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    await logSystemError({ action: "PATCH_CAMPAIGN_UPDATE", error, entity: "CAMPAIGN" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;

    const existingCampaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!existingCampaign) {
      return new NextResponse("Campaign not found", { status: 404 });
    }

    if (existingCampaign.imageKey) {
      const { storageService } = require("@/lib/storage.service");
      await storageService.deleteObject(existingCampaign.imageKey).catch((e: any) =>
        console.error("Error deleting campaign image on delete:", e)
      );
    }

    await prisma.campaign.delete({
      where: { id }
    });

    await logAuditEvent({
      action: "CAMPAIGN_DELETE",
      userId: session.user.id,
      entity: "CAMPAIGN",
      entityId: id,
      severity: "warning",
    });

    return new NextResponse("Campaign deleted successfully", { status: 200 });
  } catch (error) {
    await logSystemError({ action: "DELETE_CAMPAIGN", error, entity: "CAMPAIGN" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
