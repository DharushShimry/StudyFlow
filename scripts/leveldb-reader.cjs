// Minimal pure-JS LevelDB reader for Chromium Local Storage.
// Parses .ldb sstable files (footer -> index -> data blocks, with snappy
// decompression) and .log memtable files, then writes all entries as JSON.
// This is read-only: it never modifies the leveldb directory.
const fs = require('fs');
const path = require('path');

const DIR = process.argv[2];
if (!DIR || !fs.existsSync(DIR)) { console.error('usage: node leveldb-reader.cjs <leveldb dir> [out.json]'); process.exit(1); }
const OUT = process.argv[3] || 'leveldb-dump.json';

// ---------- varint ----------
function readVarint(buf, pos) {
  let result = 0, shift = 0, b;
  do {
    b = buf[pos++];
    result |= (b & 0x7f) << shift;
    shift += 7;
  } while (b & 0x80);
  return [result, pos];
}

// ---------- snappy decompression ----------
function snappyDecompress(input) {
  const out = [];
  let pos = 0;
  const len = input.length;
  while (pos < len) {
    const tag = input[pos++];
    const type = tag & 3;
    if (type === 0) {
      let l = tag >> 2;
      if (l >= 60) {
        const bytes = l - 59;
        l = 0;
        for (let i = 0; i < bytes; i++) l |= input[pos++] << (8 * i);
      }
      l += 1;
      for (let i = 0; i < l; i++) out.push(input[pos++]);
    } else if (type === 1) {
      const length = ((tag >> 2) & 0x7) + 4;
      const offset = ((tag >> 5) << 8) | input[pos++];
      for (let i = 0; i < length; i++) out.push(out[out.length - offset]);
    } else if (type === 2) {
      const length = (tag >> 2) + 1;
      const offset = input[pos++] | (input[pos++] << 8);
      for (let i = 0; i < length; i++) out.push(out[out.length - offset]);
    } else {
      throw new Error('unsupported snappy tag type 3');
    }
  }
  return Buffer.from(out);
}

// ---------- block entry iteration (delta-encoded keys) ----------
function parseBlockEntries(payload) {
  const entries = [];
  let pos = 0;
  const n = payload.length;
  let prevKey = Buffer.alloc(0);
  while (pos < n) {
    let [shared, p1] = readVarint(payload, pos);
    let [nonShared, p2] = readVarint(payload, p1);
    let [valueLen, p3] = readVarint(payload, p2);
    if (p3 + nonShared + valueLen > n) break;
    const key = Buffer.concat([prevKey.subarray(0, shared), payload.subarray(p3, p3 + nonShared)]);
    const value = payload.subarray(p3 + nonShared, p3 + nonShared + valueLen);
    prevKey = key;
    entries.push({ key, value });
    pos = p3 + nonShared + valueLen;
  }
  return entries;
}

// ---------- read one block (handle: offset,size) from a table ----------
function readBlock(table, offset, size) {
  const block = table.subarray(offset, offset + size);
  if (block.length === 0) return { compression: 0, payload: Buffer.alloc(0) };
  const compression = block[0];
  let data = block.subarray(1);
  if (compression === 1) data = snappyDecompress(data);
  else if (compression !== 0) throw new Error('unknown block compression: ' + compression);
  // strip the restart array at the end of the block
  const numRestarts = data.readUInt32LE(data.length - 4);
  const restartArea = 4 + numRestarts * 4;
  return { compression, payload: data.subarray(0, data.length - restartArea) };
}

// ---------- parse an sstable ----------
function parseTable(table) {
  const entries = [];
  const footer = table.subarray(table.length - 48);
  if (footer.length < 48) return entries;
  const magic = footer.subarray(40);
  if (magic.length !== 8 || magic.readUInt32LE(0) !== 0x8b80fb57 >>> 0) return entries; // not a table
  let [indexOffset, p1] = readVarint(footer, 10);
  let [indexSize, p2] = readVarint(footer, p1);
  if (indexOffset + indexSize > table.length) return entries;
  const indexBlock = readBlock(table, indexOffset, indexSize);
  for (const ie of parseBlockEntries(indexBlock.payload)) {
    let [dataOffset, q1] = readVarint(ie.value, 0);
    let [dataSize, q2] = readVarint(ie.value, q1);
    if (dataOffset + dataSize > table.length) continue;
    const dataBlock = readBlock(table, dataOffset, dataSize);
    for (const e of parseBlockEntries(dataBlock.payload)) entries.push(e);
  }
  return entries;
}

// ---------- log entry parsing with prefix tracking ----------
function parseLogRecordEntries(data, prevKey) {
  const out = [];
  let pos = 0;
  let prev = prevKey;
  while (pos < data.length) {
    let [shared, p1] = readVarint(data, pos);
    let [nonShared, p2] = readVarint(data, p1);
    let [valueLen, p3] = readVarint(data, p2);
    if (p3 + nonShared > data.length) break;
    const key = Buffer.concat([prev.subarray(0, shared), data.subarray(p3, p3 + nonShared)]);
    let value = Buffer.alloc(0);
    const valuePos = p3 + nonShared;
    if (valueLen > 0 && valuePos + valueLen <= data.length) {
      value = data.subarray(valuePos, valuePos + valueLen);
    } else if (valueLen !== 0) {
      break;
    }
    out.push({ key, value, deleted: valueLen === 0 });
    prev = key;
    pos = valuePos + valueLen;
  }
  return { entries: out, prevKey: prev };
}

function parseLog(buf) {
  const entries = [];
  let pos = 0;
  let prev = Buffer.alloc(0);
  while (pos + 7 <= buf.length) {
    const length = buf.readUInt16LE(pos + 4);
    const type = buf[pos + 6];
    pos += 7;
    if (pos + length > buf.length) break;
    const data = buf.subarray(pos, pos + length);
    pos += length;
    if (type === 1) {
      const r = parseLogRecordEntries(data, prev);
      entries.push(...r.entries);
      prev = r.prevKey;
    }
    // type 2/3/4 fragments are rare for localStorage; skipped for robustness
  }
  return entries;
}

// ---------- main ----------
const fileNames = fs.readdirSync(DIR).filter(f => /\.(ldb|log)$/.test(f));
console.log('Files:', fileNames.join(', ') || '(none)');

// Process logs last so they take precedence (most recent writes).
const files = fileNames
  .map(f => ({ name: f, isLog: /\.log$/.test(f), num: parseInt(f, 10) || 0 }))
  .sort((a, b) => (a.isLog !== b.isLog ? (a.isLog ? 1 : -1) : a.num - b.num));

const all = {};
for (const f of files) {
  const buf = fs.readFileSync(path.join(DIR, f.name));
  let entries = [];
  try {
    entries = f.isLog ? parseLog(buf) : parseTable(buf);
  } catch (e) {
    console.log(`  ${f.name}: skipped (${e.message})`);
    continue;
  }
  for (const e of entries) {
    const k = e.key.toString('utf8');
    if (e.deleted) delete all[k];
    else all[k] = e.value;
  }
  console.log(`  ${f.name}: ${entries.length} entries`);
}

const dump = {};
for (const [k, v] of Object.entries(all)) dump[k] = v.toString('utf8');
fs.writeFileSync(OUT, JSON.stringify(dump, null, 1));
console.log('WROTE', OUT, 'with', Object.keys(dump).length, 'keys');
const sample = Object.keys(dump).slice(0, 40);
console.log('SAMPLE KEYS:\n' + JSON.stringify(sample, null, 1));
