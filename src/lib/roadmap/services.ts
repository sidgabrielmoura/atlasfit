import prisma from "@/lib/prisma";
import { ensureRoadmapDefaults } from "./seed";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function getRoadmapData(
  userId?: string,
  search?: string,
  categoryId?: string,
  sort: string = "popular",
  priority?: string,
  source?: string,
  isSuperAdmin: boolean = false
) {
  await ensureRoadmapDefaults();

  const statusWhere: any = { isActive: true };
  if (!isSuperAdmin) {
    statusWhere.isPublic = true;
  }

  const statuses = await prisma.roadmapStatus.findMany({
    where: statusWhere,
    orderBy: { position: "asc" },
  });

  const categories = await prisma.roadmapCategory.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });

  // Base feature filters
  const where: any = {
    deletedAt: null,
    mergedIntoId: null,
    visibility: "PUBLIC",
  };

  if (categoryId && categoryId !== "ALL") {
    where.categoryId = categoryId;
  }

  if (priority && priority !== "ALL") {
    where.priority = priority;
  }

  if (source && source !== "ALL") {
    where.source = source;
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  let orderBy: any = { rank: "asc" };
  if (sort === "popular") {
    orderBy = [{ voteCount: "desc" }, { createdAt: "desc" }];
  } else if (sort === "recent") {
    orderBy = { createdAt: "desc" };
  } else if (sort === "comments") {
    orderBy = { commentCount: "desc" };
  }

  const features = await prisma.roadmapFeature.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, image: true, role: true } },
      editedBy: { select: { id: true, name: true, role: true } },
      category: { select: { id: true, name: true, icon: true, slug: true } },
      status: { select: { id: true, name: true, slug: true, color: true } },
      votes: userId ? { where: { userId }, select: { id: true } } : false,
    },
    orderBy,
  });

  const formattedFeatures = await Promise.all(
    features.map(async (f: any) => {
      const recentInteractors = await getRecentInteractors(f.id);
      return {
        ...f,
        userHasVoted: userId && Array.isArray(f.votes) ? f.votes.length > 0 : false,
        recentInteractors,
        votes: undefined,
      };
    })
  );

  // Summary counts
  const totalIdeas = await prisma.roadmapFeature.count({ where: { deletedAt: null, mergedIntoId: null } });
  const totalVotes = await prisma.roadmapVote.count();
  const releasedStatus = statuses.find((s) => s.slug === "released");
  const totalReleased = releasedStatus
    ? await prisma.roadmapFeature.count({ where: { statusId: releasedStatus.id, deletedAt: null } })
    : 0;

  return {
    statuses,
    categories,
    features: formattedFeatures,
    stats: {
      totalIdeas,
      totalVotes,
      totalReleased,
    },
  };
}

export async function toggleVote(featureId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const existingVote = await tx.roadmapVote.findUnique({
      where: {
        featureId_userId: { featureId, userId },
      },
    });

    if (existingVote) {
      await tx.roadmapVote.delete({
        where: { id: existingVote.id },
      });
      const updated = await tx.roadmapFeature.update({
        where: { id: featureId },
        data: { voteCount: { decrement: 1 } },
        select: { id: true, voteCount: true },
      });
      return { voted: false, voteCount: Math.max(0, updated.voteCount) };
    } else {
      await tx.roadmapVote.create({
        data: { featureId, userId },
      });
      const updated = await tx.roadmapFeature.update({
        where: { id: featureId },
        data: { voteCount: { increment: 1 } },
        select: { id: true, voteCount: true },
      });
      return { voted: true, voteCount: updated.voteCount };
    }
  });
}

export async function searchSimilarSuggestions(query: string) {
  if (!query || query.trim().length < 3) return [];

  const term = query.trim();
  const matches = await prisma.roadmapFeature.findMany({
    where: {
      deletedAt: null,
      mergedIntoId: null,
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      voteCount: true,
      status: { select: { name: true, color: true } },
    },
    take: 3,
    orderBy: { voteCount: "desc" },
  });

  return matches;
}

