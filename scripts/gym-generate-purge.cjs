const fs=require('node:fs'),assert=require('node:assert/strict');
const schema=fs.readFileSync('prisma/schema.prisma','utf8');
const models=[...schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)].map(([,name,body])=>({name,body,key:body.match(/^\s*(\w+)\s+\w+[^\n]*@id\b/m)?.[1]??(name==='VerificationToken'?'token':null),scope:body.match(/^\s*(workspaceId|gymWorkspaceId)\s+String/m)?.[1],parents:[...body.matchAll(/^\s*\w+\s+(\w+)\??\s+@relation\([^\n]*fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]/gm)].map(([,table,field,key])=>({table,field,key}))}));
const map=new Map(models.map(row=>[row.name,row]));
const paths=new Map([['Workspace',[]]]);
for(const row of models)if(row.scope)paths.set(row.name,[{table:'Workspace',field:row.scope,key:'id'}]);
for(let pass=0;pass<models.length;pass++)for(const row of models)if(!paths.has(row.name)){const edge=row.parents.find(parent=>paths.has(parent.table));if(edge)paths.set(row.name,[edge,...paths.get(edge.table)]);}
for(const name of paths.keys())assert.ok(map.get(name).key,'Missing single key '+name);
const scoped=models.filter(row=>paths.has(row.name));
const ordered=[],seen=new Set();
function visit(name,stack=[]){if(seen.has(name))return;assert.ok(!stack.includes(name),'Cross-model FK cycle '+name);for(const row of scoped)if(row.name!==name&&row.parents.some(parent=>parent.table===name))visit(row.name,[...stack,name]);seen.add(name);ordered.push(map.get(name));}
visit('Workspace');for(const row of scoped)visit(row.name);
const q=name=>'"'+name+'"';
const scopeCases=scoped.filter(row=>row.name!=='Workspace'&&row.name!=='GymPurgeJob').map(row=>{
 const path=paths.get(row.name);
 let select='SELECT w."closedAt",w.id INTO closed_at,scope_id FROM "Workspace" w',where;
 if(path.length===1)where=`w.id = (to_jsonb(NEW)->>'${path[0].field}')`;
 else{const chain=path.slice(0,-1);for(let i=chain.length-1;i>=0;i--){const edge=chain[i],next=path[i+1];select+=` JOIN ${q(edge.table)} p${i} ON p${i}.${q(next.field)}=${i===chain.length-1?'w.id':`p${i+1}.${q(next.key)}`}`;}where=`p0.${q(chain[0].key)}=(to_jsonb(NEW)->>'${chain[0].field}')`;}
 return ` WHEN '${row.name}' THEN ${select} WHERE ${where};`;
}).join('\n');
const seeds=scoped.filter(row=>row.scope).map(row=>` INSERT INTO atlasfit_purge_targets SELECT '${row.name}',${q(row.key)} FROM ${q(row.name)} WHERE ${q(row.scope)}=wid ON CONFLICT DO NOTHING;`).join('\n');
const expansion=scoped.flatMap(row=>row.parents.filter(parent=>paths.has(parent.table)&&parent.table!==row.name).map(parent=>` INSERT INTO atlasfit_purge_targets SELECT '${row.name}',r.${q(row.key)} FROM ${q(row.name)} r JOIN atlasfit_purge_targets t ON t.table_name='${parent.table}' AND t.row_key=r.${q(parent.field)} ON CONFLICT DO NOTHING;`)).join('\n');
const checks=scoped.filter(row=>row.scope).map(row=>` IF EXISTS(SELECT 1 FROM ${q(row.name)} r JOIN atlasfit_purge_targets t ON t.table_name='${row.name}' AND t.row_key=r.${q(row.key)} WHERE r.${q(row.scope)} IS NOT NULL AND r.${q(row.scope)}<>wid) THEN RAISE EXCEPTION 'Cross-tenant purge reference: ${row.name}' USING ERRCODE='23514'; END IF;`).join('\n');
const deletes=ordered.map(row=>` DELETE FROM ${q(row.name)} WHERE ${q(row.key)} IN (SELECT row_key FROM atlasfit_purge_targets WHERE table_name='${row.name}');`).join('\n');
const triggers=scoped.filter(row=>!['Workspace','GymPurgeJob'].includes(row.name)).map(row=>`CREATE TRIGGER gym_closed_write_guard BEFORE INSERT OR UPDATE ON ${q(row.name)} FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closed_write_guard();`).join('\n');
const identityTables=new Set(['Account','Session','UserTotpDevice','LegalAcceptance','PrivacyConsent','NotificationPreference','NotificationDevice','AuditLog','Notification','DataSubjectRequest','DataDeletionRequest','FreeTrial']);
const remainingUserGuards=models.filter(row=>!identityTables.has(row.name)).flatMap(row=>row.parents.filter(parent=>parent.table==='User').map(parent=>`   AND NOT EXISTS(SELECT 1 FROM ${q(row.name)} WHERE ${q(parent.field)}=candidate)`)).join('\n');
const scopedIdentityGuards=models.filter(row=>identityTables.has(row.name)&&row.scope).flatMap(row=>row.parents.filter(parent=>parent.table==='User').map(parent=>`   AND NOT EXISTS(SELECT 1 FROM ${q(row.name)} WHERE ${q(parent.field)}=candidate AND ${q(row.scope)} IS NOT NULL)`)).join('\n');
const sql=`-- Additive policy revision: no existing tenant is purged by this migration.
BEGIN;
SET LOCAL lock_timeout='10s';
ALTER TABLE "Workspace" ADD COLUMN "closedAt" TIMESTAMP(3), ADD COLUMN "purgeAfter" TIMESTAMP(3);
ALTER TABLE "DeliveryOutbox" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "VerificationToken" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "DeliveryOutbox" ADD CONSTRAINT "DeliveryOutbox_workspaceId_fkey" FOREIGN KEY("workspaceId") REFERENCES "Workspace"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_workspaceId_fkey" FOREIGN KEY("workspaceId") REFERENCES "Workspace"(id) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "DeliveryOutbox_workspaceId_idx" ON "DeliveryOutbox"("workspaceId");
CREATE TABLE "GymPurgeJob"("workspaceId" TEXT PRIMARY KEY,"requestKey" TEXT NOT NULL UNIQUE,fingerprint TEXT NOT NULL,mode TEXT NOT NULL DEFAULT 'SCHEDULED',status TEXT NOT NULL DEFAULT 'QUEUED',"nextAttemptAt" TIMESTAMP(3) NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,"leaseToken" TEXT,"leaseExpiresAt" TIMESTAMP(3),"storageCompletedAt" TIMESTAMP(3),"legacyScanCursor" TEXT,"legacyScanComplete" BOOLEAN NOT NULL DEFAULT FALSE,"lastErrorCode" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "GymPurgeJob_workspaceId_fkey" FOREIGN KEY("workspaceId") REFERENCES "Workspace"(id) ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "GymPurgeJob_status_nextAttemptAt_leaseExpiresAt_idx" ON "GymPurgeJob"(status,"nextAttemptAt","leaseExpiresAt");
CREATE TABLE "GymPurgeReceipt"("requestKey" TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,"deletedRows" INTEGER NOT NULL,"deletedExclusiveUsers" INTEGER NOT NULL,"completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- Previously closed gyms inherit their original closure date, never a fresh month.
UPDATE "Workspace" w SET "closedAt"=a.closed_at,"purgeAfter"=a.closed_at+INTERVAL '1 month',"isActive"=FALSE FROM (SELECT "entityId",MIN("createdAt") closed_at FROM "AuditLog" WHERE action='GYM_WORKSPACE_CLOSED' AND entity='WORKSPACE' GROUP BY "entityId") a WHERE w.id=a."entityId" AND w.type='GYM';
INSERT INTO "GymPurgeJob"("workspaceId","requestKey",fingerprint,"nextAttemptAt","updatedAt") SELECT id,'legacy-closure-'||id,md5(id),"purgeAfter"-INTERVAL '1 day',CURRENT_TIMESTAMP FROM "Workspace" WHERE type='GYM' AND "closedAt" IS NOT NULL;
-- GINV identifiers contain base64url JSON; expose scope without discarding tokens.
DO $$ DECLARE r RECORD; encoded TEXT; decoded JSONB; BEGIN
 FOR r IN SELECT token,identifier FROM "VerificationToken" WHERE identifier LIKE 'GYM_STUDENT_INVITE_V1:%' LOOP
  encoded:=split_part(r.identifier,':',3); encoded:=translate(encoded,'-_','+/'); encoded:=encoded||repeat('=',(4-length(encoded)%4)%4);
  decoded:=convert_from(decode(encoded,'base64'),'UTF8')::jsonb;
  UPDATE "VerificationToken" SET "workspaceId"=decoded->>'workspaceId' WHERE token=r.token;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION atlasfit_gym_closed_write_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closed_at TIMESTAMP; scope_id TEXT;
BEGIN
 CASE TG_TABLE_NAME
${scopeCases}
 ELSE RETURN NEW;
 END CASE;
 IF closed_at IS NOT NULL AND COALESCE(current_setting('atlasfit.gym_purge_scope',TRUE),'')<>scope_id THEN RAISE EXCEPTION 'Closed GYM workspace is read-only pending purge' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
${triggers}
CREATE OR REPLACE FUNCTION atlasfit_gym_workspace_delete_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.type='GYM' AND (OLD."closedAt" IS NULL OR COALESCE(current_setting('atlasfit.gym_purge_scope',TRUE),'')<>OLD.id) THEN RAISE EXCEPTION 'GYM workspace requires coordinated authenticated purge' USING ERRCODE='23514'; END IF;
 RETURN OLD;
END $$;
CREATE FUNCTION atlasfit_gym_closure_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD."closedAt" IS NOT NULL AND (NEW."closedAt" IS DISTINCT FROM OLD."closedAt" OR NEW."purgeAfter" IS DISTINCT FROM OLD."purgeAfter" OR NEW."isActive") THEN RAISE EXCEPTION 'GYM closure and purge deadline are immutable' USING ERRCODE='23514'; END IF;
 IF NEW."closedAt" IS NOT NULL AND (NEW.type<>'GYM' OR NEW."isActive" OR NEW."purgeAfter" IS NULL OR NEW."purgeAfter">NEW."closedAt"+INTERVAL '1 month' OR NEW."purgeAfter"<=NEW."closedAt") THEN RAISE EXCEPTION 'Invalid GYM retention deadline' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gym_closure_immutable BEFORE INSERT OR UPDATE ON "Workspace" FOR EACH ROW EXECUTE FUNCTION atlasfit_gym_closure_immutable();
CREATE FUNCTION atlasfit_purge_gym_records(wid TEXT,claim TEXT) RETURNS TABLE(deleted_rows INTEGER,deleted_exclusive_users INTEGER) LANGUAGE plpgsql AS $$
DECLARE before_count INTEGER; after_count INTEGER; candidate TEXT; candidate_ids TEXT[]; removed_users INTEGER:=0;
BEGIN
 PERFORM id FROM "Workspace" WHERE id=wid AND type='GYM' AND NOT "isActive" AND "closedAt" IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GYM closure required' USING ERRCODE='23514'; END IF;
 PERFORM "workspaceId" FROM "GymPurgeJob" WHERE "workspaceId"=wid AND status='PROCESSING' AND "leaseToken"=claim AND "leaseExpiresAt">(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AND "storageCompletedAt" IS NOT NULL AND "legacyScanComplete" FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Purge claim and verified storage removal required' USING ERRCODE='23514'; END IF;
 PERFORM set_config('atlasfit.gym_purge_scope',wid,TRUE);
 CREATE TEMP TABLE atlasfit_purge_targets(table_name TEXT,row_key TEXT,PRIMARY KEY(table_name,row_key)) ON COMMIT DROP;
 INSERT INTO atlasfit_purge_targets VALUES ('Workspace',wid);
${seeds}
 -- Minimized legacy payloads still have notification/audit links; do not leave their receipts behind.
 INSERT INTO atlasfit_purge_targets SELECT 'DeliveryOutbox',d.id FROM "DeliveryOutbox" d WHERE EXISTS(SELECT 1 FROM "Notification" n WHERE n."workspaceId"=wid AND (n.id=d.id OR starts_with(d."requestKey",'notification-delivery:'||n.id||':'))) OR EXISTS(SELECT 1 FROM "AuditLog" a WHERE a.entity='WORKSPACE' AND a."entityId"=wid AND a.metadata->>'deliveryId'=d.id) ON CONFLICT DO NOTHING;
 -- Also capture webhooks whose legacy resource was linked before explicit scope existed.
 INSERT INTO atlasfit_purge_targets SELECT 'PaymentWebhookEvent',e.id FROM "PaymentWebhookEvent" e WHERE e."resourceId" IN (SELECT "providerBillingId" FROM "StudentBilling" WHERE "workspaceId"=wid UNION SELECT "providerSubscriptionId" FROM "GymEnrollment" WHERE "workspaceId"=wid) ON CONFLICT DO NOTHING;
 LOOP
  SELECT COUNT(*) INTO before_count FROM atlasfit_purge_targets;
${expansion}
  SELECT COUNT(*) INTO after_count FROM atlasfit_purge_targets;
  EXIT WHEN before_count=after_count;
 END LOOP;
${checks}
 SELECT array_agg(DISTINCT user_id) INTO candidate_ids FROM (SELECT "ownerId" user_id FROM "Workspace" WHERE id=wid UNION SELECT "userId" FROM "WorkspaceMember" WHERE "workspaceId"=wid UNION SELECT "guardianUserId" FROM "GymGuardian" WHERE "workspaceId"=wid) u WHERE user_id IS NOT NULL;
 DELETE FROM "FinancialAuditLog" a WHERE EXISTS(SELECT 1 FROM atlasfit_purge_targets t WHERE a."resourceId"=t.row_key OR strpos(COALESCE(a."metadataSanitized"::TEXT,''),t.row_key)>0);
 DELETE FROM "AuditLog" a WHERE EXISTS(SELECT 1 FROM atlasfit_purge_targets t WHERE a."entityId"=t.row_key OR strpos(a.action,t.row_key)>0 OR strpos(COALESCE(a.metadata::TEXT,''),t.row_key)>0);
${deletes}
 -- Shared users and their data in other products are not tenant data to erase.
 FOREACH candidate IN ARRAY COALESCE(candidate_ids,ARRAY[]::TEXT[]) LOOP
  IF EXISTS(SELECT 1 FROM "User" WHERE id=candidate AND role<>'SUPERADMIN' AND "imageKey" IS NULL AND "image" IS NULL)
   AND NOT EXISTS(SELECT 1 FROM "Workspace" WHERE "ownerId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "WorkspaceMember" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymGuardian" WHERE "guardianUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "PaymentProviderAccount" WHERE "personalUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "StudentBilling" WHERE "studentUserId"=candidate OR "payerUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GatewayCustomer" WHERE "personalUserId"=candidate OR "studentUserId"=candidate OR "payerUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Subscription" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "Workout" WHERE "creatorId"=candidate OR "studentId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "TrainerVideo" WHERE "trainerId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "GymContractAcceptance" WHERE "signerUserId"=candidate OR "representedUserId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "ConversationParticipant" WHERE "userId"=candidate)
   AND NOT EXISTS(SELECT 1 FROM "User" WHERE "referredById"=candidate)
${remainingUserGuards}
${scopedIdentityGuards}
   AND NOT EXISTS(SELECT 1 FROM "AuditLog" WHERE "userId"=candidate OR "entityId"=candidate)
  THEN
   DELETE FROM "PasswordResetToken" WHERE email=(SELECT email FROM "User" WHERE id=candidate);
   DELETE FROM "AuditLog" WHERE "userId"=candidate OR "entityId"=candidate;
   DELETE FROM "User" WHERE id=candidate;
   removed_users:=removed_users+1;
  END IF;
 END LOOP;
 RETURN QUERY SELECT after_count,removed_users;
END $$;
COMMIT;
`;
for(const base of ['prisma/migrations','prisma/baseline-migrations']){const dir=base+'/20261009230000_gym_scheduled_purge';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/migration.sql',sql);}
console.log(JSON.stringify({scopedTables:scoped.length,deleteOrder:ordered.map(row=>row.name)}));
