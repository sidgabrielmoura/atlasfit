import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";


interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("O ID do workspace é obrigatório.", { status: 400 });
  }

  try {
    // Verify trainer has access to workspace
    const trainerCheck = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId }
    });

    if (!trainerCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Verify student is in this workspace
    const studentCheck = await prisma.workspaceMember.findFirst({
      where: { userId: studentId, workspaceId, role: "STUDENT" }
    });

    if (!studentCheck) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    const evaluations = await prisma.physicalEvaluation.findMany({
      where: { studentId, workspaceId },
      orderBy: { date: "desc" }
    });

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error("GET student evaluations error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: studentId } = await params;

  try {
    const body = await req.json();
    const {
      workspaceId,
      type,
      weight,
      height,
      bodyFat,
      muscleMass,
      dobras,
      notes,
      date,
      anamnese,
      circunferencias,
      postural,
      dorMobilidade,
      testesFisicos
    } = body;

    if (!workspaceId || !type) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify trainer
    const trainerCheck = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, workspaceId }
    });

    if (!trainerCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Verify student and fetch user data
    const studentCheck = await prisma.workspaceMember.findFirst({
      where: { userId: studentId, workspaceId, role: "STUDENT" },
      include: { user: true }
    });

    if (!studentCheck || !studentCheck.user) {
      return new NextResponse("Aluno não encontrado neste workspace.", { status: 404 });
    }

    // Calculations: IMC
    const weightVal = parseFloat(weight as any) || 0;
    const heightVal = parseFloat(height as any) || 0;
    let calculatedImc = null;
    let imcClassification = "";
    if (weightVal > 0 && heightVal > 0) {
      const heightM = heightVal / 100;
      calculatedImc = parseFloat((weightVal / (heightM * heightM)).toFixed(2));
      if (calculatedImc < 18.5) imcClassification = "Abaixo do peso";
      else if (calculatedImc <= 24.9) imcClassification = "Peso normal";
      else if (calculatedImc <= 29.9) imcClassification = "Sobrepeso";
      else if (calculatedImc <= 34.9) imcClassification = "Obesidade Grau I";
      else if (calculatedImc <= 39.9) imcClassification = "Obesidade Grau II";
      else imcClassification = "Obesidade Grau III";
    }

    // Calculations: Jackson & Pollock 3 Dobras
    let calculatedBodyFat = bodyFat !== undefined && bodyFat !== null ? parseFloat(bodyFat) : null;
    let calculatedMuscleMass = muscleMass !== undefined && muscleMass !== null ? parseFloat(muscleMass) : null;
    const studentGender = anamnese?.gender || studentCheck.user.gender;
    const studentBirthDate = anamnese?.birthDate ? new Date(anamnese.birthDate) : studentCheck.user.birthDate;

    let computedDobras = dobras || null;

    if (dobras && (type.includes("Dobra Cutânea") || type === "Completa" || type.includes("dobras"))) {
      let age = 30;
      if (studentBirthDate) {
        const dob = new Date(studentBirthDate);
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
      }

      if (studentGender === "male" || studentGender === "masculino") {
        const p = parseFloat(dobras.peitoral) || 0;
        const a = parseFloat(dobras.abdominal) || 0;
        const c = parseFloat(dobras.coxa) || 0;
        const sum = p + a + c;
        if (sum > 0) {
          const density = 1.10938 - (0.0008267 * sum) + (0.0000016 * sum * sum) - (0.0002574 * age);
          if (density > 0) {
            calculatedBodyFat = ((4.95 / density) - 4.50) * 100;
          }
        }
      } else {
        const t = parseFloat(dobras.triceps) || 0;
        const s = parseFloat(dobras.suprailiaca) || 0;
        const c = parseFloat(dobras.coxa) || 0;
        const sum = t + s + c;
        if (sum > 0) {
          const density = 1.0994921 - (0.0009929 * sum) + (0.0000023 * sum * sum) - (0.0001392 * age);
          if (density > 0) {
            calculatedBodyFat = ((4.95 / density) - 4.50) * 100;
          }
        }
      }

      if (calculatedBodyFat !== null) {
        calculatedBodyFat = parseFloat(Math.max(0, Math.min(100, calculatedBodyFat)).toFixed(2));
        const fatMassVal = weightVal * (calculatedBodyFat / 100);
        const leanMassVal = weightVal - fatMassVal;

        let classification = "";
        if (studentGender === "male" || studentGender === "masculino") {
          if (calculatedBodyFat < 6) classification = "Gordura Essencial";
          else if (calculatedBodyFat <= 13) classification = "Atleta";
          else if (calculatedBodyFat <= 17) classification = "Fitness";
          else if (calculatedBodyFat <= 24) classification = "Normal / Aceitável";
          else classification = "Obesidade";
        } else {
          if (calculatedBodyFat < 14) classification = "Gordura Essencial";
          else if (calculatedBodyFat <= 20) classification = "Atleta";
          else if (calculatedBodyFat <= 24) classification = "Fitness";
          else if (calculatedBodyFat <= 31) classification = "Normal / Aceitável";
          else classification = "Obesidade";
        }

        calculatedMuscleMass = parseFloat((100 - calculatedBodyFat).toFixed(2));

        computedDobras = {
          ...dobras,
          bodyFat: calculatedBodyFat,
          fatMass: parseFloat(fatMassVal.toFixed(2)),
          leanMass: parseFloat(leanMassVal.toFixed(2)),
          classification
        };
      }
    }

    // Calculations: 1RM Estimado nos testes de força
    let computedTestesFisicos = testesFisicos || null;
    if (testesFisicos?.forca) {
      const load = parseFloat(testesFisicos.forca.load) || 0;
      const reps = parseInt(testesFisicos.forca.reps) || 0;
      let calculated1RM = 0;
      if (reps > 0) {
        calculated1RM = reps === 1 ? load : load * (1 + reps / 30);
      }
      computedTestesFisicos = {
        ...testesFisicos,
        forca: {
          ...testesFisicos.forca,
          rm: parseFloat(calculated1RM.toFixed(2))
        }
      };
    }

    // Assemble dynamic data object for Anthropometry
    const updatedAnamnese = anamnese ? {
      ...anamnese,
      imc: calculatedImc,
      imcClassification
    } : null;

    const evaluation = await prisma.physicalEvaluation.create({
      data: {
        studentId,
        workspaceId,
        type,
        weight: weightVal,
        height: heightVal,
        bodyFat: calculatedBodyFat,
        muscleMass: calculatedMuscleMass,
        dobras: computedDobras,
        anamnese: updatedAnamnese,
        circunferencias: circunferencias || null,
        postural: postural || null,
        dorMobilidade: dorMobilidade || null,
        testesFisicos: computedTestesFisicos,
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
      }
    });

    // Sincronizar dados básicos no perfil do aluno
    await prisma.user.update({
      where: { id: studentId },
      data: {
        gender: studentGender || undefined,
        birthDate: studentBirthDate || undefined,
        height: heightVal || undefined,
        weight: weightVal || undefined,
        objective: anamnese?.objective || undefined,
      }
    });

    if (evaluation) {
      await NotificationService.sendNotification({
        userId: studentId,
        type: "ASSESSMENT_CREATED",
        category: "ASSESSMENT",
        title: "Sua Avaliação Física está Pronta! 📊",
        description: "Seu personal trainer liberou uma nova avaliação física para você.",
        deepLink: "/student/assessments",
        source: "ASSESSMENT",
        workspaceId
      });
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("POST student evaluation error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
