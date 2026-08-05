const fs = require('fs');

const file = process.argv[2] || 'studyflow-backup-2026-06-29.json';
if (!fs.existsSync(file)) {
  console.log('NOT FOUND:', file);
  process.exit(1);
}

const d = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('exportedAt:', d.exportedAt);
console.log('version:', d.version);
console.log('classSessions:', Array.isArray(d.classSessions) ? d.classSessions.length : 0);
console.log('schoolPeriods:', Array.isArray(d.schoolPeriods) ? d.schoolPeriods.length : 0);
console.log('notes:', Array.isArray(d.notes) ? d.notes.length : 0);
console.log('files:', Array.isArray(d.files) ? d.files.length : 0);
console.log('pomodoroSessions:', Array.isArray(d.pomodoroSessions) ? d.pomodoroSessions.length : 0);
console.log('revisionPlans:', Array.isArray(d.revisionPlans) ? d.revisionPlans.length : 0);

if (Array.isArray(d.notes) && d.notes.length) {
  console.log('\n-- sample note titles --');
  d.notes.slice(0, 8).forEach(n => console.log('  •', (n.title || n.subject || 'untitled').toString().slice(0, 60)));
}
if (Array.isArray(d.files) && d.files.length) {
  console.log('\n-- files --');
  d.files.slice(0, 12).forEach(f => console.log('  •', (f.name || 'unnamed').toString().slice(0, 60), '|', f.size || '', '|', f.subject || ''));
}
if (Array.isArray(d.classSessions) && d.classSessions.length) {
  const subjects = {};
  d.classSessions.forEach(c => { const k = c.subject || '?'; subjects[k] = (subjects[k] || 0) + 1; });
  console.log('\n-- class sessions by subject --');
  Object.entries(subjects).forEach(([k, v]) => console.log('  •', k, '×', v));
}
