const { Client } = require('pg');
const { spawnSync } = require('node:child_process');
const suppliedUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
require('dotenv').config({ quiet: true });
const url = suppliedUrl || process.env.DIRECT_URL || process.env.DATABASE_URL;
const bootstrap = process.argv.includes('--bootstrap');
(async () => {
  if (!url) throw new Error('Configure DATABASE_URL ou DIRECT_URL.');
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10000 });
  await client.connect();
  let config;
  try {
    const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(row => row.tablename);
    if (bootstrap) {
      if (tables.length) throw new Error('Bootstrap exige banco vazio. Nenhum dado foi alterado. Para banco existente, use db:migrate.');
      config = 'prisma.baseline.config.ts';
    } else {
      if (!tables.length) throw new Error('Banco vazio: execute npm run db:bootstrap para criar o histórico completo.');
      if (!tables.includes('_prisma_migrations')) throw new Error('Banco sem histórico de migrations: compare o catálogo e faça a adoção de baseline antes de continuar.');
      const names = (await client.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows.map(row => row.migration_name);
      config = names.includes('0_atlasfit_20261007') ? 'prisma.baseline.config.ts' : 'prisma.config.ts';
    }
  } finally { await client.end(); }
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', config], {
    stdio: 'inherit', env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
  process.exitCode = result.status ?? 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
