import { sourceTextContent } from "./source-payload";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import prisma from "@/lib/prisma";
import { publishToChannel } from "@/lib/ably";
import { GeminiMigrationExtractor } from "../gemini/extractor";
import { parseCsvContent } from "./parsers/csv.parser";
import { parseXlsxBuffer, spreadsheetToStructuredText } from "./parsers/spreadsheet.parser";
import { mapColumnHeaders } from "./column-alias";
import {
  normalizePhone,
  normalizeEmail,
  normalizeDate,
  normalizeNumber,
} from "./normalization/normalization.service";
import { checkStudentDuplicate } from "./matching/duplicate.service";
import { loadPublicExerciseCatalog } from "./matching/exercise-catalog-matches";
import { matchExerciseBatch, type ExerciseCandidate } from "./matching/exercise-similarity";
import { NotificationService } from "@/lib/notifications/service";
import { EmailService } from "@/lib/emails/service";
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from "@/lib/notifications/types";
import { calculateBatchCreditCost } from "./config/credits";
import { checkImportQuota, deductImportCredits } from "./quota.service";
import { publishImportCreditBalance } from "./credit-realtime.service";
import { parseDayOfWeekToInt } from "./utils/day-of-week";

const SOURCE_TYPE_ORDER: Record<string, number> = {
  SPREADSHEET: 1,
  TEXT: 2,
  PDF: 3,
  IMAGE: 4,
  MIXED: 5,
};

