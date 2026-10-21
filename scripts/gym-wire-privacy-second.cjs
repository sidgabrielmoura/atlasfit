const fs=require('node:fs');
function edit(p,f){const old=fs.readFileSync(p,'utf8'),next=f(old);if(old===next)throw new Error('No change '+p);fs.writeFileSync(p,next);}
edit('src/lib/logger.ts',s=>{
  s='import { redactPrivateText } from "./privacy/log-redaction";\n'+s;
  const start=s.indexOf('export function redactSensitiveData('),end=s.indexOf('\ninterface SystemErrorParams',start);
  if(start<0||end<0)throw new Error('logger anchors');
  s=s.slice(0,start)+'export const redactSensitiveData = redactPrivateText;\n'+s.slice(end);
  return s.replace('error: any','error: unknown').replace('error instanceof Error ? error.message : String(error)','error instanceof Error ? error.name : "UnknownError"').replace(', logErr);',');');
});
edit('src/modules/workspaces/application/minor-service.ts',s=>{
  s='import { transitionGymMajority } from "./gym-majority-transition";\n'+s;
  const start=s.indexOf('  async checkMajorityTransition('),end=s.indexOf('\n}\n\nexport const minorService',start);
  if(start<0||end<0)throw new Error('minor anchors');
  return s.slice(0,start)+`  async checkMajorityTransition(workspaceId: string, studentMemberId: string, actorUserId?: string) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório para a transição coordenada.");
    return transitionGymMajority(workspaceId, studentMemberId, actorUserId);
  }`+s.slice(end);
});
