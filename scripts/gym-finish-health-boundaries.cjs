const fs=require('node:fs'),path=require('node:path');
function edit(p,f){const s=fs.readFileSync(p,'utf8'),n=f(s);if(n!==s)fs.writeFileSync(p,n);}
function files(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(p,e.name)):[path.join(p,e.name)]);}
// Exceptions supplied by infrastructure can contain query values and request payloads.
for(const p of [...files('src/app/api/gym'),...files('src/app/api/student')].filter(p=>p.endsWith('.ts'))) edit(p,s=>s.replace(/(console\.(?:error|warn)\([^;\r\n]*?), (error|err|e)\);/g,'$1, { errorType: $2 instanceof Error ? $2.name : "UnknownError" });').replace(/message: error\.message \|\| ("[^"]*")/g,'message: $1'));
for(const name of ['feedbacks','workouts','history']) edit(`src/app/api/student/${name}/route.ts`,s=>{
  if(!s.includes('getStudentWorkspaceMember'))s='import { getStudentWorkspaceMember } from "@/lib/student-auth";\n'+s;
  s=s.replace(/await prisma\.workspaceMember\.findFirst\(\{\s*where: \{\s*userId: session\.user\.id,\s*role: "STUDENT",\s*isActive: true,\s*\},\s*\}\)/g,'await getStudentWorkspaceMember(session.user.id)');
  if(!s.includes('import { authorizeGymStudent }'))s='import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";\nimport { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";\n'+s;
  s=s.replace(/const workspaceId = member.workspaceId;/g,'const workspaceId = member.workspaceId;\n    if (member.workspace.type === "GYM") await authorizeGymStudent(workspaceId, member.id, session.user.id, req.method === "GET" ? "workouts.read" : "workouts.manage.assigned", { allowSelf: true });');
  s=s.replace(/\} catch \(error(?:: any)?\) \{/g,'} catch (error) {\n    const denied = handleWorkspaceAccessError(error); if (denied) return denied;');
  return s;
});
edit('src/app/(gym)/gym/students/students-client.tsx',s=>{
  s='import { GymStudentHealth } from "@/components/privacy/gym-student-health";\n'+s;
  return s.replace('          {selectedStudent?.isMinor && canManageStudents',`          {selectedStudent?.canReadHealth && <GymStudentHealth key={selectedStudent.id} workspaceId={workspaceId} memberId={selectedStudent.id} canEdit={editHealth} />}
          {selectedStudent?.isMinor && canManageStudents`);
});
edit('src/modules/workspaces/application/gym-assessment-service.ts',s=>s.replace('...(healthAllowed ? {} : { category: { not: "exames" } })','...(healthAllowed ? {} : { id: "__HEALTH_ACCESS_REQUIRED__" })').replace('file.category === "exames" ? "health.manage.assigned" : "workouts.manage.assigned"','"health.manage.assigned"'));
edit('src/modules/workspaces/application/student-file-mutations.ts',s=>s.replace('input.category === "exames" ? "health.manage.assigned" : "workouts.manage.assigned"','"health.manage.assigned"'));
edit('src/lib/storage-access.ts',s=>s.replace('file.category === "exames"','true'));
