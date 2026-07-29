import prisma from "@/lib/prisma";
import { GeminiMigrationExtractor } from "../gemini/extractor";
import { parseCsvContent } from "./parsers/csv.parser";
import { parseXlsxBuffer } from "./parsers/spreadsheet.parser";
import { mapColumnHeaders } from "./column-alias";
import {
  normalizePhone,
  normalizeEmail,
  normalizeDate,
  normalizeNumber,
} from "./normalization/normalization.service";
import { checkStudentDuplicate } from "./matching/duplicate.service";
import { matchExerciseName } from "./matching/exercise-matcher.service";

export async function processImportJob(jobId: string, workspaceId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { sources: true },
  });

  if (!job) throw new Error("Job de migração não encontrado.");

  // Atomic lock check to prevent concurrent processing
  if (job.status === "PROCESSING" || job.status === "IMPORTING") {
    return job;
  }

  // Set processing lock
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "PROCESSING",
      processingStep: "PARSING",
      errorCode: null,
      safeErrorMessage: null,
    },
  });

  try {
    const extractor = new GeminiMigrationExtractor();

    let totalStudentsCount = 0;
    let totalWorkoutsCount = 0;
    let totalExercisesCount = 0;
    let totalAssessmentsCount = 0;
    let totalMeasurementsCount = 0;

    for (const source of job.sources) {
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
                await processDeterministicRows(
                  jobId,
                  workspaceId,
                  sheet.rows,
                  mapped,
                  source.id
                );
                totalStudentsCount += sheet.rows.length;
                continue;
              }
            }
          } else if (!source.textContent.startsWith("BASE64_FILE:")) {
            const parsedCsv = parseCsvContent(source.textContent);
            const { mapped, unrecognized } = mapColumnHeaders(parsedCsv.headers);

            // If no unrecognized columns, process 100% deterministically without Gemini
            if (unrecognized.length === 0 && parsedCsv.rows.length > 0) {
              await processDeterministicRows(
                jobId,
                workspaceId,
                parsedCsv.rows,
                mapped,
                source.id
              );
              totalStudentsCount += parsedCsv.rows.length;
              continue;
            }
          }
        }
      }

      // Perform AI Extraction for unstructured sources, ambiguous spreadsheets, images, or PDFs
      await prisma.importJob.update({
        where: { id: jobId },
        data: { processingStep: "EXTRACTING" },
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
        } else if (!source.textContent.startsWith("BASE64_XLSX:")) {
          textContentForAi = source.textContent;
        }
      }

      let aiResult;
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
        // Fallback to flash-3.6 if primary flash-lite failed
        aiResult = await extractor.extract({
          importJobId: jobId,
          userId: job.createdByUserId,
          textContent: textContentForAi,
          inlineFiles: inlineFilesForAi,
          useFallbackModel: true,
          purpose: "fragment_fallback",
        });
      }

      // Normalization & Matching Step
      await prisma.importJob.update({
        where: { id: jobId },
        data: { processingStep: "NORMALIZING" },
      });

      if (aiResult && aiResult.students) {
        for (let sIdx = 0; sIdx < aiResult.students.length; sIdx++) {
          const rawStudent = aiResult.students[sIdx];
          const tempStudentId = rawStudent.temporaryId || `temp_student_${sIdx + 1}`;

          const normPhone = normalizePhone(rawStudent.phone);
          const normEmail = normalizeEmail(rawStudent.email);
          const normBirthDate = normalizeDate(rawStudent.birthDate);

          const normalizedStudent = {
            name: rawStudent.name ? rawStudent.name.trim() : null,
            email: normEmail.normalizedValue,
            phone: normPhone.normalizedValue,
            birthDate: normBirthDate.normalizedValue,
            objective: rawStudent.objective ?? null,
            weight: normalizeNumber(rawStudent.weight).normalizedValue,
            height: normalizeNumber(rawStudent.height).normalizedValue,
            gender: rawStudent.gender ?? null,
            notes: rawStudent.notes || [],
          };

          // Deduplication Matching
          await prisma.importJob.update({
            where: { id: jobId },
            data: { processingStep: "MATCHING" },
          });

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

          // Save Student Record
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

          // Process Workouts nested under Student
          if (rawStudent.workouts) {
            for (let wIdx = 0; wIdx < rawStudent.workouts.length; wIdx++) {
              const rawWorkout = rawStudent.workouts[wIdx];
              const tempWorkoutId = rawWorkout.temporaryId || `temp_workout_${sIdx + 1}_${wIdx + 1}`;

              const exercisesWithMatches = [];
              if (rawWorkout.exercises) {
                for (const rawEx of rawWorkout.exercises) {
                  totalExercisesCount++;
                  const matchedEx = rawEx.name
                    ? await matchExerciseName(rawEx.name, job.createdByUserId ?? undefined)
                    : null;

                  exercisesWithMatches.push({
                    ...rawEx,
                    matchedExerciseId: matchedEx?.exerciseId ?? null,
                    matchedExerciseName: matchedEx?.exerciseName ?? null,
                  });
                }
              }

              const normalizedWorkout = {
                temporaryStudentId: tempStudentId,
                name: rawWorkout.name || `Treino ${wIdx + 1}`,
                goal: rawWorkout.goal || "Hipertrofia",
                difficulty: rawWorkout.difficulty || "Intermediário",
                duration: rawWorkout.duration || "60 min",
                dayOfWeek: rawWorkout.dayOfWeek ?? null,
                muscleGroupLabel: rawWorkout.muscleGroupLabel ?? null,
                restBetweenExercises: rawWorkout.restBetweenExercises || "2 min",
                exercises: exercisesWithMatches,
              };

              await prisma.importRecord.create({
                data: {
                  importJobId: jobId,
                  entityType: "WORKOUT",
                  temporaryEntityId: tempWorkoutId,
                  sourceData: rawWorkout,
                  normalizedData: normalizedWorkout,
                  status: "READY",
                  reviewStatus: "NOT_REQUIRED",
                  source: "AI_EXTRACTED",
                  confidence: 0.9,
                  evidence: { sourceId: source.id },
                },
              });

              totalWorkoutsCount++;
            }
          }

          // Process Assessments
          if (rawStudent.assessments) {
            for (let aIdx = 0; aIdx < rawStudent.assessments.length; aIdx++) {
              const rawAss = rawStudent.assessments[aIdx];
              const tempAssId = rawAss.temporaryId || `temp_ass_${sIdx + 1}_${aIdx + 1}`;

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

          // Process Measurements
          if (rawStudent.measurements) {
            for (let mIdx = 0; mIdx < rawStudent.measurements.length; mIdx++) {
              const rawMeas = rawStudent.measurements[mIdx];
              const tempMeasId = rawMeas.temporaryId || `temp_meas_${sIdx + 1}_${mIdx + 1}`;

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
    }

    // Set job to REVIEW state
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "REVIEW",
        processingStep: "PREPARING_REVIEW",
        totalStudents: totalStudentsCount,
        totalWorkouts: totalWorkoutsCount,
        totalExercises: totalExercisesCount,
        totalAssessments: totalAssessmentsCount,
        totalMeasurements: totalMeasurementsCount,
      },
    });

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
      : "Não foi possível processar o material. Por favor, revise o formato e tente novamente.";

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        processingStep: "IDLE",
        errorCode,
        safeErrorMessage,
      },
    });
    throw error;
  }
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
    const rawBirthDate = row[findRawHeader(mappedHeaders, "birthDate")];
    const rawObjective = row[findRawHeader(mappedHeaders, "objective")];

    const normEmail = normalizeEmail(rawEmail).normalizedValue;
    const normPhone = normalizePhone(rawPhone).normalizedValue;
    const normBirthDate = normalizeDate(rawBirthDate).normalizedValue;

    const normalizedStudent = {
      name: rawName ? String(rawName).trim() : null,
      email: normEmail,
      phone: normPhone,
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
