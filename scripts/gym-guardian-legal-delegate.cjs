const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/modules/workspaces/application/minor-service.ts';
let code = fs.readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let target;
function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(source) === 'recordMinorLegalAcceptance') target = node; ts.forEachChild(node, visit); }
visit(source);
if (!target) throw Error('Método de aceite não encontrado.');
const replacement = 'async recordMinorLegalAcceptance(params: { workspaceId: string; guardianId: string; guardianUserId: string; documentType: LegalDocumentType; documentId?: string; accepted?: boolean; documentVersion?: string; ipAddress?: string | null; userAgent?: string | null }) { return recordGuardianLegalAcceptance(params); }';
code = code.slice(0, target.getStart(source)) + replacement + code.slice(target.end);
code = code.replace('import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";\r\n', '').replace('import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";\n', '').replace('LegalDocumentType, LegalAcceptanceType', 'LegalDocumentType');
if (!code.includes('import { recordGuardianLegalAcceptance }')) code = 'import { recordGuardianLegalAcceptance } from "./guardian-legal-commands";\n' + code;
fs.writeFileSync(file, code);
