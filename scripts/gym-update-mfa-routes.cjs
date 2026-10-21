// One-time source migration; exact route files only, no environment/provider access.
const fs = require('node:fs');
const base = 'src/app/api/superadmin/security/totp/';
const pair = 'import { handleMfaMutation, mfaPairBody } from "@/lib/auth/mfa-settings-http";\nexport function POST(request: Request) { return handleMfaMutation(request, mfaPairBody, ({ reauthenticationProof: _proof, ...body }) => ({ operation: "PAIR", ...body })); }\n';
fs.writeFileSync(base + 'verify/route.ts', pair);
fs.writeFileSync(base + 'disable/route.ts', 'import { handleMfaMutation, mfaDisableBody } from "@/lib/auth/mfa-settings-http";\nexport function POST(request: Request) { return handleMfaMutation(request, mfaDisableBody, () => ({ operation: "DISABLE" })); }\n');
fs.writeFileSync(base + 'devices/[id]/route.ts', 'import { handleMfaMutation, mfaDisableBody } from "@/lib/auth/mfa-settings-http";\nexport async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleMfaMutation(request, mfaDisableBody, () => ({ operation: "REMOVE", deviceId: id })); }\n');
fs.writeFileSync(base + 'toggle-3fa/route.ts', 'import { handleMfaMutation, mfaThreeFactorBody } from "@/lib/auth/mfa-settings-http";\nexport function POST(request: Request) { return handleMfaMutation(request, mfaThreeFactorBody, body => ({ operation: "THREE_FACTOR", enabled: body.enabled })); }\n');
const deviceFile = base + 'devices/route.ts'; let devices = fs.readFileSync(deviceFile, 'utf8');
devices = devices.replace('import { mutateMfaSettings } from "@/lib/auth/mfa-settings-service";', 'import { handleMfaMutation, mfaPairBody } from "@/lib/auth/mfa-settings-http";').replace('import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";\r\n', '').replace('import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";\n', '');
const position = devices.indexOf('export async function POST(req: Request)'); if (position < 0) throw new Error('POST route missing.');
fs.writeFileSync(deviceFile, devices.slice(0, position) + pair.split('\n').slice(1).join('\n'));
