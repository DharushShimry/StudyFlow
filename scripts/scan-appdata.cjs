const fs = require('fs');
const path = require('path');

const roaming = process.env.APPDATA;
const dirs = fs.readdirSync(roaming, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .filter(d => /nativefier|study|space|flow/i.test(d.name));

const DATA_KEYS = [
  'ss:ahamed_akeem:class-sessions',
  'ss:ahamed_akeem:school-periods',
  'ss:ahamed_akeem:notes',
  'ss:ahamed_akeem:files',
  'ss:ahamed_akeem:pomodoro-sessions',
  'ss:ahamed_akeem:revision-plans',
  'ss-class-sessions',
  'ss-school-periods',
  'ss-notes',
  'ss-files',
];

for (const d of dirs) {
  const appDir = path.join(roaming, d.name);
  const lsDir = path.join(appDir, 'Local Storage', 'leveldb');
  const idbDir = path.join(appDir, 'IndexedDB');
  let logBytes = 0;
  const logFiles = [];
  if (fs.existsSync(lsDir)) {
    for (const f of fs.readdirSync(lsDir)) {
      const p = path.join(lsDir, f);
      const s = fs.statSync(p);
      if (s.isFile()) { logBytes += s.size; if (/\.log$/.test(f)) logFiles.push(f); }
    }
  }
  let idbDbs = [];
  if (fs.existsSync(idbDir)) {
    idbDbs = fs.readdirSync(idbDir).filter(n => /indexeddb\.leveldb$/.test(n));
  }
  const line = [`${d.name}`, `ls=${(logBytes / 1024).toFixed(0)}KB`, idbDbs.length ? `idb=${idbDbs.length}` : 'idb=0'];
  console.log(line.join('  |  '));

  if (logBytes > 0 && logFiles.length) {
    // Look for data keys in the log(s)
    for (const lf of logFiles) {
      const buf = fs.readFileSync(path.join(lsDir, lf));
      const found = [];
      for (const k of DATA_KEYS) {
        if (buf.includes(Buffer.from(k, 'utf8'))) found.push(k.replace('ss:ahamed_akeem:', 'ss:u:').replace('ss-', 'ss-'));
      }
      if (found.length) console.log('    ', lf, '→', found.join(', '));
    }
  }
  if (idbDbs.length) {
    for (const db of idbDbs) console.log('    idb:', db);
  }
}
