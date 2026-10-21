const fs = require('node:fs');
const dashboard = 'src/app/(student)/student/dashboard/page.tsx';
let text = fs.readFileSync(dashboard, 'utf8');
text = text.replace('import { useSession } from "next-auth/react";\n', '').replace('import { useAbly } from "@/providers/ably-provider";\n', '');
text = text.replace('  const { data: session } = useSession();\n  const ablyClient = useAbly();\n', '');
const start = text.indexOf('  const [lockStatus, setLockStatus]'); const end = text.indexOf('  useEffect(() => {\n    setMounted', start);
if (start < 0 || end < 0) throw Error('Lock dashboard ausente.');
text = text.slice(0, start) + text.slice(end);
text = text.replace('    async function loadDashboardData() {', '    if (!activeWs?.id) return;\n    const controller = new AbortController();\n    async function loadDashboardData() {');
text = text.replace('      setLoading(true);\n      setError(null);', '      setLoading(true);\n      setData(null);\n      setError(null);');
text = text.replace('fetch("/api/student/dashboard")', 'fetch("/api/student/dashboard", { signal: controller.signal })');
text = text.replace('        setData(dashboardData);', '        if (dashboardData.workspace?.id !== activeWs?.id) throw new Error("O contexto mudou. Recarregue a página.");\n        setData(dashboardData);');
text = text.replace('      } catch (err: any) {\n        console.error(err);\n        setError(err.message || "Erro ao carregar os dados.");\n      } finally {\n        setLoading(false);', '      } catch (err: unknown) {\n        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Erro ao carregar os dados.");\n      } finally {\n        if (!controller.signal.aborted) setLoading(false);');
text = text.replace('    loadDashboardData();\n  }, []);', '    loadDashboardData();\n    return () => controller.abort();\n  }, [activeWs?.id]);');
text = text.replace('Regularize para evitar o bloqueio de seus treinos.', '{finance.kind === "GYM_MANUAL" ? "Consulte os recebimentos registrados pela academia." : "Regularize para evitar o bloqueio de seus treinos."}');
fs.writeFileSync(dashboard, text);
const workouts = 'src/app/(student)/student/workouts/page.tsx';
text = fs.readFileSync(workouts, 'utf8');
const lockBegin = text.indexOf('  const fetchLockStatus = async () => {'); const lockEnd = text.indexOf('  const daysOfWeekLabels', lockBegin);
if (lockBegin < 0 || lockEnd < 0) throw Error('Lock treinos ausente.');
text = text.slice(0, lockBegin) + `  useEffect(() => {
    setLockStatus({ status: "OK", daysUntilLock: null, overdueBilling: null });
    if (!activeWs?.id || activeWs.type !== "PERSONAL") return;
    const controller = new AbortController();
    async function fetchLockStatus() {
      try {
        const response = await fetch("/api/student/lock-status", { signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível consultar as pendências.");
        const result = await response.json();
        if (!controller.signal.aborted) setLockStatus(result);
      } catch (error: unknown) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Falha ao consultar pendências.");
      }
    }
    void fetchLockStatus();
    const channel = ablyClient && session?.user?.id ? ablyClient.channels.get(\x60user:\x24{session.user.id}\x60) : null;
    const refresh = () => { void fetchLockStatus(); };
    channel?.subscribe("wallet:updated", refresh);
    return () => { controller.abort(); channel?.unsubscribe("wallet:updated", refresh); };
  }, [ablyClient, session?.user?.id, activeWs?.id, activeWs?.type]);

` + text.slice(lockEnd);
text = text.replace('    loadWorkoutsData();\n  }, []);', '    if (!activeWs?.id) return;\n    const controller = new AbortController();\n    setWorkouts([]);\n    setHistoryLogs([]);\n    void loadWorkoutsData(controller.signal);\n    return () => controller.abort();\n  }, [activeWs?.id]);');
text = text.replace('  async function loadWorkoutsData() {', '  async function loadWorkoutsData(signal?: AbortSignal) {');
text = text.replace('fetch("/api/student/workouts")', 'fetch("/api/student/workouts", { signal })');
text = text.replace('      setWorkouts(apiData.workouts || []);', '      if (signal?.aborted) return;\n      if (apiData.workspaceId !== activeWs?.id) throw new Error("O contexto mudou. Recarregue a página.");\n      setWorkouts(apiData.workouts || []);');
text = text.replace('    } catch (err: any) {\n      console.error(err);\n      setError(err.message || "Erro de conexão.");\n    } finally {\n      setLoading(false);', '    } catch (err: unknown) {\n      if (!signal?.aborted) setError(err instanceof Error ? err.message : "Erro de conexão.");\n    } finally {\n      if (!signal?.aborted) setLoading(false);');
fs.writeFileSync(workouts, text);
console.log('Clientes removem listeners wallet GYM e descartam respostas do contexto anterior.');
