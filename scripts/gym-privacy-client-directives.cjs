const fs = require('node:fs');
for (const file of ['src/app/(gym)/gym/settings/settings-client.tsx', 'src/app/(gym)/gym/students/students-client.tsx', 'src/components/privacy/privacy-center-tab.tsx']) {
 const old = fs.readFileSync(file, 'utf8');
 if (!old.includes('"use client";')) throw Error('Missing directive: ' + file);
 fs.writeFileSync(file, '"use client";\n' + old.replace('"use client";', '').trimStart());
}
