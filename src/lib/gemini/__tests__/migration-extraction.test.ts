import { describe, expect, it } from "vitest";
import { prepareMigrationText, restoreMigrationIdentifiers } from "../migration-identifiers";
import { GEMINI_RESPONSE_SCHEMA, ZMigrationExtractionResponse } from "../schemas/migration-schema";

describe("Extração de importação — preservação de informações", () => {
  it("mantém telefone sem máscara e CPF recuperáveis sem apagar dados do treino", () => {
    const input = "aluno: Aluno Teste\ntelefone: 11999999999\nCPF: 123.456.789-09\nsegunda: peito e tríceps, supino barra reta 4x12, tríceps pulley 4x10";
    const prepared = prepareMigrationText(input);
    expect(prepared.text).toContain("telefone: [ATLAS_CONTACT_1]");
    expect(prepared.text).toContain("CPF: [ATLAS_DOCUMENT_2]");
    expect(prepared.text).toContain("supino barra reta 4x12");
    expect(prepared.text).not.toContain("11999999999");
    const response = restoreMigrationIdentifiers({ students: [{ phone: "[ATLAS_CONTACT_1]", cpfCnpj: "[ATLAS_DOCUMENT_2]" }] }, prepared.values);
    expect(response.students[0]).toEqual({ phone: "11999999999", cpfCnpj: "123.456.789-09" });
  });
  it("restaura contatos de vários alunos pelo marcador, independentemente da ordem da resposta", () => {
    const prepared = prepareMigrationText("telefone: (11) 99999-9999\ntelefone: +55 (21) 98888-8888");
    const result = restoreMigrationIdentifiers({ students: [{ phone: "[ATLAS_CONTACT_2]" }, { phone: "[ATLAS_CONTACT_1]" }] }, prepared.values);
    expect(result.students.map(student => student.phone)).toEqual(["+55 (21) 98888-8888", "(11) 99999-9999"]);
  });
  it("recusa a resposta esquelética que antes virava cards sem informações", () => {
    const result = ZMigrationExtractionResponse.safeParse({ students: [{ temporaryId: "student_1", workouts: [{ temporaryId: "workout_1" }] }] });
    expect(result.success).toBe(false);
  });
  it("exige todas as propriedades no schema enviado ao provedor, incluindo CPF e exercícios", () => {
    const student = GEMINI_RESPONSE_SCHEMA.properties!.students.items!;
    expect(student.required).toEqual(expect.arrayContaining(["name", "email", "phone", "cpfCnpj", "workouts"]));
    const exercise = student.properties!.workouts.items!.properties!.exercises.items!;
    expect(exercise.required).toEqual(expect.arrayContaining(["name", "sets", "reps"]));
  });
  it("preserva domingo como zero e rejeita o calendário antigo de 1 a 7", () => {
    expect(ZMigrationExtractionResponse.parse({ students: [{ name: "Aluno", confidence: null, workouts: [{ name: "Treino A", dayOfWeek: 0 }] }] }).students[0].workouts[0].dayOfWeek).toBe(0);
    expect(ZMigrationExtractionResponse.safeParse({ students: [{ name: "Aluno", workouts: [{ name: "Treino A", dayOfWeek: 7 }] }] }).success).toBe(false);
  });
  it("valida e normaliza exercícios avançados (peso do corpo, dropset, séries individuais)", () => {
    const parsed = ZMigrationExtractionResponse.parse({
      students: [
        {
          name: "Carlos Silva",
          confidence: null,
          workouts: [
            {
              name: "Treino Hipertrofia",
              dayOfWeek: 1,
              saveToLibrary: true,
              targetStudentIds: ["student_1"],
              exercises: [
                {
                  name: "Barra Fixa",
                  sets: 4,
                  reps: "Falha",
                  isBodyweight: true,
                  load: "p.c.",
                  restSeconds: 90,
                  methodType: "NONE",
                },
                {
                  name: "Elevação Lateral",
                  sets: 3,
                  reps: "10+10+10",
                  isBodyweight: false,
                  methodType: "DROPSET",
                  drops: 2,
                  reduction: 20,
                  isIndividual: true,
                  individualSets: [
                    { reps: "12", load: "14kg", rest: "01:00" },
                    { reps: "10", load: "16kg", rest: "01:00" },
                    { reps: "8", load: "18kg", rest: "01:00" },
                  ],
                },
              ],
            },
          ],
        },
      ],
      unassignedWorkouts: [
        {
          name: "Treino Modelo B",
          dayOfWeek: 2,
          saveToLibrary: true,
          exercises: [
            {
              name: "Supino Reto",
              sets: 4,
              reps: "8-10",
              methodType: "REST_PAUSE",
              restPauseSeconds: 15,
              restPauseRounds: 3,
            },
          ],
        },
      ],
    });

    expect(parsed.students[0].workouts[0].saveToLibrary).toBe(true);
    expect(parsed.students[0].workouts[0].exercises[0].isBodyweight).toBe(true);
    expect(parsed.students[0].workouts[0].exercises[1].methodType).toBe("DROPSET");
    expect(parsed.students[0].workouts[0].exercises[1].individualSets).toHaveLength(3);
    expect(parsed.unassignedWorkouts?.[0].exercises[0].methodType).toBe("REST_PAUSE");
  });
});
