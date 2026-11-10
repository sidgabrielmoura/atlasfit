import React from "react";
import { createRoot } from "react-dom/client";
import { MigrationDashboardView } from "../../src/components/migration/migration-dashboard-view";
import { MigrationReviewView } from "../../src/components/migration/migration-review-view";
import { PersonalCoinsBadge } from "../../src/components/application/personal-coins-badge";
import { workspaceStore } from "../../src/stores/workspace.store";
import { ImportCommitProvider } from "../../src/providers/import-commit-provider";

const testWindow = window as any;
const channels = new Map<string, any>();
function channel(name: string) {
  if (channels.has(name)) return channels.get(name);
  const messages = new Map<string, Set<any>>(), states = new Map<string, Set<any>>();
  const add = (map: Map<string, Set<any>>, event: string, handler: any) => {
    if (!map.has(event)) map.set(event, new Set());
    map.get(event)!.add(handler);
  };
  const value = {
    state: "attached",
    subscribe: async (event: string, handler: any) => { add(messages, event, handler); },
    unsubscribe: (event: string, handler: any) => messages.get(event)?.delete(handler),
    on: (event: string, handler: any) => add(states, event, handler),
    off: (event: string, handler: any) => states.get(event)?.delete(handler),
    emit: (event: string, data: any) => messages.get(event)?.forEach(handler => handler({ data })),
    stateChange: (event: string, resumed: boolean) => states.get(event)?.forEach(handler => handler({ resumed })),
  };
  channels.set(name, value);
  return value;
}

testWindow.fakeAbly = {
  auth: { tokenDetails: { capability: JSON.stringify({ "migration:workspace-test": ["subscribe"], "migration:workspace-other": ["subscribe"], "user:owner-test": ["subscribe"] }) } },
  channels: { get: channel },
};
workspaceStore.activeWorkspaceId = "workspace-test";
let job: any = { id: "job-test", sourcePlatform: "Texto bruto", status: "PROCESSING", processingStep: "EXTRACTING", creditsConsumed: 0,
  totalStudents: 0, totalWorkouts: 0, totalExercises: 0, totalAssessments: 0, totalMeasurements: 0, createdAt: "2026-11-05T12:00:00Z" };
let quota: any = { allowed: true, remaining: 1000, quotaUsed: 0, quotaTotal: 0, credits: 1000 };
let records: any[] = [{ id: "record-test", entityType: "STUDENT", status: "READY", reviewStatus: "NOT_REQUIRED", confidence: 1,
  normalizedData: { name: "Pessoa Teste", email: "test@example.invalid", phone: "11900000000", cpfCnpj: "52998224725" } }];
let hold = false;
const pending: (() => void)[] = [];
let commitController: ReadableStreamDefaultController<Uint8Array> | null = null;
testWindow.requests = [];
window.fetch = (async (input: string | URL | Request, options?: RequestInit) => {
  const url = String(input);
  testWindow.requests.push(url);
  if (url.includes("/workouts/exercises") && options?.method === "POST") {
    const { names } = JSON.parse(String(options.body));
    return { ok: true, json: async () => ({ matches: names.map((name: string) => /supino/i.test(name) ? { exerciseId: "catalog-bench", exerciseName: "Supino reto com barra", confidence: 1, matchType: "EXACT" } : /pulley/i.test(name) ? { exerciseId: "catalog-pulley", exerciseName: "Tríceps no pulley", confidence: 0.96, matchType: "SYNONYM" } : null) }) } as Response;
  }
  if (url.includes("/records/") && options?.method === "PATCH") {
    const recordId = url.split("/").at(-1);
    const normalizedData = JSON.parse(String(options.body)).normalizedData;
    records = records.map(record => record.id === recordId ? { ...record, normalizedData, status: "READY", reviewStatus: "APPROVED", errorCode: null, safeErrorMessage: null } : record);
    return { ok: true, json: async () => records.find(record => record.id === recordId) } as Response;
  }
  if (url.endsWith("/commit") && options?.method === "POST") return new Response(new ReadableStream<Uint8Array>({ start(controller) {
    commitController = controller;
    job = { ...job, status: "IMPORTING" };
    controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: "started", total: 3 }) + "\n"));
  } }), { headers: { "content-type": "application/x-ndjson" } });
  if (url.endsWith("/preview")) return { ok: true, json: async () => ({ commitVersion: 1, newStudentsCount: 3, updateStudentsCount: 0, ignoredStudentsCount: 0, workoutsCount: 0, availableUnits: [{ id: "unit-test", name: "Matriz" }], warnings: [] }) } as Response;
  const body = url.includes("/balance?") ? structuredClone(quota) : url.includes("/records?") ? { records: structuredClone(records) }
    : url.includes("exercises") ? url.includes("search=pulley") ? [{ id: "catalog-pulley", name: "Tríceps no pulley" }] : [{ id: "catalog-bench", name: "Supino reto com barra" }] : /\/job-test$/.test(url) ? structuredClone(job) : [structuredClone(job)];
  if (hold) await new Promise<void>(resolve => pending.push(resolve));
  return { ok: true, json: async () => body } as Response;
}) as typeof fetch;

