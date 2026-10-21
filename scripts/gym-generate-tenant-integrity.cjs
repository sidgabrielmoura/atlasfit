// Derive the declared GYM relations from the checked-in schema, not from client input.
const fs = require('node:fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const models = new Map([...schema.matchAll(/model (\w+) \{([\s\S]*?)\r?\n\}/g)].map(match => [match[1], match[2]]));
const retired = /^(GymClass|GymRoom|GymModality|GymAccess|GymDevice)/;
const retained = [...models].filter(([name, body]) => !retired.test(name) && /\n\s*workspaceId\s+String/.test(body));
const edges = [];
for (const [name, body] of retained) {
 for (const relation of body.matchAll(/\n\s*\w+\s+(\w+)\??\s+@relation\([^\n]*fields: \[(\w+)\]/g)) {
  const [, parent, field] = relation;
  if (models.has(parent) && /\n\s*workspaceId\s+String/.test(models.get(parent))) edges.push({ table: name, field, parent });
  else if (parent === 'GymPlanVersion') edges.push({ table: name, field, parent, via: 'planId', root: 'GymPlan' });
 }
}
for (const edge of [
 { table: 'WorkspaceRoleGrant', field: 'unitId', parent: 'GymUnit', ownVia: 'memberId', ownRoot: 'WorkspaceMember' },
 { table: 'GymPaymentAllocation', field: 'invoiceId', parent: 'GymInvoice', ownVia: 'paymentId', ownRoot: 'GymPayment' },
 { table: 'GymExpensePayment', field: 'financialAccountId', parent: 'GymFinancialAccount', ownVia: 'expenseId', ownRoot: 'GymExpense' },
]) edges.push(edge);
const migrationName = '20261009000000_gym_tenant_relations';
const prefixes = ['prisma/baseline-migrations', 'prisma/migrations'].map(root => `${root}/${migrationName}`);
for (const prefix of prefixes) fs.mkdirSync(prefix, { recursive: true });
const lockedTables = [...new Set(['Workspace', 'GymPlanVersion', ...retained.map(([name]) => name), ...edges.flatMap(e => [e.table, e.parent, e.ownRoot].filter(Boolean))])].sort();
let sql = `-- GYM local references must resolve in the same tenant. PERSONAL-only semantics remain unchanged.
-- Preflight below refuses inconsistent history; it never guesses or rewrites a relationship.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE ${lockedTables.map(name => `"${name}"`).join(', ')} IN ACCESS EXCLUSIVE MODE;
CREATE OR REPLACE FUNCTION atlasfit_gym_relation_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE own_workspace text; related_workspace text; related_id text; own_id text;
BEGIN
 IF TG_ARGV[3] = '' THEN own_workspace := to_jsonb(NEW)->>'workspaceId';
 ELSE
  own_id := to_jsonb(NEW)->>TG_ARGV[3];
  EXECUTE format('SELECT "workspaceId" FROM %I WHERE id = $1', TG_ARGV[4]) INTO own_workspace USING own_id;
 END IF;
 related_id := to_jsonb(NEW)->>TG_ARGV[0];
 IF related_id IS NULL THEN RETURN NEW; END IF;
 IF TG_ARGV[2] = '' THEN
  EXECUTE format('SELECT "workspaceId" FROM %I WHERE id = $1', TG_ARGV[1]) INTO related_workspace USING related_id;
 ELSE
  EXECUTE format('SELECT p."workspaceId" FROM %I r JOIN "GymPlan" p ON p.id=r."planId" WHERE r.id=$1', TG_ARGV[1]) INTO related_workspace USING related_id;
 END IF;
 IF related_workspace IS DISTINCT FROM own_workspace AND EXISTS (SELECT 1 FROM "Workspace" WHERE id IN (own_workspace, related_workspace) AND type='GYM') THEN
  RAISE EXCEPTION 'GYM tenant relation mismatch: %.%', TG_TABLE_NAME, TG_ARGV[0] USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION atlasfit_gym_workspace_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" AND EXISTS (SELECT 1 FROM "Workspace" WHERE id IN (NEW."workspaceId", OLD."workspaceId") AND type='GYM') THEN
  RAISE EXCEPTION 'GYM records require an explicit transfer preserving historical obligations' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION atlasfit_gym_parent_scope_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_workspace text; new_workspace text;
BEGIN
 IF to_jsonb(NEW)->>TG_ARGV[0] IS NOT DISTINCT FROM to_jsonb(OLD)->>TG_ARGV[0] THEN RETURN NEW; END IF;
 EXECUTE format('SELECT "workspaceId" FROM %I WHERE id=$1', TG_ARGV[1]) INTO old_workspace USING to_jsonb(OLD)->>TG_ARGV[0];
 EXECUTE format('SELECT "workspaceId" FROM %I WHERE id=$1', TG_ARGV[1]) INTO new_workspace USING to_jsonb(NEW)->>TG_ARGV[0];
 IF old_workspace IS DISTINCT FROM new_workspace AND EXISTS (SELECT 1 FROM "Workspace" WHERE id IN (old_workspace, new_workspace) AND type='GYM') THEN
  RAISE EXCEPTION 'GYM records require an explicit transfer preserving historical obligations' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
`;
const queries = [];
for (const e of edges) {
 const own = e.ownVia ? `JOIN "${e.ownRoot}" own ON own.id=c."${e.ownVia}"` : '';
 const ownWorkspace = e.ownVia ? 'own."workspaceId"' : 'c."workspaceId"';
 const join = e.via ? `LEFT JOIN "${e.parent}" r ON r.id=c."${e.field}" LEFT JOIN "${e.root}" p ON p.id=r."${e.via}"` : `LEFT JOIN "${e.parent}" p ON p.id=c."${e.field}"`;
 const query = `SELECT count(*)::text AS count FROM "${e.table}" c ${own} ${join} WHERE c."${e.field}" IS NOT NULL AND p."workspaceId" IS DISTINCT FROM ${ownWorkspace} AND EXISTS (SELECT 1 FROM "Workspace" w WHERE w.id IN (${ownWorkspace}, p."workspaceId") AND w.type='GYM')`;
 queries.push({ ...e, query });
 sql += `\nDO $$ BEGIN IF EXISTS (${query.replace('count(*)::text AS count', '1')}) THEN RAISE EXCEPTION 'Reconcile GYM relation ${e.table}.${e.field} before deployment'; END IF; END $$;\n`;
 const name = `gym_scope_${e.field}`;
 sql += `DROP TRIGGER IF EXISTS "${name}" ON "${e.table}";\nCREATE TRIGGER "${name}" BEFORE INSERT OR UPDATE ON "${e.table}" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_relation_scope('${e.field}', '${e.parent}', '${e.via || ''}', '${e.ownVia || ''}', '${e.ownRoot || ''}');\n`;
 if (e.ownVia) sql += `DROP TRIGGER IF EXISTS gym_parent_scope_immutable ON "${e.table}";\nCREATE TRIGGER gym_parent_scope_immutable BEFORE UPDATE OF "${e.ownVia}" ON "${e.table}" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_parent_scope_immutable('${e.ownVia}', '${e.ownRoot}');\n`;
}
for (const [name] of retained) {
 sql += `\nDROP TRIGGER IF EXISTS gym_workspace_immutable ON "${name}";\nCREATE TRIGGER gym_workspace_immutable BEFORE UPDATE OF "workspaceId" ON "${name}" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_workspace_immutable();\n`;
}
// Plan versions inherit their tenant from their immutable plan.
sql += `
CREATE OR REPLACE FUNCTION atlasfit_gym_version_plan_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."planId" IS DISTINCT FROM OLD."planId" THEN RAISE EXCEPTION 'Published GYM versions cannot move between plans' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gym_version_plan_immutable ON "GymPlanVersion";
CREATE TRIGGER gym_version_plan_immutable BEFORE UPDATE OF "planId" ON "GymPlanVersion" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_version_plan_immutable();

CREATE OR REPLACE FUNCTION atlasfit_gym_product_type_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.type IS DISTINCT FROM OLD.type AND (NEW.type='GYM' OR OLD.type='GYM') THEN RAISE EXCEPTION 'GYM product conversion requires a separate audited migration' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gym_product_type_immutable ON "Workspace";
CREATE TRIGGER gym_product_type_immutable BEFORE UPDATE OF type ON "Workspace" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_product_type_immutable();
COMMIT;
`;
// The explicit baseline is the deployment chain; retain the same additive SQL in the historical chain.
for (const prefix of prefixes) fs.writeFileSync(prefix + '/migration.sql', sql);
fs.writeFileSync('prisma/gym-tenant-integrity.json', JSON.stringify({ schema: 'prisma/schema.prisma', edges: queries }, null, 2) + '\n');
console.log(JSON.stringify({ relations: edges.length, immutableTenantTables: retained.length }));
