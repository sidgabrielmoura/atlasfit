import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Verify trainer is member of the workspace
    const trainerCheck = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId }
    });

    if (!trainerCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // 1. Fetch evaluations metrics
    const totalEvals = await prisma.physicalEvaluation.count({
      where: { workspaceId }
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const evalsThisMonth = await prisma.physicalEvaluation.count({
      where: {
        workspaceId,
        date: {
          gte: startOfMonth
        }
      }
    });

    // Average Body Fat in workspace
    const evalsWithBf = await prisma.physicalEvaluation.findMany({
      where: {
        workspaceId,
        bodyFat: { not: null }
      },
      select: { bodyFat: true }
    });

    const avgBodyFat = evalsWithBf.length > 0
      ? parseFloat((evalsWithBf.reduce((sum, e) => sum + (e.bodyFat || 0), 0) / evalsWithBf.length).toFixed(2))
      : 0;

    // 2. Fetch pending evaluations count (active students with last eval older than 60 days or no evals at all)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const students = await prisma.workspaceMember.findMany({
      where: { workspaceId, role: "STUDENT", isActive: true },
      include: {
        user: {
          include: {
            physicalEvaluations: {
              where: { workspaceId },
              orderBy: { date: "desc" },
              take: 1
            }
          }
        }
      }
    });

    let pendingCount = 0;
    students.forEach(s => {
      const latestEval = s.user.physicalEvaluations[0];
      if (!latestEval) {
        pendingCount++;
      } else if (new Date(latestEval.date) < sixtyDaysAgo) {
        pendingCount++;
      }
    });

    // 3. Recent evaluations list
    const recentEvaluations = await prisma.physicalEvaluation.findMany({
      where: { workspaceId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            gender: true,
            birthDate: true,
            height: true,
            weight: true,
            objective: true
          }
        }
      },
      orderBy: { date: "desc" },
      take: 20
    });

    // 4. Rankings of student evolution
    const studentsWithEvals = await prisma.workspaceMember.findMany({
      where: { workspaceId, role: "STUDENT", isActive: true },
      include: {
        user: {
          include: {
            physicalEvaluations: {
              where: { workspaceId },
              orderBy: { date: "asc" }
            }
          }
        }
      }
    });

    const studentEvolutions = studentsWithEvals.map(m => {
      const evals = m.user.physicalEvaluations;
      if (evals.length === 0) {
        return null;
      }
      
      const first = evals[0];
      const last = evals[evals.length - 1];

      const bfDelta = (first.bodyFat !== null && last.bodyFat !== null)
        ? parseFloat((first.bodyFat - last.bodyFat).toFixed(2)) // Positive means fat loss
        : 0;

      const muscleMassDelta = (first.muscleMass !== null && last.muscleMass !== null)
        ? parseFloat((last.muscleMass - first.muscleMass).toFixed(2)) // Positive means muscle gain
        : 0;

      const weightDelta = parseFloat((last.weight - first.weight).toFixed(2));

      return {
        id: m.user.id,
        name: m.user.name || "Sem Nome",
        email: m.user.email || "",
        image: m.user.image,
        evalsCount: evals.length,
        bfDelta,
        muscleMassDelta,
        weightDelta,
        lastBf: last.bodyFat,
        lastMuscleMass: last.muscleMass,
        lastWeight: last.weight,
      };
    }).filter(Boolean);

    // Students with most evolution (positive BF delta i.e. lost fat, or positive muscle mass gain)
    const evolvingMost = [...studentEvolutions]
      .filter((s: any) => s.evalsCount >= 2 && (s.bfDelta > 0 || s.muscleMassDelta > 0))
      .sort((a: any, b: any) => {
        // Primary sort by body fat loss
        if (b.bfDelta !== a.bfDelta) {
          return b.bfDelta - a.bfDelta;
        }
        return b.muscleMassDelta - a.muscleMassDelta;
      })
      .slice(0, 5);

    // Students with least evolution (negative BF delta i.e. gained fat, or no changes)
    const evolvingLeast = [...studentEvolutions]
      .filter((s: any) => s.evalsCount >= 2)
      .sort((a: any, b: any) => {
        // Sort by lowest fat loss (meaning they lost the least or gained the most fat)
        if (a.bfDelta !== b.bfDelta) {
          return a.bfDelta - b.bfDelta;
        }
        return a.muscleMassDelta - b.muscleMassDelta; // or lowest muscle gain
      })
      .slice(0, 5);

    return NextResponse.json({
      metrics: {
        totalEvals,
        evalsThisMonth,
        avgBodyFat,
        pendingCount
      },
      recentEvaluations,
      rankings: {
        evolvingMost,
        evolvingLeast
      }
    });
  } catch (error) {
    console.error("GET assessments dashboard metrics error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