const root = createRoot(document.getElementById("root")!);
testWindow.mount = (screen: "dashboard" | "review") => root.render(<ImportCommitProvider><React.Fragment key={screen}>
  <PersonalCoinsBadge role="gym" />
  {screen === "dashboard" ? <MigrationDashboardView role="gym" /> : <MigrationReviewView role="gym" jobId="job-test" />}
</React.Fragment></ImportCommitProvider>);
testWindow.publish = (event: string, data: any) => channel("migration:workspace-test").emit(event, data);
testWindow.reconnect = (resumed = false) => channel("migration:workspace-test").stateChange("attached", resumed);
testWindow.setJob = (patch: any) => { job = { ...job, ...patch }; };
testWindow.setQuota = (patch: any) => { quota = { ...quota, ...patch }; };
testWindow.hold = () => { hold = true; };
testWindow.release = () => { hold = false; pending.splice(0).forEach(resolve => resolve()); };
testWindow.switchWorkspace = () => { workspaceStore.activeWorkspaceId = "workspace-other"; };
testWindow.prepareCommit = () => {
  records = ["Pessoa Teste", "Aluno com pendência", "Aluno concluído"].map((name, index) => ({ id: `commit-record-${index}`, entityType: "STUDENT", status: "READY", reviewStatus: "APPROVED", normalizedData: { name, email: `synthetic-${index}@example.invalid`, birthDate: "1990-01-15" } }));
  job = { ...job, status: "REVIEW", totalStudents: 3 };
};
testWindow.prepareCatalogReview = () => {
  records = [{ id: "catalog-record", entityType: "WORKOUT", status: "READY", reviewStatus: "APPROVED", normalizedData: { name: "Treino com vínculos pendentes", dayOfWeek: 1, exercises: [{ name: "Supino barra reta", matchedExerciseName: "Supino reto com barra", sets: 4, reps: "12" }, { name: "Tríceps pulley", sets: 3, reps: "10" }] } }];
  job = { ...job, status: "REVIEW", totalWorkouts: 1 };
};
testWindow.getDraftRecords = () => records;
testWindow.commitEvent = (event: any) => {
  if (event.type === "progress") records = records.map(record => event.recordIds.includes(record.id) ? { ...record, status: event.failure ? "FAILED" : "COMMITTED", reviewStatus: event.failure ? "PENDING" : record.reviewStatus, safeErrorMessage: event.failure?.message } : record);
  if (event.type === "finished") job = { ...job, status: event.result.status, errorCode: "COMMIT_PARTIAL" };
  commitController!.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"));
  if (event.type === "finished") commitController!.close();
};
testWindow.mount("dashboard");
