import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Fetch Subscription Activities (Recent Activity)
    const activities = await prisma.subscriptionActivity.findMany({
      include: {
        user: true,
        plan: true
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    
    let formattedActivities: any[] = activities.map(act => ({
      ...act,
      workspace: {
        name: act.user?.name || "Conta de Personal",
        logo: act.user?.name?.slice(0, 2).toUpperCase() || "CP"
      }
    }));
    
    // Fallback to active subscriptions if activities are empty
    if (formattedActivities.length === 0) {
      const subscriptions = await prisma.subscription.findMany({
        include: {
          user: true,
          plan: true
        },
        orderBy: { startDate: "desc" }
      });
      formattedActivities = subscriptions.map(sub => ({
        ...sub,
        id: sub.id,
        createdAt: sub.startDate, // Map for UI consistency
        type: "NEW_SUBSCRIPTION",
        workspace: {
          name: sub.user?.name || "Conta de Personal",
          logo: sub.user?.name?.slice(0, 2).toUpperCase() || "CP"
        }
      }));
    }

    // 2. Fetch all Trainers (GlobalRole.TRAINER) to dynamically segment them in-memory
    const trainers = await prisma.user.findMany({
      where: {
        role: "TRAINER"
      },
      include: {
        subscription: {
          include: {
            plan: true
          }
        },
        freeTrial: true
      }
    });

    const today = new Date();
    
    const freeTrialsList: any[] = [];
    const preSubscriptionsList: any[] = [];
    const delinquentList: any[] = [];
    const impendingTrialList: any[] = [];
    
    trainers.forEach(trainer => {
      const trial = trainer.freeTrial;
      const sub = trainer.subscription;
      
      // 2.1 Segment Free Trial
      if (trial) {
        const isTrialActive = today < new Date(trial.endDate);
        const daysRemaining = Math.max(0, Math.ceil((new Date(trial.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        
        if (isTrialActive) {
          const trialInfo = {
            id: trainer.id,
            name: trainer.name || "Personal Trainer",
            email: trainer.email || "sem-email@atlasfit.com",
            whatsapp: trainer.whatsapp || "Não cadastrado",
            startDate: trial.startDate,
            endDate: trial.endDate,
            daysRemaining
          };
          
          freeTrialsList.push(trialInfo);
          
          // Impending trial? (Expiring in <= 3 days)
          if (daysRemaining <= 3) {
            impendingTrialList.push(trialInfo);
          }
        } else {
          // Trial expired and no active paid subscription -> Delinquent
          if (!sub || (sub.status !== "active" && sub.status !== "ACTIVE")) {
            delinquentList.push({
              id: trainer.id,
              name: trainer.name || "Personal Trainer",
              email: trainer.email || "sem-email@atlasfit.com",
              whatsapp: trainer.whatsapp || "Não cadastrado",
              status: "TRIAL_EXPIRED",
              date: trial.endDate,
              reason: "Free Trial expirado sem contratação de plano"
            });
          }
        }
      }
      
      // 2.2 Segment Pre-subscription
      if (sub && sub.isPreSubscription) {
        preSubscriptionsList.push({
          id: trainer.id,
          name: trainer.name || "Personal Trainer",
          email: trainer.email || "sem-email@atlasfit.com",
          whatsapp: trainer.whatsapp || "Não cadastrado",
          planName: sub.plan?.name || "Plano Profissional",
          amount: sub.plan?.price || 0,
          startDate: sub.startDate
        });
      }
      
      // 2.3 Segment Delinquent / Expired regular subscriptions
      if (sub && (sub.status === "past_due" || sub.status === "PAST_DUE" || sub.status === "expired" || sub.status === "EXPIRED")) {
        delinquentList.push({
          id: trainer.id,
          name: trainer.name || "Personal Trainer",
          email: trainer.email || "sem-email@atlasfit.com",
          whatsapp: trainer.whatsapp || "Não cadastrado",
          status: sub.status.toUpperCase(),
          date: sub.endDate || sub.startDate,
          reason: "Mensalidade em atraso ou assinatura suspensa"
        });
      }
    });

    // 3. Fetch Transaction Log (Database-aligned payments history)
    const transactions = await prisma.transaction.findMany({
      include: {
        user: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      date: tx.createdAt,
      amount: tx.amount,
      status: tx.status,
      paymentMethod: tx.paymentMethod || "PIX",
      description: tx.description || "Assinatura AtlasFit",
      userName: tx.user?.name || "Personal Trainer",
      userEmail: tx.user?.email || "sem-email@atlasfit.com"
    }));

    return NextResponse.json({
      activities: formattedActivities,
      freeTrials: {
        count: freeTrialsList.length,
        list: freeTrialsList
      },
      preSubscriptions: {
        count: preSubscriptionsList.length,
        list: preSubscriptionsList
      },
      delinquentTrainers: {
        count: delinquentList.length,
        list: delinquentList
      },
      impendingTrialExpirations: {
        count: impendingTrialList.length,
        list: impendingTrialList
      },
      transactionsHistory: formattedTransactions
    });

  } catch (error) {
    console.error("GET_SUBSCRIPTIONS_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