export async function createSuggestion(authorId: string, title: string, description: string, categoryId?: string | null) {
  await ensureRoadmapDefaults();

  const defaultStatus = await prisma.roadmapStatus.findFirst({
    where: { slug: "ideas" },
  });

  if (!defaultStatus) throw new Error("Status padrão não encontrado");

  let baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.roadmapFeature.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Get max rank in status
  const lastFeature = await prisma.roadmapFeature.findFirst({
    where: { statusId: defaultStatus.id },
    orderBy: { rank: "desc" },
    select: { rank: true },
  });

  const nextRank = (lastFeature?.rank || 0) + 1000;

  return await prisma.$transaction(async (tx) => {
    const feature = await tx.roadmapFeature.create({
      data: {
        title,
        slug,
        description,
        authorId,
        statusId: defaultStatus.id,
        categoryId: categoryId || null,
        source: "COMMUNITY",
        voteCount: 1,
        rank: nextRank,
      },
    });

    await tx.roadmapVote.create({
      data: { featureId: feature.id, userId: authorId },
    });

    return feature;
  });
}

export async function getFeatureDetails(featureId: string, userId?: string) {
  const feature = await prisma.roadmapFeature.findUnique({
    where: { id: featureId },
    include: {
      author: { select: { id: true, name: true, image: true, role: true } },
      editedBy: { select: { id: true, name: true, role: true } },
      category: { select: { id: true, name: true, icon: true, slug: true } },
      status: { select: { id: true, name: true, slug: true, color: true } },
      officialResponseBy: { select: { id: true, name: true, image: true } },
      comments: {
        where: { deletedAt: null, isModerated: false },
        include: {
          author: { select: { id: true, name: true, image: true, role: true } },
          editedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      votes: userId ? { where: { userId }, select: { id: true } } : false,
    },
  });

  if (!feature) return null;

  return {
    ...feature,
    userHasVoted: userId && Array.isArray(feature.votes) ? feature.votes.length > 0 : false,
    votes: undefined,
  };
}

export async function addComment(
  featureId: string,
  authorId: string,
  content: string,
  parentId?: string | null,
  isOfficial: boolean = false
) {
  return await prisma.$transaction(async (tx) => {
    const comment = await tx.roadmapComment.create({
      data: {
        featureId,
        authorId,
        content,
        parentId: parentId || null,
        isOfficial,
      },
      include: {
        author: { select: { id: true, name: true, image: true, role: true } },
      },
    });

    await tx.roadmapFeature.update({
      where: { id: featureId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  });
}

export async function editComment(commentId: string, userId: string, content: string, isSuperAdmin: boolean = false) {
  const comment = await prisma.roadmapComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Comentário não encontrado.");

  if (!isSuperAdmin && comment.authorId !== userId) {
    throw new Error("Você não tem permissão para editar este comentário.");
  }

  return await prisma.roadmapComment.update({
    where: { id: commentId },
    data: {
      content,
      editedAt: new Date(),
      editedById: userId,
    },
    include: {
      author: { select: { id: true, name: true, image: true, role: true } },
    },
  });
}

export async function deleteComment(commentId: string, userId: string, isSuperAdmin: boolean = false) {
  const comment = await prisma.roadmapComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Comentário não encontrado.");

  if (!isSuperAdmin && comment.authorId !== userId) {
    throw new Error("Você não tem permissão para excluir este comentário.");
  }

  await prisma.roadmapComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

export async function editTrainerSuggestion(
  featureId: string,
  userId: string,
  data: { title: string; description: string; categoryId?: string | null },
  isSuperAdmin: boolean = false
) {
  const feature = await prisma.roadmapFeature.findUnique({
    where: { id: featureId },
  });

  if (!feature) throw new Error("Sugestão não encontrada.");

  if (!isSuperAdmin) {
    if (feature.authorId !== userId) {
      throw new Error("Você não tem permissão para editar esta sugestão.");
    }
    if (feature.voteCount > 0) {
      throw new Error("Esta sugestão já recebeu votos da comunidade e não pode ser editada.");
    }
  }

  const updated = await prisma.roadmapFeature.update({
    where: { id: featureId },
    data: {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId || null,
      editedAt: new Date(),
      editedById: userId,
    },
  });

  return updated;
}

export async function deleteTrainerSuggestion(featureId: string, userId: string, isSuperAdmin: boolean = false) {
  const feature = await prisma.roadmapFeature.findUnique({
    where: { id: featureId },
  });

  if (!feature) throw new Error("Sugestão não encontrada.");

  if (!isSuperAdmin && feature.authorId !== userId) {
    throw new Error("Você não tem permissão para excluir esta sugestão.");
  }

  await prisma.roadmapFeature.update({
    where: { id: featureId },
    data: {
      deletedAt: new Date(),
      visibility: "ARCHIVED",
    },
  });

  return { success: true };
}

export async function getRecentInteractors(featureId?: string, pollId?: string) {
  if (featureId) {
    const votes = await prisma.roadmapVote.findMany({
      where: { featureId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    const comments = await prisma.roadmapComment.findMany({
      where: { featureId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    const combined = [
      ...votes.map((v) => ({ id: v.user.id, name: v.user.name, image: v.user.image, date: v.createdAt })),
      ...comments.map((c) => ({ id: c.author.id, name: c.author.name, image: c.author.image, date: c.createdAt })),
    ];

    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const uniqueMap = new Map();
    for (const item of combined) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, { id: item.id, name: item.name, image: item.image });
      }
      if (uniqueMap.size >= 3) break;
    }
    return Array.from(uniqueMap.values());
  }

  if (pollId) {
    const votes = await prisma.roadmapPollVote.findMany({
      where: { pollId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    const uniqueMap = new Map();
    for (const v of votes) {
      if (!uniqueMap.has(v.user.id)) {
        uniqueMap.set(v.user.id, { id: v.user.id, name: v.user.name, image: v.user.image });
      }
      if (uniqueMap.size >= 3) break;
    }
    return Array.from(uniqueMap.values());
  }

  return [];
}

export async function getClosedPollsHistory() {
  const closedPolls = await prisma.roadmapPoll.findMany({
    where: { status: "CLOSED" },
    include: {
      options: {
        orderBy: { voteCount: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return closedPolls.map((poll) => {
    const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
    const winner = poll.options[0] || null;
    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      totalVotes,
      winner: winner
        ? {
            title: winner.title,
            voteCount: winner.voteCount,
            percentage: totalVotes > 0 ? Math.round((winner.voteCount / totalVotes) * 100) : 0,
          }
        : null,
      closedAt: poll.updatedAt,
    };
  });
}

export async function getActivePoll(userId?: string) {
  await ensureRoadmapDefaults();

  let poll = await prisma.roadmapPoll.findFirst({
    include: {
      options: {
        orderBy: { position: "asc" },
      },
      votes: userId ? { where: { userId }, select: { optionId: true } } : false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!poll) return null;

  // Auto-close if deadline passed
  if (poll.endsAt && new Date(poll.endsAt) <= new Date()) {
    poll = await prisma.roadmapPoll.update({
      where: { id: poll.id },
      data: { status: "CLOSED" },
      include: {
        options: { orderBy: { position: "asc" } },
        votes: userId ? { where: { userId }, select: { optionId: true } } : false,
      },
    });
  }

  const totalVotes = poll.options.reduce((acc, opt) => acc + opt.voteCount, 0);
  const userVotedOptionId = userId && Array.isArray(poll.votes) && poll.votes.length > 0 ? poll.votes[0].optionId : null;

  const optionsWithPercentage = poll.options.map((opt) => ({
    ...opt,
    percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
    isUserChoice: userVotedOptionId === opt.id,
  }));

  // Winning option if closed or expired
  const sortedByVotes = [...optionsWithPercentage].sort((a, b) => b.voteCount - a.voteCount);
  const winner = poll.status === "CLOSED" && sortedByVotes.length > 0 ? sortedByVotes[0] : null;

  // Get 3 recent interactors (voters)
  const recentInteractors = await getRecentInteractors(undefined, poll.id);

  return {
    ...poll,
    totalVotes,
    userVotedOptionId,
    options: optionsWithPercentage,
    winner,
    recentInteractors,
    votes: undefined,
  };
}

export async function votePoll(pollId: string, optionId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const poll = await tx.roadmapPoll.findUnique({
      where: { id: pollId },
    });

    if (!poll || poll.status !== "ACTIVE") {
      throw new Error("Esta votação já está encerrada.");
    }

    const existingVote = await tx.roadmapPollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });

    if (existingVote) {
      if (existingVote.optionId === optionId) {
        return { success: true };
      }

      if (!poll.allowVoteChange) {
        throw new Error("Esta enquete não permite alterar o voto. Seu voto é definitivo.");
      }

      // Decrement old option
      await tx.roadmapPollOption.update({
        where: { id: existingVote.optionId },
        data: { voteCount: { decrement: 1 } },
      });

      // Increment new option
      await tx.roadmapPollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      });

      // Update vote record
      await tx.roadmapPollVote.update({
        where: { id: existingVote.id },
        data: { optionId },
      });

      return { success: true, changed: true };
    }

    // New vote
    await tx.roadmapPollVote.create({
      data: { pollId, optionId, userId },
    });

    await tx.roadmapPollOption.update({
      where: { id: optionId },
      data: { voteCount: { increment: 1 } },
    });

    return { success: true };
  });
}

export async function getMySuggestions(userId: string) {
  const created = await prisma.roadmapFeature.findMany({
    where: { authorId: userId, deletedAt: null },
    include: {
      status: { select: { name: true, color: true } },
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const votedRecords = await prisma.roadmapVote.findMany({
    where: { userId },
    include: {
      feature: {
        include: {
          status: { select: { name: true, color: true } },
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    created,
    voted: votedRecords.map((v: any) => v.feature).filter((f: any) => f && !f.deletedAt),
  };
}

// ==========================================
// SUPERADMIN SERVICES
// ==========================================

export async function superadminReorderFeature(featureId: string, targetStatusId: string, newRank: number, adminUserId: string) {
  const current = await prisma.roadmapFeature.findUnique({
    where: { id: featureId },
    include: { status: true },
  });

  if (!current) throw new Error("Funcionalidade não encontrada");

  const isStatusChange = current.statusId !== targetStatusId;

  const releasedStatus = await prisma.roadmapStatus.findFirst({ where: { slug: "released" } });
  const isNowReleased = releasedStatus && targetStatusId === releasedStatus.id;

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.roadmapFeature.update({
      where: { id: featureId },
      data: {
        statusId: targetStatusId,
        rank: newRank,
        releasedAt: isNowReleased && !current.releasedAt ? new Date() : current.releasedAt,
      },
    });

    await tx.roadmapAuditLog.create({
      data: {
        actorId: adminUserId,
        action: isStatusChange ? "STATUS_CHANGED" : "REORDERED",
        entity: "FEATURE",
        entityId: featureId,
        metadata: JSON.stringify({ fromStatusId: current.statusId, toStatusId: targetStatusId, newRank }),
      },
    });

    return item;
  });

  return updated;
}

export async function superadminMergeFeatures(primaryId: string, secondaryId: string, adminUserId: string) {
  if (primaryId === secondaryId) throw new Error("Não é possível mesclar uma funcionalidade com ela mesma.");

  return await prisma.$transaction(async (tx) => {
    const primary = await tx.roadmapFeature.findUnique({ where: { id: primaryId } });
    const secondary = await tx.roadmapFeature.findUnique({ where: { id: secondaryId } });

    if (!primary || !secondary) throw new Error("Funcionalidade primária ou secundária não encontrada.");

    // Move votes without duplicating
    const secondaryVotes = await tx.roadmapVote.findMany({ where: { featureId: secondaryId } });
    const primaryVotes = await tx.roadmapVote.findMany({ where: { featureId: primaryId } });
    const primaryVoterIds = new Set(primaryVotes.map((v) => v.userId));

    let transferredVotes = 0;
    for (const vote of secondaryVotes) {
      if (!primaryVoterIds.has(vote.userId)) {
        await tx.roadmapVote.create({
          data: { featureId: primaryId, userId: vote.userId, createdAt: vote.createdAt },
        });
        transferredVotes++;
      }
    }

    // Delete old votes on secondary
    await tx.roadmapVote.deleteMany({ where: { featureId: secondaryId } });

    // Move comments
    await tx.roadmapComment.updateMany({
      where: { featureId: secondaryId },
      data: { featureId: primaryId },
    });

    // Update secondary as merged
    await tx.roadmapFeature.update({
      where: { id: secondaryId },
      data: {
        mergedIntoId: primaryId,
        visibility: "ARCHIVED",
        deletedAt: new Date(),
      },
    });

    // Recalculate primary counts
    const finalVoteCount = await tx.roadmapVote.count({ where: { featureId: primaryId } });
    const finalCommentCount = await tx.roadmapComment.count({ where: { featureId: primaryId, deletedAt: null } });

    const updatedPrimary = await tx.roadmapFeature.update({
      where: { id: primaryId },
      data: {
        voteCount: finalVoteCount,
        commentCount: finalCommentCount,
      },
    });

    await tx.roadmapAuditLog.create({
      data: {
        actorId: adminUserId,
        action: "MERGED_FEATURES",
        entity: "FEATURE",
        entityId: primaryId,
        metadata: JSON.stringify({ primaryTitle: primary.title, secondaryId, secondaryTitle: secondary.title, transferredVotes }),
      },
    });

    return updatedPrimary;
  });
}

export async function getSuperadminMetrics() {
  await ensureRoadmapDefaults();

  const totalUsers = await prisma.user.count({ where: { role: "TRAINER" } });
  const uniqueVoters = await prisma.roadmapVote.groupBy({
    by: ["userId"],
  });
  const totalVotersCount = uniqueVoters.length;
  const voterPercentage = totalUsers > 0 ? Math.round((totalVotersCount / totalUsers) * 100) : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const votesLast30Days = await prisma.roadmapVote.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const totalFeatures = await prisma.roadmapFeature.count({ where: { deletedAt: null } });
  const communityFeatures = await prisma.roadmapFeature.count({ where: { source: "COMMUNITY", deletedAt: null } });
  const releasedFeatures = await prisma.roadmapFeature.findMany({
    where: { status: { slug: "released" }, deletedAt: null },
  });

  const releasedCommunityCount = releasedFeatures.filter((f: any) => f.source === "COMMUNITY").length;
  const communityProductRate = releasedFeatures.length > 0 ? Math.round((releasedCommunityCount / releasedFeatures.length) * 100) : 0;

  const auditLogs = await prisma.roadmapAuditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { name: true, image: true } },
    },
  });

  return {
    voterPercentage,
    totalVotersCount,
    votesLast30Days,
    totalFeatures,
    communityFeatures,
    communityProductRate,
    auditLogs,
  };
}

export async function superadminDuplicateFeature(featureId: string, adminUserId: string) {
  const original = await prisma.roadmapFeature.findUnique({
    where: { id: featureId },
  });

  if (!original) throw new Error("Funcionalidade original não encontrada");

  const baseTitle = `${original.title} (Cópia)`;
  let baseSlug = slugify(baseTitle);
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.roadmapFeature.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const lastFeature = await prisma.roadmapFeature.findFirst({
    where: { statusId: original.statusId, deletedAt: null },
    orderBy: { rank: "desc" },
    select: { rank: true },
  });

  const newRank = (lastFeature?.rank || 0) + 1000;

  const duplicated = await prisma.roadmapFeature.create({
    data: {
      title: baseTitle,
      slug,
      description: original.description,
      statusId: original.statusId,
      categoryId: original.categoryId,
      source: "ATLASFIT",
      priority: original.priority,
      featured: original.featured,
      isCommunityChoice: false,
      estimatedRelease: original.estimatedRelease,
      rank: newRank,
      authorId: adminUserId,
    },
    include: {
      author: { select: { id: true, name: true, image: true, role: true } },
      category: { select: { id: true, name: true, icon: true, slug: true } },
      status: { select: { id: true, name: true, slug: true, color: true } },
    },
  });

  await prisma.roadmapAuditLog.create({
    data: {
      actorId: adminUserId,
      action: "FEATURE_DUPLICATED",
      entity: "FEATURE",
      entityId: duplicated.id,
      metadata: JSON.stringify({ originalId: featureId, title: duplicated.title }),
    },
  });

  return duplicated;
}

export async function superadminMoveFeaturePosition(
  featureId: string,
  targetPosition: "TOP" | "BOTTOM",
  adminUserId: string
) {
  const current = await prisma.roadmapFeature.findUnique({
    where: { id: featureId },
  });

  if (!current) throw new Error("Funcionalidade não encontrada");

  let newRank: number;
  if (targetPosition === "TOP") {
    const topFeature = await prisma.roadmapFeature.findFirst({
      where: { statusId: current.statusId, deletedAt: null, id: { not: featureId } },
      orderBy: { rank: "asc" },
      select: { rank: true },
    });
    newRank = topFeature ? topFeature.rank - 1000 : 0;
  } else {
    const bottomFeature = await prisma.roadmapFeature.findFirst({
      where: { statusId: current.statusId, deletedAt: null, id: { not: featureId } },
      orderBy: { rank: "desc" },
      select: { rank: true },
    });
    newRank = bottomFeature ? bottomFeature.rank + 1000 : 1000;
  }

  const updated = await prisma.roadmapFeature.update({
    where: { id: featureId },
    data: { rank: newRank },
  });

  await prisma.roadmapAuditLog.create({
    data: {
      actorId: adminUserId,
      action: "REORDERED_POSITION",
      entity: "FEATURE",
      entityId: featureId,
      metadata: JSON.stringify({ targetPosition, newRank }),
    },
  });

  return updated;
}

export async function superadminCreateStatus(
  data: { name: string; color?: string; isPublic?: boolean },
  adminUserId: string
) {
  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.roadmapStatus.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const lastStatus = await prisma.roadmapStatus.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = (lastStatus?.position || 0) + 1;

  const status = await prisma.roadmapStatus.create({
    data: {
      name: data.name.trim(),
      slug,
      color: data.color || "#f59e0b",
      position,
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      isActive: true,
    },
  });

  await prisma.roadmapAuditLog.create({
    data: {
      actorId: adminUserId,
      action: "STATUS_CREATED",
      entity: "STATUS",
      entityId: status.id,
      metadata: JSON.stringify({ name: status.name, color: status.color, isPublic: status.isPublic }),
    },
  });

  return status;
}

export async function superadminUpdateStatus(
  statusId: string,
  data: { name?: string; color?: string; isPublic?: boolean; isActive?: boolean },
  adminUserId: string
) {
  const current = await prisma.roadmapStatus.findUnique({ where: { id: statusId } });
  if (!current) throw new Error("Coluna não encontrada");

  const updateData: any = {};
  if (data.name !== undefined && data.name.trim()) {
    updateData.name = data.name.trim();
  }
  if (data.color !== undefined) {
    updateData.color = data.color;
  }
  if (data.isPublic !== undefined) {
    updateData.isPublic = data.isPublic;
  }
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  const updated = await prisma.roadmapStatus.update({
    where: { id: statusId },
    data: updateData,
  });

  await prisma.roadmapAuditLog.create({
    data: {
      actorId: adminUserId,
      action: "STATUS_UPDATED",
      entity: "STATUS",
      entityId: statusId,
      metadata: JSON.stringify(updateData),
    },
  });

  return updated;
}

export async function superadminDeleteStatus(
  statusId: string,
  targetStatusIdForMigration: string | null,
  adminUserId: string
) {
  const current = await prisma.roadmapStatus.findUnique({
    where: { id: statusId },
    include: { features: { where: { deletedAt: null } } },
  });

  if (!current) throw new Error("Coluna não encontrada");

  const totalStatuses = await prisma.roadmapStatus.count({ where: { isActive: true } });
  if (totalStatuses <= 1) {
    throw new Error("Não é possível excluir a única coluna do quadro.");
  }

  const activeFeaturesCount = current.features.length;

  if (activeFeaturesCount > 0) {
    if (!targetStatusIdForMigration || targetStatusIdForMigration === statusId) {
      throw new Error("Selecione uma coluna de destino válida para transferir os cards existentes.");
    }

    const targetStatus = await prisma.roadmapStatus.findUnique({ where: { id: targetStatusIdForMigration } });
    if (!targetStatus) throw new Error("Coluna de destino para migração não encontrada.");
  }

  return await prisma.$transaction(async (tx) => {
    // Migrate features if any
    if (activeFeaturesCount > 0 && targetStatusIdForMigration) {
      await tx.roadmapFeature.updateMany({
        where: { statusId },
        data: { statusId: targetStatusIdForMigration },
      });
    }

    // Delete status
    await tx.roadmapStatus.delete({
      where: { id: statusId },
    });

    await tx.roadmapAuditLog.create({
      data: {
        actorId: adminUserId,
        action: "STATUS_DELETED",
        entity: "STATUS",
        entityId: statusId,
        metadata: JSON.stringify({
          deletedStatusName: current.name,
          migratedCardsCount: activeFeaturesCount,
          targetStatusId: targetStatusIdForMigration,
        }),
      },
    });

    return { success: true, migratedCardsCount: activeFeaturesCount };
  });
}

export async function superadminMoveAllCardsInStatus(
  fromStatusId: string,
  toStatusId: string,
  adminUserId: string
) {
  if (fromStatusId === toStatusId) {
    throw new Error("A coluna de origem e destino não podem ser iguais.");
  }

  const fromStatus = await prisma.roadmapStatus.findUnique({ where: { id: fromStatusId } });
  const toStatus = await prisma.roadmapStatus.findUnique({ where: { id: toStatusId } });

  if (!fromStatus || !toStatus) throw new Error("Colunas não encontradas.");

  const targetFeatures = await prisma.roadmapFeature.findMany({
    where: { statusId: toStatusId, deletedAt: null },
    orderBy: { rank: "desc" },
    select: { rank: true },
  });
  let baseRank = (targetFeatures[0]?.rank || 0) + 1000;

  const featuresToMove = await prisma.roadmapFeature.findMany({
    where: { statusId: fromStatusId, deletedAt: null },
    orderBy: { rank: "asc" },
  });

  const updatedCount = featuresToMove.length;

  await prisma.$transaction(async (tx) => {
    for (const feat of featuresToMove) {
      await tx.roadmapFeature.update({
        where: { id: feat.id },
        data: {
          statusId: toStatusId,
          rank: baseRank,
        },
      });
      baseRank += 1000;
    }

    await tx.roadmapAuditLog.create({
      data: {
        actorId: adminUserId,
        action: "BULK_MOVED_CARDS",
        entity: "STATUS",
        entityId: fromStatusId,
        metadata: JSON.stringify({ fromStatusId, toStatusId, movedCount: updatedCount }),
      },
    });
  });

  return { success: true, movedCount: updatedCount };
}

export async function superadminReorderStatus(
  statusId: string,
  direction: "LEFT" | "RIGHT",
  adminUserId: string
) {
  const allStatuses = await prisma.roadmapStatus.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });

  const currentIndex = allStatuses.findIndex((s) => s.id === statusId);
  if (currentIndex === -1) throw new Error("Coluna não encontrada.");

  const targetIndex = direction === "LEFT" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= allStatuses.length) {
    return allStatuses; // Already at edge
  }

  const currentStatus = allStatuses[currentIndex];
  const targetStatus = allStatuses[targetIndex];

  await prisma.$transaction([
    prisma.roadmapStatus.update({
      where: { id: currentStatus.id },
      data: { position: targetStatus.position },
    }),
    prisma.roadmapStatus.update({
      where: { id: targetStatus.id },
      data: { position: currentStatus.position },
    }),
    prisma.roadmapAuditLog.create({
      data: {
        actorId: adminUserId,
        action: "STATUS_REORDERED",
        entity: "STATUS",
        entityId: statusId,
        metadata: JSON.stringify({ direction, newPosition: targetStatus.position }),
      },
    }),
  ]);

  return await prisma.roadmapStatus.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });
}


