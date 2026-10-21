import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AdvancedTemplateEditor } from "@/app/(gym)/gym/workouts/advanced-template-editor";
import type { GymWorkoutCard } from "@/modules/workspaces/domain/gym-workout-client";
const template: GymWorkoutCard = { id: "synthetic-template", name: "Ficha sintética", goal: "Força", duration: "40 min", difficulty: "Intermediário", muscleGroupLabel: null, restBetweenExercises: "60s", creatorId: "owner", creator: null, allowRepsModification: true, allowCompleteView: false, allowSkipExercises: false, _count: { exercises: 3 }, exercises: [0, 1, 2].map(index => ({ id: "row-" + index, exerciseId: "exercise-" + index, sets: 3, reps: "10", rest: "60s", load: null, description: null, methodType: "NONE", methodConfig: null, groupId: null, allowRepsModification: null, exercise: { name: "Exercício " + (index + 1), muscleGroup: { name: "Grupo" } } })) };
function Fixture() {
  const [open, setOpen] = useState(false), [saved, setSaved] = useState(0);
  return <><button onClick={() => setOpen(true)}>Abrir editor avançado</button><output id="saved">{saved}</output>{open && <AdvancedTemplateEditor workspaceId="synthetic-gym" template={template} onClose={() => setOpen(false)} onSaved={() => setSaved(value => value + 1)} />}</>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
