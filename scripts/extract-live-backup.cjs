// Extracts StudyFlow localStorage data from a Chromium leveldb .log file
// (the file used by the nativefier/Electron desktop app) and writes a fresh
// studyflow backup JSON in the same schema as the in-app export.
const fs = require('fs');
const path = require('path');

const LOG = process.argv[2] || path.join(process.env.APPDATA, 'myapp-nativefier-a7f646', 'Local Storage', 'leveldb', '000003.log');
const OUT_DIR = process.argv[3] || '.';

if (!fs.existsSync(LOG)) {
  console.error('LOG NOT FOUND:', LOG);
  process.exit(1);
}
console.log('Reading:', LOG, fs.statSync(LOG).size, 'bytes');

const buf = fs.readFileSync(LOG);

// Map of storage key substring -> backup field name
const FIELDS = [
  ['ss:ahamed_akeem:class-sessions', 'classSessions'],
  ['ss:ahamed_akeem:school-periods', 'schoolPeriods'],
  ['ss:ahamed_akeem:notes', 'notes'],
  ['ss:ahamed_akeem:files', 'files'],
  ['ss:ahamed_akeem:pomodoro-sessions', 'pomodoroSessions'],
  ['ss:ahamed_akeem:revision-plans', 'revisionPlans'],
];

// Captures a JSON value starting at `start` (the first '[' or '{').
// Handles nested brackets and escaped quotes inside strings.
function captureJson(buf, start) {
  let i = start;
  const n = buf.length;
  let depth = 0;
  let inString = false;
  let opened = false;
  for (; i < n; i++) {
    const c = buf[i];
    if (inString) {
      if (c === 0x5c) { i++; continue; } // backslash escape
      if (c === 0x22) inString = false;   // closing quote
      continue;
    }
    if (c === 0x22) { inString = true; opened = true; continue; }
    if (c === 0x7b || c === 0x5b) { depth++; opened = true; continue; } // { [
    if (c === 0x7d || c === 0x5d) { depth--; if (depth === 0 && opened) return i + 1; continue; } // } ]
    if (!opened && (c === 0x0a || c === 0x00)) continue;
  }
  return -1;
}

function extract(key) {
  const kb = Buffer.from(key, 'utf8');
  const results = [];
  let idx = -1;
  // take the LAST occurrence — the most recent write in the log
  while ((idx = buf.indexOf(kb, idx + 1)) !== -1) {
    // scan for the value start after the key
    for (let j = idx + kb.length; j < Math.min(idx + kb.length + 4000000, buf.length); j++) {
      const c = buf[j];
      if (c === 0x5b || c === 0x7b) { // [ or {
        const end = captureJson(buf, j);
        if (end > j) {
          const raw = buf.toString('utf8', j, end);
          try {
            const parsed = JSON.parse(raw);
            results.push(parsed);
          } catch { /* not valid json — keep scanning */ }
        }
        break;
      }
    }
  }
  return results;
}

const backup = {
  version: 1,
  exportedAt: new Date().toISOString(),
  classSessions: [],
  schoolPeriods: [],
  notes: [],
  files: [],
  pomodoroSessions: [],
  revisionPlans: [],
};

let found = 0;
for (const [key, field] of FIELDS) {
  const vals = extract(key);
  if (vals.length > 0) {
    backup[field] = vals[vals.length - 1];
    found++;
    const len = Array.isArray(backup[field]) ? backup[field].length : 'n/a';
    console.log(`✓ ${field}: ${len} item(s)`);
  } else {
    console.log(`✗ ${field}: not found in log`);
  }
}

// Also capture settings + users for reference
for (const [key, field] of [['ss-settings', 'settings'], ['ss-users', 'users']]) {
  const vals = extract(key);
  if (vals.length > 0) {
    backup[field] = vals[vals.length - 1];
    console.log(`✓ ${field}: captured`);
  }
}

const out = path.join(OUT_DIR, `studyflow-backup-${new Date().toISOString().split('T')[0]}-live.json`);
fs.writeFileSync(out, JSON.stringify(backup, null, 2));
console.log('\nWROTE:', out, fs.statSync(out).size, 'bytes');
console.log('SUMMARIES:');
for (const [, field] of FIELDS) {
  const v = backup[field];
  console.log(`  ${field}: ${Array.isArray(v) ? v.length : 'n/a'}`);
}