export async function processImportJob(jobId: string, workspaceId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId, workspaceId },
  });

  if (!job) throw new Error("Job de migração não encontrado.");

  // Permite claim de UPLOADED, FAILED ou PARTIAL (ao continuar processamento pausado)
  const claimed = await prisma.importJob.updateMany({
    where: { id: jobId, workspaceId, status: { in: ["UPLOADED", "FAILED", "PARTIAL"] } },
    data: {
      status: "PROCESSING",
      processingStep: "PARSING",
      pauseReason: null,
      pausedAt: null,
      errorCode: null,
      safeErrorMessage: null,
    },
  });

  if (!claimed.count) {
    const current = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (current?.status === "PROCESSING") {
      return current;
    }
    throw new WorkspaceAccessError(409, "INVALID_STATUS", "Importação já iniciada ou encerrada.");
  }

  // Carrega contagens já existentes (para o caso de retomar um job parcial)
  let totalStudentsCount = await prisma.importRecord.count({ where: { importJobId: jobId, entityType: "STUDENT" } });
  let totalWorkoutsCount = await prisma.importRecord.count({ where: { importJobId: jobId, entityType: "WORKOUT" } });
  let totalExercisesCount = job.totalExercises ?? 0;
  let totalAssessmentsCount = await prisma.importRecord.count({ where: { importJobId: jobId, entityType: "ASSESSMENT" } });
  let totalMeasurementsCount = await prisma.importRecord.count({ where: { importJobId: jobId, entityType: "MEASUREMENT" } });
  let creditsConsumedTotal = job.creditsConsumed ?? 0;
  let exerciseCatalog: ExerciseCandidate[] | undefined;

  await publishToChannel(`migration:${workspaceId}`, "job_updated", {
    jobId,
    status: "PROCESSING",
    processingStep: "PARSING",
    progressPercentage: 15,
    estimatedSecondsRemaining: 35,
    progressMessage: "Lendo arquivos e fontes de dados...",
    totalStudents: totalStudentsCount,
    totalWorkouts: totalWorkoutsCount,
    creditsConsumed: creditsConsumedTotal,
  });

  try {
    const extractor = new GeminiMigrationExtractor();

    // Busca todas as fontes e ordena por menor custo de tokens: SPREADSHEET -> TEXT -> PDF -> IMAGE
    const allSources = await prisma.importSource.findMany({
      where: { importJobId: jobId },
      select: { id: true, type: true, status: true, sortOrder: true },
    });

    const sortedSources = [...allSources].sort((a, b) => {
      const pA = SOURCE_TYPE_ORDER[a.type] ?? 99;
      const pB = SOURCE_TYPE_ORDER[b.type] ?? 99;
      if (pA !== pB) return pA - pB;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    });

    const totalSourcesCount = sortedSources.length;
    let processedSourcesCount = sortedSources.filter(
      (s) => s.status === "EXTRACTED" || s.status === "PARSED"
    ).length;

    // Filtra apenas as fontes ainda pendentes de extração
    const pendingSources = sortedSources.filter(
      (s) => s.status === "PENDING" || s.status === "FAILED"
    );

    for (const reference of pendingSources) {
      // 1. Checa se o usuário solicitou pausa manual
      const checkPause = await prisma.importJob.findUnique({
        where: { id: jobId },
        select: { status: true, pauseReason: true },
      });

      if (checkPause?.status === "PARTIAL" || checkPause?.pauseReason === "MANUAL_PAUSE") {
        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            status: "PARTIAL",
            processingStep: "IDLE",
            pauseReason: "MANUAL_PAUSE",
            pausedAt: new Date(),
            totalStudents: totalStudentsCount,
            totalWorkouts: totalWorkoutsCount,
            totalExercises: totalExercisesCount,
            totalAssessments: totalAssessmentsCount,
            totalMeasurements: totalMeasurementsCount,
            creditsConsumed: creditsConsumedTotal,
          },
        });

        await publishToChannel(`migration:${workspaceId}`, "job_updated", {
          jobId,
          status: "PARTIAL",
          processingStep: "IDLE",
          pauseReason: "MANUAL_PAUSE",
          progressPercentage: Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100),
          progressMessage: "Importação pausada manualmente pelo usuário.",
          totalStudents: totalStudentsCount,
          totalWorkouts: totalWorkoutsCount,
          creditsConsumed: creditsConsumedTotal,
        });

        return await prisma.importJob.findUnique({ where: { id: jobId } });
      }

      const stored = await prisma.importSource.findUniqueOrThrow({ where: { id: reference.id, importJobId: jobId } });
      const source = { ...stored, textContent: await sourceTextContent(stored, workspaceId, jobId) };

      // 2. Extração Determinística de Planilhas (CSV/XLSX)
      if (source.type === "SPREADSHEET" || source.type === "MIXED") {
        if (source.textContent) {
          if (source.textContent.startsWith("BASE64_XLSX:")) {
            const base64Data = source.textContent.substring("BASE64_XLSX:".length);
            const buffer = Buffer.from(base64Data, "base64");
            const sheets = await parseXlsxBuffer(buffer, source.originalName ?? "planilha.xlsx");

            if (sheets.length > 0) {
              const sheet = sheets[0];
              const { mapped, unrecognized } = mapColumnHeaders(sheet.headers);

              if (unrecognized.length === 0 && sheet.rows.length > 0) {
                // Cobrança base por entidade (sem tokens de IA)
                const cost = calculateBatchCreditCost({ students: sheet.rows.length }, 0).totalCredits;

                if (job.createdByUserId && cost > 0) {
                  const deduct = await deductImportCredits(workspaceId, job.createdByUserId, cost);
                  if (!deduct.success) {
                    await handleCreditsExhausted({
                      jobId,
                      workspaceId,
                      userId: job.createdByUserId,
                      totalStudentsCount,
                      totalWorkoutsCount,
                      totalExercisesCount,
                      totalAssessmentsCount,
                      totalMeasurementsCount,
                      creditsConsumedTotal,
                      progressPercentage: Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100),
                    });
                    return await prisma.importJob.findUnique({ where: { id: jobId } });
                  }
                  creditsConsumedTotal += cost;
                  await prisma.importJob.update({
                    where: { id: jobId },
                    data: { creditsConsumed: creditsConsumedTotal },
                  });
                  await publishImportCreditBalance(workspaceId, job.createdByUserId);
                  await publishToChannel(`migration:${workspaceId}`, "job_updated", {
                    jobId, status: "PROCESSING", processingStep: "PARSING",
                    creditsConsumed: creditsConsumedTotal,
                    progressMessage: "Organizando os alunos da planilha...",
                  });
                }

                await processDeterministicRows(
                  jobId,
                  workspaceId,
                  sheet.rows,
                  mapped,
                  source.id
                );
                totalStudentsCount += sheet.rows.length;
                processedSourcesCount++;

                await prisma.importSource.update({
                  where: { id: source.id },
                  data: { status: "EXTRACTED" },
                });

                await publishToChannel(`migration:${workspaceId}`, "job_updated", {
                  jobId,
                  status: "PROCESSING",
                  processingStep: "PARSING",
                  progressPercentage: Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100),
                  progressMessage: `Planilha processada com sucesso (+${sheet.rows.length} alunos).`,
                  totalStudents: totalStudentsCount,
                  totalWorkouts: totalWorkoutsCount,
                  creditsConsumed: creditsConsumedTotal,
                });

                continue;
              }
            }
          } else if (!source.textContent.startsWith("BASE64_FILE:")) {
            const parsedCsv = parseCsvContent(source.textContent);
            const { mapped, unrecognized } = mapColumnHeaders(parsedCsv.headers);

            if (unrecognized.length === 0 && parsedCsv.rows.length > 0) {
              const cost = calculateBatchCreditCost({ students: parsedCsv.rows.length }, 0).totalCredits;

              if (job.createdByUserId && cost > 0) {
                const deduct = await deductImportCredits(workspaceId, job.createdByUserId, cost);
                if (!deduct.success) {
                  await handleCreditsExhausted({
                    jobId,
                    workspaceId,
                    userId: job.createdByUserId,
                    totalStudentsCount,
                    totalWorkoutsCount,
                    totalExercisesCount,
                    totalAssessmentsCount,
                    totalMeasurementsCount,
                    creditsConsumedTotal,
                    progressPercentage: Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100),
                  });
                  return await prisma.importJob.findUnique({ where: { id: jobId } });
                }
                creditsConsumedTotal += cost;
                await prisma.importJob.update({
                  where: { id: jobId },
                  data: { creditsConsumed: creditsConsumedTotal },
                });
                await publishImportCreditBalance(workspaceId, job.createdByUserId);
                await publishToChannel(`migration:${workspaceId}`, "job_updated", {
                  jobId, status: "PROCESSING", processingStep: "PARSING",
                  creditsConsumed: creditsConsumedTotal,
                  progressMessage: "Organizando os alunos da planilha...",
                });
              }

              await processDeterministicRows(
                jobId,
                workspaceId,
                parsedCsv.rows,
                mapped,
                source.id
              );
              totalStudentsCount += parsedCsv.rows.length;
              processedSourcesCount++;

              await prisma.importSource.update({
                where: { id: source.id },
                data: { status: "EXTRACTED" },
              });

              await publishToChannel(`migration:${workspaceId}`, "job_updated", {
                jobId,
                status: "PROCESSING",
                processingStep: "PARSING",
                progressPercentage: Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100),
                progressMessage: `CSV processado com sucesso (+${parsedCsv.rows.length} alunos).`,
                totalStudents: totalStudentsCount,
                totalWorkouts: totalWorkoutsCount,
                creditsConsumed: creditsConsumedTotal,
              });

              continue;
            }
          }
        }
      }

      // 3. Extração por IA (PDFs, Imagens, Texto Livre ou Planilhas Ambíguas)
      // Checagem prévia de saldo disponível
      if (job.createdByUserId) {
        const balance = await checkImportQuota(workspaceId, job.createdByUserId);
        if (balance.totalAvailable <= 0) {
          await handleCreditsExhausted({
            jobId,
            workspaceId,
            userId: job.createdByUserId,
            totalStudentsCount,
            totalWorkoutsCount,
            totalExercisesCount,
            totalAssessmentsCount,
            totalMeasurementsCount,
            creditsConsumedTotal,
            progressPercentage: Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100),
          });
          return await prisma.importJob.findUnique({ where: { id: jobId } });
        }
      }

      await prisma.importJob.update({
        where: { id: jobId },
        data: { processingStep: "EXTRACTING" },
      });

      const currentProgress = Math.min(85, Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100) + 10);
      await publishToChannel(`migration:${workspaceId}`, "job_updated", {
        jobId,
        status: "PROCESSING",
        processingStep: "EXTRACTING",
        progressPercentage: currentProgress,
        estimatedSecondsRemaining: 25,
        progressMessage: `Analisando ${source.type.toLowerCase()} com IA (${source.originalName || "documento"})...`,
        totalStudents: totalStudentsCount,
        totalWorkouts: totalWorkoutsCount,
        creditsConsumed: creditsConsumedTotal,
      });

      let textContentForAi: string | undefined = undefined;
      let inlineFilesForAi: Array<{ mimeType: string; dataBase64: string }> | undefined = undefined;

      if (source.textContent) {
        if (source.textContent.startsWith("BASE64_FILE:")) {
          const prefixLen = "BASE64_FILE:".length;
          const nextColon = source.textContent.indexOf(":", prefixLen);
          if (nextColon > prefixLen) {
            const mimeType = source.textContent.substring(prefixLen, nextColon);
            const dataBase64 = source.textContent.substring(nextColon + 1);
            inlineFilesForAi = [{ mimeType, dataBase64 }];
          }
        } else if (source.textContent.startsWith("BASE64_XLSX:")) {
          const base64Data = source.textContent.substring("BASE64_XLSX:".length);
          const buffer = Buffer.from(base64Data, "base64");
          try {
            const sheets = await parseXlsxBuffer(buffer, source.originalName ?? "planilha.xlsx");
            const structuredText = spreadsheetToStructuredText(sheets);
            if (structuredText.trim()) {
              textContentForAi = structuredText;
            } else {
              inlineFilesForAi = [{
                mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                dataBase64: base64Data,
              }];
            }
          } catch {
            inlineFilesForAi = [{
              mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              dataBase64: base64Data,
            }];
          }
        } else {
          textContentForAi = source.textContent;
        }
      }

      let aiResult: any;
      try {
        try {
          aiResult = await extractor.extract({
            importJobId: jobId,
            userId: job.createdByUserId,
            textContent: textContentForAi,
            inlineFiles: inlineFilesForAi,
            useFallbackModel: false,
            purpose: "extraction",
          });
        } catch (firstErr) {
          aiResult = await extractor.extract({
            importJobId: jobId,
            userId: job.createdByUserId,
            textContent: textContentForAi,
            inlineFiles: inlineFilesForAi,
            useFallbackModel: true,
            purpose: "fragment_fallback",
          });
        }
      } catch (extractErr) {
        throw extractErr;
      }

      // Calcula os créditos consumidos com base nas entidades extraídas + tokens reais
      let studentsInBatch = aiResult?.students?.length ?? 0;
      let workoutsInBatch = 0;
      let assessmentsInBatch = 0;
      let measurementsInBatch = 0;

      if (aiResult?.students) {
        for (const st of aiResult.students) {
          workoutsInBatch += st.workouts?.length ?? 0;
          assessmentsInBatch += st.assessments?.length ?? 0;
          measurementsInBatch += st.measurements?.length ?? 0;
        }
      }

      const totalTokens = aiResult?._usage?.totalTokens ?? 0;
      const batchCost = calculateBatchCreditCost(
        {
          students: studentsInBatch,
          workouts: workoutsInBatch,
          assessments: assessmentsInBatch,
          measurements: measurementsInBatch,
        },
        totalTokens
      ).totalCredits;

      if (job.createdByUserId && batchCost > 0) {
        const deduct = await deductImportCredits(workspaceId, job.createdByUserId, batchCost);
        if (!deduct.success) {
          // Créditos insuficientes para registrar este lote extraído!
          await handleCreditsExhausted({
            jobId,
            workspaceId,
            userId: job.createdByUserId,
            totalStudentsCount,
            totalWorkoutsCount,
            totalExercisesCount,
            totalAssessmentsCount,
            totalMeasurementsCount,
            creditsConsumedTotal,
            progressPercentage: Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100),
          });
          return await prisma.importJob.findUnique({ where: { id: jobId } });
        }

        creditsConsumedTotal += batchCost;
        await prisma.importJob.update({
          where: { id: jobId },
          data: { creditsConsumed: creditsConsumedTotal },
        });
        await publishImportCreditBalance(workspaceId, job.createdByUserId);
      }

      // Normalization & Matching Step
      await prisma.importJob.update({
        where: { id: jobId },
        data: { processingStep: "NORMALIZING" },
      });
      await publishToChannel(`migration:${workspaceId}`, "job_updated", {
        jobId, status: "PROCESSING", processingStep: "NORMALIZING",
        progressPercentage: Math.min(95, Math.round(((processedSourcesCount + 0.7) / Math.max(1, totalSourcesCount)) * 100)),
        creditsConsumed: creditsConsumedTotal,
        progressMessage: "Organizando dados e vinculando exercícios...",
      });

      if (aiResult && aiResult.students) {
        for (let sIdx = 0; sIdx < aiResult.students.length; sIdx++) {
          const rawStudent = aiResult.students[sIdx];
          const tempStudentId = rawStudent.temporaryId ? `${rawStudent.temporaryId}_s${sIdx + 1}` : `temp_student_${sIdx + 1}`;

          const normPhone = normalizePhone(rawStudent.phone);
          const normEmail = normalizeEmail(rawStudent.email);
          const normBirthDate = normalizeDate(rawStudent.birthDate);

          const normalizedStudent = {
            name: rawStudent.name ? rawStudent.name.trim() : null,
            email: normEmail.normalizedValue,
            phone: normPhone.normalizedValue,
            cpfCnpj: rawStudent.cpfCnpj?.replace(/\D/g, "") || null,
            birthDate: normBirthDate.normalizedValue,
            objective: rawStudent.objective ?? null,
            weight: normalizeNumber(rawStudent.weight).normalizedValue,
            height: normalizeNumber(rawStudent.height).normalizedValue,
            gender: rawStudent.gender ?? null,
            notes: rawStudent.notes || [],
          };

          const hasWorkouts = Array.isArray(rawStudent.workouts) && rawStudent.workouts.length > 0;
          const hasAssessments = Array.isArray(rawStudent.assessments) && rawStudent.assessments.length > 0;
          const hasMeasurements = Array.isArray(rawStudent.measurements) && rawStudent.measurements.length > 0;

          if (!normalizedStudent.name && !normalizedStudent.email && !normalizedStudent.phone && !hasWorkouts && !hasAssessments && !hasMeasurements) {
            continue;
          }

          const dupCheck = await checkStudentDuplicate(workspaceId, {
            name: normalizedStudent.name,
            email: normalizedStudent.email,
            phone: normalizedStudent.phone,
            birthDate: normalizedStudent.birthDate,
          });

          const needsReview =
            !normalizedStudent.name ||
            dupCheck.level !== "NO_MATCH" ||
            (rawStudent.confidence && rawStudent.confidence < 0.8);

          await prisma.importRecord.create({
            data: {
              importJobId: jobId,
              entityType: "STUDENT",
              temporaryEntityId: tempStudentId,
              sourceData: rawStudent,
              normalizedData: normalizedStudent,
              status: needsReview ? "VALIDATED" : "READY",
              reviewStatus: needsReview ? "PENDING" : "NOT_REQUIRED",
              source: "AI_EXTRACTED",
              confidence: rawStudent.confidence ?? 0.9,
              deduplicationMatch: dupCheck.level,
              matchedEntityId: dupCheck.existingStudentId,
              evidence: { sourceId: source.id },
            },
          });

          totalStudentsCount++;

          if (rawStudent.workouts) {
            for (let wIdx = 0; wIdx < rawStudent.workouts.length; wIdx++) {
              const rawWorkout = rawStudent.workouts[wIdx];
              const tempWorkoutId = rawWorkout.temporaryId ? `${rawWorkout.temporaryId}_s${sIdx + 1}_w${wIdx + 1}` : `temp_workout_${sIdx + 1}_${wIdx + 1}`;

              const exercisesWithMatches = [];
              if (rawWorkout.exercises) {
                exerciseCatalog ??= await loadPublicExerciseCatalog();
                const matches = matchExerciseBatch(rawWorkout.exercises.map((exercise: { name?: string | null }) => exercise.name || ""), exerciseCatalog);
                for (const [exerciseIndex, rawEx] of rawWorkout.exercises.entries()) {
                  totalExercisesCount++;
                  const matchedEx = matches[exerciseIndex];
                  const isPc = rawEx.isBodyweight === true || String(rawEx.load || "").toLowerCase().includes("p.c");
                  const setsCount = rawEx.sets || 3;
                  const methodType = ["DROPSET", "REST_PAUSE", "BISET", "TRISET", "CIRCUIT"].includes(rawEx.methodType)
                    ? rawEx.methodType
                    : "NONE";
                  const methodConfig = methodType === "DROPSET"
                    ? { drops: rawEx.drops ?? 2, reduction: rawEx.reduction ?? 20 }
                    : methodType === "REST_PAUSE"
                    ? { pause: rawEx.restPauseSeconds ?? 15, rounds: rawEx.restPauseRounds ?? 3 }
                    : rawEx.methodConfig || {};

                  const individualSets = Array.isArray(rawEx.individualSets) && rawEx.individualSets.length > 0
                    ? rawEx.individualSets.map((s: any) => ({
                        reps: s.reps ? String(s.reps) : String(rawEx.reps || "10"),
                        load: isPc ? "p.c." : (s.load ? String(s.load) : (rawEx.load != null ? String(rawEx.load) : "")),
                        rest: s.rest || (rawEx.restSeconds ? `${rawEx.restSeconds}s` : "01:00"),
                      }))
                    : Array.from({ length: setsCount }, () => ({
                        reps: String(rawEx.reps || "10"),
                        load: isPc ? "p.c." : (rawEx.load != null ? String(rawEx.load) : ""),
                        rest: rawEx.restSeconds ? `${rawEx.restSeconds}s` : "01:00",
                      }));

                  exercisesWithMatches.push({
                    ...rawEx,
                    sets: setsCount,
                    reps: rawEx.reps || "10-12",
                    load: isPc ? "p.c." : (rawEx.load != null ? String(rawEx.load) : ""),
                    restSeconds: rawEx.restSeconds || 60,
                    rest: rawEx.restSeconds ? `${rawEx.restSeconds}s` : "01:00",
                    isBodyweight: isPc,
                    methodType,
                    methodConfig,
                    isIndividual: Boolean(Array.isArray(rawEx.individualSets) && rawEx.individualSets.length > 0),
                    individualSets,
                    matchedExerciseId: matchedEx?.exerciseId ?? null,
                    matchedExerciseName: matchedEx?.exerciseName ?? null,
                  });
                }
              }

              const normalizedWorkout = {
                temporaryStudentId: tempStudentId,
                targetStudentIds: [tempStudentId],
                saveToLibrary: false,
                name: rawWorkout.name || `Treino ${wIdx + 1}`,
                goal: rawWorkout.goal || "Hipertrofia",
                difficulty: rawWorkout.difficulty || "Intermediário",
                duration: rawWorkout.duration || "60 min",
                dayOfWeek: rawWorkout.dayOfWeek ?? null,
                muscleGroupLabel: rawWorkout.muscleGroupLabel ?? null,
                restBetweenExercises: rawWorkout.restBetweenExercises || "2 min",
                exercises: exercisesWithMatches,
              };

              const workoutNeedsReview =
                normalizedWorkout.dayOfWeek === null ||
                normalizedWorkout.dayOfWeek === undefined ||
                parseDayOfWeekToInt(normalizedWorkout.dayOfWeek) === null ||
                exercisesWithMatches.length === 0 ||
                exercisesWithMatches.some((ex: any) => !String(ex.name || "").trim());

              await prisma.importRecord.create({
                data: {
                  importJobId: jobId,
                  entityType: "WORKOUT",
                  temporaryEntityId: tempWorkoutId,
                  sourceData: rawWorkout,
                  normalizedData: normalizedWorkout,
                  status: "READY",
                  reviewStatus: workoutNeedsReview ? "PENDING" : "NOT_REQUIRED",
                  source: "AI_EXTRACTED",
                  confidence: workoutNeedsReview ? 0.7 : 0.9,
                  evidence: { sourceId: source.id },
                },
              });

              totalWorkoutsCount++;
            }
          }

          if (rawStudent.assessments) {
            for (let aIdx = 0; aIdx < rawStudent.assessments.length; aIdx++) {
              const rawAss = rawStudent.assessments[aIdx];
              const tempAssId = rawAss.temporaryId ? `${rawAss.temporaryId}_s${sIdx + 1}_a${aIdx + 1}` : `temp_ass_${sIdx + 1}_${aIdx + 1}`;

              const normalizedAssessment = {
                temporaryStudentId: tempStudentId,
                date: normalizeDate(rawAss.date).normalizedValue,
                type: rawAss.type || "Dobra Cutânea",
                weight: normalizeNumber(rawAss.weight).normalizedValue,
                height: normalizeNumber(rawAss.height).normalizedValue,
                bodyFat: normalizeNumber(rawAss.bodyFat).normalizedValue,
                muscleMass: normalizeNumber(rawAss.muscleMass).normalizedValue,
                notes: rawAss.notes ?? null,
              };

              await prisma.importRecord.create({
                data: {
                  importJobId: jobId,
                  entityType: "ASSESSMENT",
                  temporaryEntityId: tempAssId,
                  sourceData: rawAss,
                  normalizedData: normalizedAssessment,
                  status: "READY",
                  reviewStatus: "NOT_REQUIRED",
                  source: "AI_EXTRACTED",
                  confidence: 0.9,
                  evidence: { sourceId: source.id },
                },
              });

              totalAssessmentsCount++;
            }
          }

          if (rawStudent.measurements) {
            for (let mIdx = 0; mIdx < rawStudent.measurements.length; mIdx++) {
              const rawMeas = rawStudent.measurements[mIdx];
              const tempMeasId = rawMeas.temporaryId ? `${rawMeas.temporaryId}_s${sIdx + 1}_m${mIdx + 1}` : `temp_meas_${sIdx + 1}_${mIdx + 1}`;

              const normalizedMeasurement = {
                temporaryStudentId: tempStudentId,
                date: normalizeDate(rawMeas.date).normalizedValue,
                weight: normalizeNumber(rawMeas.weight).normalizedValue,
                height: normalizeNumber(rawMeas.height).normalizedValue,
                bodyFat: normalizeNumber(rawMeas.bodyFat).normalizedValue,
                muscleMass: normalizeNumber(rawMeas.muscleMass).normalizedValue,
                chest: normalizeNumber(rawMeas.chest).normalizedValue,
                waist: normalizeNumber(rawMeas.waist).normalizedValue,
                abdomen: normalizeNumber(rawMeas.abdomen).normalizedValue,
                hips: normalizeNumber(rawMeas.hips).normalizedValue,
                rightArm: normalizeNumber(rawMeas.rightArm).normalizedValue,
                leftArm: normalizeNumber(rawMeas.leftArm).normalizedValue,
                rightThigh: normalizeNumber(rawMeas.rightThigh).normalizedValue,
                leftThigh: normalizeNumber(rawMeas.leftThigh).normalizedValue,
                rightCalf: normalizeNumber(rawMeas.rightCalf).normalizedValue,
                leftCalf: normalizeNumber(rawMeas.leftCalf).normalizedValue,
                notes: rawMeas.notes ?? null,
              };

              await prisma.importRecord.create({
                data: {
                  importJobId: jobId,
                  entityType: "MEASUREMENT",
                  temporaryEntityId: tempMeasId,
                  sourceData: rawMeas,
                  normalizedData: normalizedMeasurement,
                  status: "READY",
                  reviewStatus: "NOT_REQUIRED",
                  source: "AI_EXTRACTED",
                  confidence: 0.9,
                  evidence: { sourceId: source.id },
                },
              });

              totalMeasurementsCount++;
            }
          }
        }
      }

      if (aiResult && aiResult.unassignedWorkouts && Array.isArray(aiResult.unassignedWorkouts)) {
        for (let uIdx = 0; uIdx < aiResult.unassignedWorkouts.length; uIdx++) {
          const rawWorkout = aiResult.unassignedWorkouts[uIdx];
          const tempWorkoutId = rawWorkout.temporaryId ? `${rawWorkout.temporaryId}_u${uIdx + 1}` : `temp_unassigned_workout_${uIdx + 1}`;

          const exercisesWithMatches = [];
          if (rawWorkout.exercises) {
            exerciseCatalog ??= await loadPublicExerciseCatalog();
            const matches = matchExerciseBatch(rawWorkout.exercises.map((exercise: { name?: string | null }) => exercise.name || ""), exerciseCatalog);
            for (const [exerciseIndex, rawEx] of rawWorkout.exercises.entries()) {
              totalExercisesCount++;
              const matchedEx = matches[exerciseIndex];
              const isPc = rawEx.isBodyweight === true || String(rawEx.load || "").toLowerCase().includes("p.c");
              const setsCount = rawEx.sets || 3;
              const methodType = ["DROPSET", "REST_PAUSE", "BISET", "TRISET", "CIRCUIT"].includes(rawEx.methodType)
                ? rawEx.methodType
                : "NONE";
              const methodConfig = methodType === "DROPSET"
                ? { drops: rawEx.drops ?? 2, reduction: rawEx.reduction ?? 20 }
                : methodType === "REST_PAUSE"
                ? { pause: rawEx.restPauseSeconds ?? 15, rounds: rawEx.restPauseRounds ?? 3 }
                : rawEx.methodConfig || {};

              const individualSets = Array.isArray(rawEx.individualSets) && rawEx.individualSets.length > 0
                ? rawEx.individualSets.map((s: any) => ({
                    reps: s.reps ? String(s.reps) : String(rawEx.reps || "10"),
                    load: isPc ? "p.c." : (s.load ? String(s.load) : (rawEx.load != null ? String(rawEx.load) : "")),
                    rest: s.rest || (rawEx.restSeconds ? `${rawEx.restSeconds}s` : "01:00"),
                  }))
                : Array.from({ length: setsCount }, () => ({
                    reps: String(rawEx.reps || "10"),
                    load: isPc ? "p.c." : (rawEx.load != null ? String(rawEx.load) : ""),
                    rest: rawEx.restSeconds ? `${rawEx.restSeconds}s` : "01:00",
                  }));

              exercisesWithMatches.push({
                ...rawEx,
                sets: setsCount,
                reps: rawEx.reps || "10-12",
                load: isPc ? "p.c." : (rawEx.load != null ? String(rawEx.load) : ""),
                restSeconds: rawEx.restSeconds || 60,
                rest: rawEx.restSeconds ? `${rawEx.restSeconds}s` : "01:00",
                isBodyweight: isPc,
                methodType,
                methodConfig,
                isIndividual: Boolean(Array.isArray(rawEx.individualSets) && rawEx.individualSets.length > 0),
                individualSets,
                matchedExerciseId: matchedEx?.exerciseId ?? null,
                matchedExerciseName: matchedEx?.exerciseName ?? null,
              });
            }
          }

          const normalizedWorkout = {
            temporaryStudentId: null,
            targetStudentIds: [],
            saveToLibrary: true,
            name: rawWorkout.name || `Treino Modelo ${uIdx + 1}`,
            goal: rawWorkout.goal || "Hipertrofia",
            difficulty: rawWorkout.difficulty || "Intermediário",
            duration: rawWorkout.duration || "60 min",
            dayOfWeek: rawWorkout.dayOfWeek ?? null,
            muscleGroupLabel: rawWorkout.muscleGroupLabel ?? null,
            restBetweenExercises: rawWorkout.restBetweenExercises || "2 min",
            exercises: exercisesWithMatches,
          };

          const workoutNeedsReview =
            normalizedWorkout.dayOfWeek === null ||
            normalizedWorkout.dayOfWeek === undefined ||
            parseDayOfWeekToInt(normalizedWorkout.dayOfWeek) === null ||
            exercisesWithMatches.length === 0 ||
            exercisesWithMatches.some((ex: any) => !String(ex.name || "").trim());

          await prisma.importRecord.create({
            data: {
              importJobId: jobId,
              entityType: "WORKOUT",
              temporaryEntityId: tempWorkoutId,
              sourceData: rawWorkout,
              normalizedData: normalizedWorkout,
              status: "READY",
              reviewStatus: workoutNeedsReview ? "PENDING" : "NOT_REQUIRED",
              source: "AI_EXTRACTED",
              confidence: workoutNeedsReview ? 0.7 : 0.9,
              evidence: { sourceId: source.id },
            },
          });

          totalWorkoutsCount++;
        }
      }

      await prisma.importSource.update({
        where: { id: source.id },
        data: { status: "EXTRACTED" },
      });

      processedSourcesCount++;

      await publishToChannel(`migration:${workspaceId}`, "job_updated", {
        jobId,
        status: "PROCESSING",
        processingStep: "NORMALIZING",
        progressPercentage: Math.round((processedSourcesCount / Math.max(1, totalSourcesCount)) * 100),
        estimatedSecondsRemaining: Math.max(5, (totalSourcesCount - processedSourcesCount) * 8),
        progressMessage: `${source.type} processado com sucesso.`,
        totalStudents: totalStudentsCount,
        totalWorkouts: totalWorkoutsCount,
        creditsConsumed: creditsConsumedTotal,
      });
    }

    // 4. Conclusão do processamento de todas as fontes
    const pendingRemaining = await prisma.importSource.count({
      where: { importJobId: jobId, status: { notIn: ["EXTRACTED", "PARSED"] } },
    });

    if (pendingRemaining > 0) {
      return await prisma.importJob.findUnique({ where: { id: jobId } });
    }

    const uncommittedRecordsCount = await prisma.importRecord.count({
      where: { importJobId: jobId, status: { notIn: ["COMMITTED", "SKIPPED"] } },
    });

    const nextStatus = uncommittedRecordsCount > 0 ? "REVIEW" : "COMPLETED";

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: nextStatus,
        processingStep: nextStatus === "REVIEW" ? "PREPARING_REVIEW" : "IDLE",
        totalStudents: totalStudentsCount,
        totalWorkouts: totalWorkoutsCount,
        totalExercises: totalExercisesCount,
        totalAssessments: totalAssessmentsCount,
        totalMeasurements: totalMeasurementsCount,
        creditsConsumed: creditsConsumedTotal,
        pauseReason: null,
        pausedAt: null,
      },
    });

    await publishToChannel(`migration:${workspaceId}`, "job_updated", {
      jobId,
      status: nextStatus,
      processingStep: nextStatus === "REVIEW" ? "PREPARING_REVIEW" : "IDLE",
      progressPercentage: 100,
      estimatedSecondsRemaining: 0,
      progressMessage: nextStatus === "REVIEW" ? "Processamento concluído. Pronto para revisão!" : "Importação concluída!",
      totalStudents: totalStudentsCount,
      totalWorkouts: totalWorkoutsCount,
      totalExercises: totalExercisesCount,
      totalAssessments: totalAssessmentsCount,
      totalMeasurements: totalMeasurementsCount,
      creditsConsumed: creditsConsumedTotal,
    });

    if (job.createdByUserId) {
      NotificationService.sendNotification({
        userId: job.createdByUserId,
        type: NotificationType.SYSTEM,
        category: NotificationCategory.SYSTEM,
        title: "Importação Concluída!",
        description: "A importação dos seus alunos e treinos foi finalizada com sucesso. Clique para revisar.",
        priority: NotificationPriority.HIGH,
        deepLink: `/personal/clients/migrate/${jobId}`,
        workspaceId,
      }).catch((err) => console.error("[Migration Notification Error]:", err));

      prisma.user
        .findUnique({
          where: { id: job.createdByUserId },
          select: { name: true, email: true },
        })
        .then((u) => {
          if (u?.email) {
            EmailService.sendImportJobCompletedTrainer({
              to: u.email,
              trainerName: u.name || "Personal",
              totalStudents: totalStudentsCount,
              totalWorkouts: totalWorkoutsCount,
              totalExercises: totalExercisesCount,
              jobId,
            }).catch((err) => console.warn("[MigrationEmail] Dispatch failed:", err));
          }
        })
        .catch((err) => console.warn("[ExtractionService] Error querying trainer for email:", err));
    }

    return await prisma.importJob.findUnique({ where: { id: jobId } });
  } catch (error: any) {
    const errStr = String(error?.message || "") + " " + JSON.stringify(error || {});
    const isRateLimit =
      error?.status === 429 ||
      error?.code === 429 ||
      errStr.includes("429") ||
      errStr.includes("RESOURCE_EXHAUSTED") ||
      errStr.includes("prepayment credits");

    const errorCode = isRateLimit ? "GEMINI_RATE_LIMIT" : "EXTRACTION_FAILED";
    const safeErrorMessage = isRateLimit
      ? "Os créditos ou a cota da sua API do Gemini no Google AI Studio estão esgotados (Erro 429). Para processar PDFs ou Fotos por IA, verifique as configurações em ai.studio/projects. Dica: Planilhas em CSV ou XLSX são processadas 100% localmente sem consumo de créditos de IA!"
      : error.message || "Não foi possível processar o material. Por favor, revise o formato e tente novamente.";

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        processingStep: "IDLE",
        errorCode,
        safeErrorMessage,
      },
    });

    await publishToChannel(`migration:${workspaceId}`, "job_updated", {
      jobId,
      status: "FAILED",
      processingStep: "IDLE",
      errorCode,
      safeErrorMessage,
    });

    if (job.createdByUserId) {
      NotificationService.sendNotification({
        userId: job.createdByUserId,
        type: NotificationType.SYSTEM,
        category: NotificationCategory.SYSTEM,
        title: "Importação não concluída",
        description: "Houve um problema durante o processamento da importação.",
        priority: NotificationPriority.HIGH,
        deepLink: "/personal/clients/migrate",
        workspaceId,
      }).catch((err) => console.error("[Migration Notification Error]:", err));
    }

    throw error;
  }
}

