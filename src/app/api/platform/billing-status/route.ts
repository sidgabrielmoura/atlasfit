import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { isPersonalTrialActive } from "@/modules/workspaces/domain/personal-trial";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role === "SUPERADMIN") {
      return NextResponse.json({
        status: "OK",
        daysUntilLock: null,
        isManual: false,
        dueDate: null,
        whatsappUrl: "",
        checkoutUrl: "",
      });
    }

    // Resolving active workspace context
    const context = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
    if (!context.workspaceId) {
      return NextResponse.json({ status: "OK", daysUntilLock: null, isManual: false });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: context.workspaceId },
      select: { id: true, name: true, type: true, ownerId: true, isActive: true },
    });

    if (!workspace) {
      return NextResponse.json({ status: "OK", daysUntilLock: null, isManual: false });
    }

    // Fetch support whatsapp
    const [whatsappSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "support_whatsapp" } }),
    ]);

    const rawPhone =
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
      process.env.SUPPORT_WHATSAPP ||
      whatsappSetting?.value ||
      "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const formattedPhone = cleanPhone
      ? cleanPhone.startsWith("55")
        ? cleanPhone
        : `55${cleanPhone}`
      : "";

    const userEmail = session.user.email || "";
    const waMessage = `Olá! Gostaria de regularizar a mensalidade da plataforma AtlasFit. Minha conta: ${userEmail} (${workspace.name})`;
    const whatsappUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMessage)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`;

    const now = new Date();

    if (workspace.type === "PERSONAL") {
      const owner = await prisma.user.findUnique({
        where: { id: workspace.ownerId },
        select: {
          id: true,
          isTestAccount: true,
          freeTrial: true,
          subscription: {
            include: { plan: true },
          },
        },
      });

      if (owner?.isTestAccount) {
        return NextResponse.json({ status: "OK", daysUntilLock: null, isManual: false });
      }

      const freeTrial = owner?.freeTrial;
      if (isPersonalTrialActive(freeTrial)) {
        return NextResponse.json({ status: "OK", daysUntilLock: null, isManual: false });
      }

      const sub = owner?.subscription;
      if (!sub) {
        return NextResponse.json({
          status: "LOCKED",
          daysUntilLock: 0,
          isManual: false,
          dueDate: null,
          whatsappUrl,
          checkoutUrl: "/personal/subscription",
        });
      }

      const isManual = sub.billingControlType === "MANUAL";
      const checkoutUrl = isManual ? whatsappUrl : "/personal/subscription";

      if (isManual) {
        const dueDate = sub.nextDueDate || sub.endDate;
        const toleranceDays = sub.toleranceDays ?? 5;
        const autoSuspend = sub.autoSuspendEnabled;

        if (!dueDate) {
          return NextResponse.json({ status: "OK", daysUntilLock: null, isManual: true });
        }

        const dueDateTime = new Date(dueDate).getTime();
        const nowTime = now.getTime();

        if (nowTime <= dueDateTime) {
          const diffMs = dueDateTime - nowTime;
          const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (daysUntilDue <= 5) {
            return NextResponse.json({
              status: "UPCOMING",
              daysUntilLock: daysUntilDue,
              isManual: true,
              dueDate: dueDate.toISOString(),
              whatsappUrl,
              checkoutUrl,
              planName: sub.plan.name,
            });
          }

          return NextResponse.json({
            status: "OK",
            daysUntilLock: null,
            isManual: true,
            dueDate: dueDate.toISOString(),
            whatsappUrl,
            checkoutUrl,
            planName: sub.plan.name,
          });
        }

        // Overdue
        const diffMs = nowTime - dueDateTime;
        const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const daysUntilLock = Math.max(0, toleranceDays - overdueDays);
        const isLocked = overdueDays >= toleranceDays;

        if (isLocked && autoSuspend && workspace.isActive) {
          // Auto-suspend personal workspace
          await prisma.workspace.update({
            where: { id: workspace.id },
            data: { isActive: false },
          });
        }

        return NextResponse.json({
          status: isLocked ? "LOCKED" : "WARNING",
          daysUntilLock,
          isManual: true,
          dueDate: dueDate.toISOString(),
          whatsappUrl,
          checkoutUrl,
          planName: sub.plan.name,
        });
      } else {
        // AUTOMATIC PLATFORM SUBSCRIPTION
        const statusLower = sub.status.toLowerCase();
        if (["past_due", "unpaid"].includes(statusLower)) {
          return NextResponse.json({
            status: "WARNING",
            daysUntilLock: 0,
            isManual: false,
            dueDate: sub.endDate ? sub.endDate.toISOString() : null,
            whatsappUrl,
            checkoutUrl: "/personal/subscription",
            planName: sub.plan.name,
          });
        }

        if (sub.endDate) {
          const dueDateTime = new Date(sub.endDate).getTime();
          const nowTime = now.getTime();
          if (nowTime <= dueDateTime) {
            const diffMs = dueDateTime - nowTime;
            const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (daysUntilDue <= 5 && statusLower === "canceled") {
              return NextResponse.json({
                status: "UPCOMING",
                daysUntilLock: daysUntilDue,
                isManual: false,
                dueDate: sub.endDate.toISOString(),
                whatsappUrl,
                checkoutUrl: "/personal/subscription",
                planName: sub.plan.name,
              });
            }
          }
        }

        return NextResponse.json({
          status: "OK",
          daysUntilLock: null,
          isManual: false,
          dueDate: sub.endDate ? sub.endDate.toISOString() : null,
          whatsappUrl,
          checkoutUrl: "/personal/subscription",
          planName: sub.plan.name,
        });
      }
    } else {
      // GYM WORKSPACE
      const wsSub = await prisma.workspaceSubscription.findUnique({
        where: { workspaceId: workspace.id },
        include: { plan: true },
      });

      if (!wsSub) {
        return NextResponse.json({
          status: "OK",
          daysUntilLock: null,
          isManual: false,
          dueDate: null,
          whatsappUrl,
          checkoutUrl: whatsappUrl,
        });
      }

      // Check trial
      if (wsSub.status === "TRIAL" && wsSub.trialEndsAt && now < wsSub.trialEndsAt) {
        return NextResponse.json({
          status: "OK",
          daysUntilLock: null,
          isManual: false,
          dueDate: wsSub.trialEndsAt.toISOString(),
          whatsappUrl,
          checkoutUrl: whatsappUrl,
        });
      }

      const isManual = wsSub.billingControlType === "MANUAL";
      const checkoutUrl = isManual ? whatsappUrl : `/gym/settings/billing`;

      if (isManual) {
        const dueDate = wsSub.nextDueDate || wsSub.endDate;
        const toleranceDays = wsSub.toleranceDays ?? 5;
        const autoSuspend = wsSub.autoSuspendEnabled;

        if (!dueDate) {
          return NextResponse.json({ status: "OK", daysUntilLock: null, isManual: true });
        }

        const dueDateTime = new Date(dueDate).getTime();
        const nowTime = now.getTime();

        if (nowTime <= dueDateTime) {
          const diffMs = dueDateTime - nowTime;
          const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (daysUntilDue <= 5) {
            return NextResponse.json({
              status: "UPCOMING",
              daysUntilLock: daysUntilDue,
              isManual: true,
              dueDate: dueDate.toISOString(),
              whatsappUrl,
              checkoutUrl,
              planName: wsSub.plan?.name || "Plano Academia",
            });
          }

          return NextResponse.json({
            status: "OK",
            daysUntilLock: null,
            isManual: true,
            dueDate: dueDate.toISOString(),
            whatsappUrl,
            checkoutUrl,
            planName: wsSub.plan?.name || "Plano Academia",
          });
        }

        // Overdue
        const diffMs = nowTime - dueDateTime;
        const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const daysUntilLock = Math.max(0, toleranceDays - overdueDays);
        const isLocked = overdueDays >= toleranceDays;

        if (isLocked && autoSuspend && workspace.isActive) {
          // Auto-suspend gym workspace
          await prisma.workspace.update({
            where: { id: workspace.id },
            data: { isActive: false },
          });
          await prisma.workspaceSubscription.update({
            where: { id: wsSub.id },
            data: { status: "EXPIRED" },
          });
        }

        return NextResponse.json({
          status: isLocked ? "LOCKED" : "WARNING",
          daysUntilLock,
          isManual: true,
          dueDate: dueDate.toISOString(),
          whatsappUrl,
          checkoutUrl,
          planName: wsSub.plan?.name || "Plano Academia",
        });
      } else {
        // AUTOMATIC GYM SUBSCRIPTION
        if (wsSub.status === "PAST_DUE") {
          return NextResponse.json({
            status: "WARNING",
            daysUntilLock: 0,
            isManual: false,
            dueDate: wsSub.endDate ? wsSub.endDate.toISOString() : null,
            whatsappUrl,
            checkoutUrl,
            planName: wsSub.plan?.name || "Plano Academia",
          });
        }

        if (wsSub.status === "EXPIRED" || wsSub.status === "CANCELED") {
          return NextResponse.json({
            status: "LOCKED",
            daysUntilLock: 0,
            isManual: false,
            dueDate: wsSub.endDate ? wsSub.endDate.toISOString() : null,
            whatsappUrl,
            checkoutUrl,
            planName: wsSub.plan?.name || "Plano Academia",
          });
        }

        return NextResponse.json({
          status: "OK",
          daysUntilLock: null,
          isManual: false,
          dueDate: wsSub.endDate ? wsSub.endDate.toISOString() : null,
          whatsappUrl,
          checkoutUrl,
          planName: wsSub.plan?.name || "Plano Academia",
        });
      }
    }
  } catch (err: unknown) {
    console.error("[PlatformBillingStatus]", err);
    return NextResponse.json({ error: "Erro ao consultar status financeiro." }, { status: 500 });
  }
}
