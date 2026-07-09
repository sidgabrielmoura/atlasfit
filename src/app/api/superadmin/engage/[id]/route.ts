import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError, logAuditEvent } from "@/lib/logger";

function sanitizeString(val: string): string {
  if (!val) return "";
  return val.replace(/<[^>]*>/g, "");
}

function sanitizeBlocks(blocks: any[]): any[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map(block => {
    const cleanBlock = { ...block };
    if (typeof cleanBlock.content === "string") {
      cleanBlock.content = sanitizeString(cleanBlock.content);
    } else if (cleanBlock.content && typeof cleanBlock.content === "object" && cleanBlock.content !== null) {
      const cleanContent: any = {};
      for (const k in cleanBlock.content) {
        const val = cleanBlock.content[k];
        if (typeof val === "string") {
          cleanContent[k] = sanitizeString(val);
        } else {
          cleanContent[k] = val;
        }
      }
      cleanBlock.content = cleanContent;
    }
    return cleanBlock;
  });
}

// Function to find image keys in blocks
function getImageKeysFromBlocks(blocks: any): string[] {
  if (!Array.isArray(blocks)) return [];
  const keys: string[] = [];
  for (const block of blocks) {
    if ((block.type === "IMAGE" || block.type === "BANNER") && block.content?.imageKey) {
      keys.push(block.content.imageKey);
    }
  }
  return keys;
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

    const existingExperience = await prisma.engageExperience.findUnique({
      where: { id }
    });

    if (!existingExperience) {
      return new NextResponse("Experience not found", { status: 404 });
    }

    const {
      title,
      category,
      format,
      status,
      priority,
      startDate,
      endDate,
      showOnlyOnce,
      blocks,
      segmentation,
    } = body;

    const dataToUpdate: any = {};

    let start = existingExperience.startDate;
    let end = existingExperience.endDate;

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

    if (title !== undefined) {
      dataToUpdate.title = sanitizeString(title);
    }
    if (category !== undefined) {
      dataToUpdate.category = sanitizeString(category);
    }
    if (format !== undefined) dataToUpdate.format = format;
    if (status !== undefined) dataToUpdate.status = status;
    if (priority !== undefined) dataToUpdate.priority = parseInt(priority);
    if (showOnlyOnce !== undefined) dataToUpdate.showOnlyOnce = !!showOnlyOnce;
    if (segmentation !== undefined) dataToUpdate.segmentation = segmentation;

    if (blocks !== undefined) {
      dataToUpdate.blocks = sanitizeBlocks(blocks);
      
      // Cleanup deleted R2 images
      const existingKeys = getImageKeysFromBlocks(existingExperience.blocks);
      const newKeys = getImageKeysFromBlocks(blocks);
      const deletedKeys = existingKeys.filter(k => !newKeys.includes(k));

      if (deletedKeys.length > 0) {
        const { storageService } = require("@/lib/storage.service");
        for (const key of deletedKeys) {
          await storageService.deleteObject(key).catch((e: any) =>
            console.error("Error deleting old image from R2:", e)
          );
        }
      }
    }

    const updated = await prisma.engageExperience.update({
      where: { id },
      data: dataToUpdate,
    });

    await logAuditEvent({
      action: "ENGAGE_EXPERIENCE_UPDATE",
      userId: session.user.id,
      entity: "ENGAGE_EXPERIENCE",
      entityId: updated.id,
      severity: "info",
    });

    return NextResponse.json(updated);
  } catch (error) {
    await logSystemError({ action: "PATCH_ENGAGE_EXPERIENCE", error, entity: "ENGAGE_EXPERIENCE" });
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

    const existingExperience = await prisma.engageExperience.findUnique({
      where: { id }
    });

    if (!existingExperience) {
      return new NextResponse("Experience not found", { status: 404 });
    }

    const keys = getImageKeysFromBlocks(existingExperience.blocks);
    if (keys.length > 0) {
      const { storageService } = require("@/lib/storage.service");
      for (const key of keys) {
        await storageService.deleteObject(key).catch((e: any) =>
          console.error("Error deleting image from R2 on delete:", e)
        );
      }
    }

    await prisma.engageExperience.delete({
      where: { id }
    });

    await logAuditEvent({
      action: "ENGAGE_EXPERIENCE_DELETE",
      userId: session.user.id,
      entity: "ENGAGE_EXPERIENCE",
      entityId: id,
      severity: "warning",
    });

    return new NextResponse("Experience deleted successfully", { status: 200 });
  } catch (error) {
    await logSystemError({ action: "DELETE_ENGAGE_EXPERIENCE", error, entity: "ENGAGE_EXPERIENCE" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