async function handleCreditsExhausted({
  jobId,
  workspaceId,
  userId,
  totalStudentsCount,
  totalWorkoutsCount,
  totalExercisesCount,
  totalAssessmentsCount,
  totalMeasurementsCount,
  creditsConsumedTotal,
  progressPercentage,
}: {
  jobId: string;
  workspaceId: string;
  userId: string;
  totalStudentsCount: number;
  totalWorkoutsCount: number;
  totalExercisesCount: number;
  totalAssessmentsCount: number;
  totalMeasurementsCount: number;
  creditsConsumedTotal: number;
  progressPercentage: number;
}) {
  const safeMessage = "Quantidade de créditos insuficiente para concluir todo o lote. Adquira mais créditos para continuar o processamento de onde parou.";

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "PARTIAL",
      processingStep: "IDLE",
      pauseReason: "CREDITS_EXHAUSTED",
      pausedAt: new Date(),
      totalStudents: totalStudentsCount,
      totalWorkouts: totalWorkoutsCount,
      totalExercises: totalExercisesCount,
      totalAssessments: totalAssessmentsCount,
      totalMeasurements: totalMeasurementsCount,
      creditsConsumed: creditsConsumedTotal,
      safeErrorMessage: safeMessage,
    },
  });

  await publishToChannel(`migration:${workspaceId}`, "job_updated", {
    jobId,
    status: "PARTIAL",
    processingStep: "IDLE",
    pauseReason: "CREDITS_EXHAUSTED",
    progressPercentage,
    progressMessage: "Créditos insuficientes. Adquira mais créditos para continuar.",
    totalStudents: totalStudentsCount,
    totalWorkouts: totalWorkoutsCount,
    creditsConsumed: creditsConsumedTotal,
    safeErrorMessage: safeMessage,
  });

  await NotificationService.sendNotification({
    userId,
    type: NotificationType.SYSTEM,
    category: NotificationCategory.SYSTEM,
    title: "Créditos Insuficientes na Importação",
    description: "Seus créditos de importação acabaram. Revise os alunos já cadastrados ou adquira mais créditos para concluir o lote.",
    priority: NotificationPriority.HIGH,
    deepLink: `/personal/clients/migrate/${jobId}`,
    workspaceId,
  }).catch((err) => console.error("[Migration Notification Error]:", err));
}

