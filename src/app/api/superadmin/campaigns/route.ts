import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logSystemError, logAuditEvent } from "@/lib/logger";

// Helper function to sanitize user-provided strings
function sanitizeString(val: string): string {
  if (!val) return "";
  // Strip HTML tags
  let clean = val.replace(/<[^>]*>/g, "");
  // Escape HTML entities to prevent injection
  clean = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
  return clean;
}

// Helper function to validate URLs strictly
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

// Helper function to validate both HTTPS URLs and base64 image data URIs
function isValidHttpsOrBase64Image(url: string | null | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  const lowerUrl = trimmed.toLowerCase();

  if (lowerUrl.startsWith("data:image/")) {
    // Matches data:image/<type>;base64,<data>
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(trimmed);
  }

  return isValidHttpsUrl(trimmed);
}

export async function GET(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const targetRole = searchParams.get("targetRole");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type && type !== "all") {
      where.type = type;
    }

    if (targetRole && targetRole !== "all") {
      where.targetRole = targetRole;
    }

    if (isActive && isActive !== "all") {
      where.isActive = isActive === "true";
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
      data: campaigns,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    await logSystemError({ action: "GET_CAMPAIGNS", error, entity: "CAMPAIGN" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
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

    // Check required fields
    if (!title || !description || !type || !targetRole || !startDate || !endDate) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Validate date logic
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new NextResponse("Invalid dates provided", { status: 400 });
    }
    if (start > end) {
      return new NextResponse("Start date cannot be after end date", { status: 400 });
    }

    // Validate URLs
    if (!isValidHttpsOrBase64Image(imageUrl)) {
      return new NextResponse("Image URL must be a valid HTTPS URL or Base64 Image", { status: 400 });
    }
    if (!isValidHttpsUrl(buttonLink)) {
      return new NextResponse("Button URL must use HTTPS", { status: 400 });
    }

    // Sanitize strings to prevent Stored XSS & Injection
    const cleanTitle = sanitizeString(title);
    const cleanDescription = sanitizeString(description);
    const cleanButtonText = buttonText ? sanitizeString(buttonText) : null;

    const campaign = await prisma.campaign.create({
      data: {
        title: cleanTitle,
        description: cleanDescription,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        type,
        targetRole,
        startDate: start,
        endDate: end,
        buttonText: cleanButtonText,
        buttonLink: buttonLink ? buttonLink.trim() : null,
        showOnlyOnce: !!showOnlyOnce,
        isActive: isActive !== undefined ? !!isActive : true,
        priority: priority ? parseInt(priority) : 0,
      },
    });

    await logAuditEvent({
      action: "CAMPAIGN_CREATE",
      userId: session.user.id,
      entity: "CAMPAIGN",
      entityId: campaign.id,
      severity: "success",
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    await logSystemError({ action: "POST_CAMPAIGN_CREATE", error, entity: "CAMPAIGN" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
