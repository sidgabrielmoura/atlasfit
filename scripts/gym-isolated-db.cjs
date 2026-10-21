const { Client } = require('pg');
const DATABASE = 'atlasfit_gym_stabilization_20261001';
async function main() {
  const client = new Client({ host: '127.0.0.1', port: 56432, user: 'atlasfit_test', database: 'postgres', connectionTimeoutMillis: 3000 });
  await client.connect();
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [DATABASE]);
  if (!existing.rowCount) await client.query(`CREATE DATABASE "${DATABASE}"`);
  const result = await client.query('SELECT version() AS version');
  console.log(result.rows[0].version);
  console.log(`Banco descartável ${DATABASE} disponível em 127.0.0.1:56432.`);
  await client.end();
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