async function processDeterministicRows(
  jobId: string,
  workspaceId: string,
  rows: Record<string, any>[],
  mappedHeaders: Record<string, string>,
  sourceId: string
) {
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const tempStudentId = `temp_student_${idx + 1}`;

    const rawName = row[findRawHeader(mappedHeaders, "name")];
    const rawEmail = row[findRawHeader(mappedHeaders, "email")];
    const rawPhone = row[findRawHeader(mappedHeaders, "phone")];
    const rawDocument = row[findRawHeader(mappedHeaders, "cpfCnpj")];
    const rawBirthDate = row[findRawHeader(mappedHeaders, "birthDate")];
    const rawObjective = row[findRawHeader(mappedHeaders, "objective")];

    const normEmail = normalizeEmail(rawEmail).normalizedValue;
    const normPhone = normalizePhone(rawPhone).normalizedValue;
    const normBirthDate = normalizeDate(rawBirthDate).normalizedValue;

    const normalizedStudent = {
      name: rawName ? String(rawName).trim() : null,
      email: normEmail,
      phone: normPhone,
      cpfCnpj: rawDocument ? String(rawDocument).replace(/\D/g, "") : null,
      birthDate: normBirthDate,
      objective: rawObjective ? String(rawObjective).trim() : null,
      weight: null,
      height: null,
      gender: null,
      notes: [],
    };

    const dupCheck = await checkStudentDuplicate(workspaceId, {
      name: normalizedStudent.name,
      email: normalizedStudent.email,
      phone: normalizedStudent.phone,
      birthDate: normalizedStudent.birthDate,
    });

    const needsReview = !normalizedStudent.name || dupCheck.level !== "NO_MATCH";

    await prisma.importRecord.create({
      data: {
        importJobId: jobId,
        entityType: "STUDENT",
        temporaryEntityId: tempStudentId,
        sourceData: row,
        normalizedData: normalizedStudent,
        status: needsReview ? "VALIDATED" : "READY",
        reviewStatus: needsReview ? "PENDING" : "NOT_REQUIRED",
        source: "DETERMINISTIC",
        confidence: 1.0,
        deduplicationMatch: dupCheck.level,
        matchedEntityId: dupCheck.existingStudentId,
        evidence: { sourceId },
      },
    });
  }
}

function findRawHeader(mappedHeaders: Record<string, string>, canonicalField: string): string {
  for (const [raw, canonical] of Object.entries(mappedHeaders)) {
    if (canonical === canonicalField) return raw;
  }
  return canonicalField;
}
