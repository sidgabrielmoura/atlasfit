const jobs = Object.freeze(['gym-recurrence', 'process-recurrence', 'deliveries', 'gym-purge', 'engage-push']);

function configuration(job, env = process.env) {
  if (!jobs.includes(job)) throw new Error('INVALID_JOB');
  if (!env.CRON_SECRET?.trim() || /[\r\n]/.test(env.CRON_SECRET)) throw new Error('CRON_SECRET_REQUIRED');
  let origin;
  try { origin = new URL(env.ATLASFIT_CRON_ORIGIN); } catch { throw new Error('CRON_ORIGIN_REQUIRED'); }
  const local = env.CRON_ALLOW_LOCAL === '1' && ['127.0.0.1', '[::1]'].includes(origin.hostname);
  if ((origin.protocol !== 'https:' && !(local && origin.protocol === 'http:')) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('INVALID_CRON_ORIGIN');
  return { url: new URL(`/api/cron/${job}`, origin), secret: env.CRON_SECRET };
}

/** Runs one named job. A failed or uncertain request is left for the next scheduled invocation. */
async function runScheduledJob(job, env = process.env) {
  const { url, secret } = configuration(job, env);
  const started = Date.now();
  try {
    const response = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${secret}` }, redirect: 'error', signal: AbortSignal.timeout(50000) });
    const data = await response.json().catch(() => null);
    return { job, success: response.ok && data?.success === true, httpStatus: response.status, durationMs: Date.now() - started };
  } catch {
    return { job, success: false, code: 'JOB_RESULT_UNCERTAIN', durationMs: Date.now() - started };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const job = args.find(arg => arg.startsWith('--job='))?.slice(6);
  (async () => {
    if (args.some(arg => arg !== '--check' && !arg.startsWith('--job=')) || args.filter(arg => arg.startsWith('--job=')).length !== 1) throw new Error('INVALID_ARGUMENTS');
    if (args.includes('--check')) { configuration(job); console.log(JSON.stringify({ job, valid: true, requestPerformed: false })); return; }
    const result = await runScheduledJob(job);
    console.log(JSON.stringify(result));
    if (!result.success) process.exitCode = 1;
  })().catch(error => { console.error(JSON.stringify({ success: false, code: error.message })); process.exitCode = 1; });
}
module.exports = { configuration, runScheduledJob, jobs };
