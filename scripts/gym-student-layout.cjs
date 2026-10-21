const fs = require('node:fs');
const file = 'src/app/(student)/layout.tsx';
let source = fs.readFileSync(file, 'utf8');
source = source.replace('import { cookies } from "next/headers";', 'import { getStudentWorkspaceMember } from "@/lib/student-auth";\nimport { normalizeWorkspaceColor, brandingForeground } from "@/modules/workspaces/domain/branding";');
const start = source.indexOf('  const role =');
const end = source.indexOf('  // Se for superadmin', start);
if (start < 0 || end < 0) throw new Error('Guard markers missing');
source = source.slice(0, start) + '  const member = await getStudentWorkspaceMember(session.user.id);\n  if (!member) redirect("/select-workspace");\n  const activeWorkspace = member.workspace;\n' + source.slice(end);
source = source.replaceAll('!(session?.user as any)?.isImpersonated', '!session.user.isImpersonated');
source = source.replace('    if (user && !user.onboarded) {', '    if (user && !user.onboarded && activeWorkspace.type === "PERSONAL") {');
const brandStart = source.indexOf('  // Fetch active workspace');
const brandEnd = source.indexOf('  return (', brandStart);
if (brandStart < 0 || brandEnd < 0) throw new Error('Brand markers missing');
source = source.slice(0, brandStart) + `  const workspaceData = {
    id: activeWorkspace.id, name: activeWorkspace.name, slug: activeWorkspace.slug, type: activeWorkspace.type,
    logo: activeWorkspace.name.slice(0, 2).toUpperCase(), logoUrl: activeWorkspace.logoUrl,
    primaryColor: normalizeWorkspaceColor(activeWorkspace.primaryColor), plan: activeWorkspace.type === "GYM" ? "Academia" : "Personal",
    slogan: activeWorkspace.slogan, workoutCoverUrl: activeWorkspace.workoutCoverUrl, watermarkUrl: activeWorkspace.watermarkUrl,
  };

` + source.slice(brandEnd);
source = source.replace('backgroundColor: activeWorkspace.primaryColor || "var(--primary)",', 'backgroundColor: workspaceData.primaryColor,\n                    color: brandingForeground(workspaceData.primaryColor),');
source = source.replace('style={{ color: activeWorkspace.primaryColor || "var(--primary)" }}', 'style={{ color: workspaceData.primaryColor }}');
source = source.replace('"Assessoria Esportiva"', '(activeWorkspace.type === "GYM" ? "Academia" : "Assessoria Esportiva")');
fs.writeFileSync(file, source);
