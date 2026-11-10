import { describe, expect, it } from "vitest";
import { matchExerciseBatch } from "../matching/exercise-similarity";

describe("Vínculo automático de exercícios", () => {
  const catalog = [{ id: "a", name: "Supino reto com barra" }, { id: "b", name: "Supino inclinado com halteres" }, { id: "c", name: "Tríceps no pulley" }, { id: "d", name: "Tríceps testa" }];
  it("normaliza acentos e ordem das palavras e escolhe a melhor correspondência", () => {
    expect(matchExerciseBatch(["Supino barra reta", "supino inclinado halter", "triceps pulley"], catalog).map(match => match?.exerciseId)).toEqual(["a", "b", "c"]);
  });
  it("não confunde testa com pulley nem equipamentos/ângulos diferentes", () => {
    expect(matchExerciseBatch(["triceps testa"], catalog)[0]?.exerciseId).toBe("d");
    expect(matchExerciseBatch(["Tríceps testa"], [{ id: "c", name: "Tríceps no pulley" }])[0]).toBeNull();
    expect(matchExerciseBatch(["Supino inclinado halteres"], [{ id: "a", name: "Supino reto com barra" }])[0]).toBeNull();
  });
  it("não escolhe um exercício sem relação quando não existe candidato adequado", () => {
    expect(matchExerciseBatch(["Elevação pélvica unilateral", ""], catalog)).toEqual([null, null]);
  });
  it("aceita pequenos erros de digitação sem perder a correspondência", () => {
    expect(matchExerciseBatch(["Supino retto com barra"], catalog)[0]?.exerciseId).toBe("a");
  });
  it("preserva desempate e resultados independentes em nomes repetidos", () => {
    const result = matchExerciseBatch(["supino reto", "SUPINO RETO", "movimento sem relação"], [{ id: "z", name: "Supino reto" }, { id: "a", name: "Supino reto" }]);
    expect(result.map(row => row?.exerciseId ?? null)).toEqual(["a", "a", null]);
    expect(result[0]).not.toBe(result[1]);
  });
});
