const fs = require('node:fs');
const ts = require('typescript');
const changes = [
 ['src/modules/workspaces/application/gym-financial-service.ts', 'resolveEffectivePayer', '{ return resolveGymPayer(workspaceId, params); }', 'import { resolveGymPayer } from "./payer-service";'],
 ['src/modules/workspaces/application/invoice-service.ts', 'createInvoice', '{ return this.serializeInvoice(await issueManualInvoice(input)); }', 'import { issueManualInvoice } from "./manual-invoice-service";'],
 ['src/modules/workspaces/application/subscription-service.ts', 'setupEnrollmentSubscription', '{ return manualSubscriptionService.setup(input); }', 'import { manualSubscriptionService } from "./manual-subscription-service";'],
 ['src/modules/workspaces/application/subscription-service.ts', 'generateCycleInvoice', '{ return manualSubscriptionService.cycle(input); }', 'import { manualSubscriptionService } from "./manual-subscription-service";'],
 ['src/modules/workspaces/application/subscription-service.ts', 'cancelSubscription', '{ return manualSubscriptionService.stop(input); }', 'import { manualSubscriptionService } from "./manual-subscription-service";'],
 ['src/modules/workspaces/application/subscription-service.ts', 'reconcileSubscription', '{ rejectActiveGymGateway(); }', 'import { rejectActiveGymGateway } from "../domain/gateway-policy";'],
 ['src/modules/workspaces/application/enrollment-service.ts', 'activateEnrollment', '{ return GymEnrollmentService.serializeEnrollment(await activateGymEnrollment(input)); }', 'import { activateGymEnrollment } from "./enrollment-activation";'],
 ['src/modules/workspaces/application/staff-service.ts', 'inviteStaffMember', '{ return inviteGymStaff(input); }', 'import { inviteGymStaff, acceptGymStaffInvitation, updateGymStaff } from "./staff-mutations";'],
 ['src/modules/workspaces/application/staff-service.ts', 'acceptInvitation', '{ return acceptGymStaffInvitation(rawToken, userId); }', 'import { inviteGymStaff, acceptGymStaffInvitation, updateGymStaff } from "./staff-mutations";'],
 ['src/modules/workspaces/application/staff-service.ts', 'updateStaffMember', '{ return updateGymStaff(input); }', 'import { inviteGymStaff, acceptGymStaffInvitation, updateGymStaff } from "./staff-mutations";'],
];
for (const [file, method, body, imports] of changes) {
 let source = fs.readFileSync(file,'utf8');
 const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 let found;
 function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(ast) === method) found = node; ts.forEachChild(node,visit); }
 visit(ast);
 if (!found?.body) throw new Error(`Method missing: ${method}`);
 source = source.slice(0,found.body.getStart(ast)) + body + source.slice(found.body.end);
 if (!source.includes(imports)) source = imports+'\n'+source;
 fs.writeFileSync(file,source);
}
const file = 'src/modules/workspaces/application/subscription-service.ts';
let source = fs.readFileSync(file,'utf8').replace(/import \{ AsaasAdapter \} from [^;]+;\r?\n/, '').replace(/  private asaasAdapter = new AsaasAdapter\(\);\r?\n/, '');
fs.writeFileSync(file, source);
