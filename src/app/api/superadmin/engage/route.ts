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

export async function GET(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const format = searchParams.get("format");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId: null, // Superadmin engage experiences are platform-wide/global
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "all") {
      where.category = category;
    }

    if (format && format !== "all") {
      where.format = format;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const [experiences, total] = await Promise.all([
      prisma.engageExperience.findMany({
        where,
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.engageExperience.count({ where }),
    ]);

    // Gather event analytics in a single optimized query
    const experienceIds = experiences.map((e: any) => e.id);
    const eventCounts = await prisma.engageEventLog.groupBy({
      by: ["experienceId", "eventType"],
      where: {
        experienceId: { in: experienceIds }
      },
      _count: true
    });

    const statsMap: Record<string, any> = {};
    for (const log of eventCounts) {
      if (!statsMap[log.experienceId]) {
        statsMap[log.experienceId] = { views: 0, clicks: 0, dismisses: 0, joins: 0, completions: 0 };
      }
      const type = log.eventType;
      const count = log._count;
      if (type === "VIEW") statsMap[log.experienceId].views = count;
      else if (type === "CLICK") statsMap[log.experienceId].clicks = count;
      else if (type === "DISMISS") statsMap[log.experienceId].dismisses = count;
      else if (type === "JOIN") statsMap[log.experienceId].joins = count;
      else if (type === "COMPLETE") statsMap[log.experienceId].completions = count;
    }

    const dataWithStats = experiences.map((e: any) => {
      const expStats = statsMap[e.id] || { views: 0, clicks: 0, dismisses: 0, joins: 0, completions: 0 };
      const ctr = expStats.views > 0 ? Math.round((expStats.clicks / expStats.views) * 100) : 0;
      return {
        ...e,
        stats: { ...expStats, ctr }
      };
    });

    return NextResponse.json({
      data: dataWithStats,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    await logSystemError({ action: "GET_ENGAGE_EXPERIENCES", error, entity: "ENGAGE_EXPERIENCE" });
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

    if (!title || !category || !format || !startDate || !endDate || !blocks) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new NextResponse("Invalid dates provided", { status: 400 });
    }
    if (start > end) {
      return new NextResponse("Start date cannot be after end date", { status: 400 });
    }

    const cleanTitle = sanitizeString(title);
    const cleanCategory = sanitizeString(category);
    const cleanBlocks = sanitizeBlocks(blocks);

    const experience = await prisma.engageExperience.create({
      data: {
        title: cleanTitle,
        category: cleanCategory,
        format,
        status: status || "DRAFT",
        priority: priority ? parseInt(priority) : 0,
        startDate: start,
        endDate: end,
        showOnlyOnce: !!showOnlyOnce,
        blocks: cleanBlocks,
        segmentation: segmentation || {},
        creatorId: session.user.id,
      },
    });

    await logAuditEvent({
      action: "ENGAGE_EXPERIENCE_CREATE",
      userId: session.user.id,
      entity: "ENGAGE_EXPERIENCE",
      entityId: experience.id,
      severity: "success",
    });

    return NextResponse.json(experience, { status: 201 });
  } catch (error) {
    await logSystemError({ action: "POST_ENGAGE_EXPERIENCE_CREATE", error, entity: "ENGAGE_EXPERIENCE" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
