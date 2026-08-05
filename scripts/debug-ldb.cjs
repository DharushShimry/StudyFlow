const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const buf = fs.readFileSync(file);
console.log('file size:', buf.length);

const footer = buf.subarray(buf.length - 48);
console.log('footer hex:', footer.toString('hex'));

// magic
const magic = footer.subarray(40);
console.log('magic ok:', magic.readUInt32LE(0) === 0x8b80fb57 >>> 0, 'hex:', magic.toString('hex'));

function readVarint(b, p) {
  let result = 0, shift = 0;
  while (true) {
    const x = b[p++];
    result |= (x & 0x7f) << shift;
    if (!(x & 0x80)) break;
    shift += 7;
  }
  return [result, p];
}

let [idxOff, p1] = readVarint(footer, 10);
let [idxSize, p2] = readVarint(footer, p1);
console.log('index handle: offset', idxOff, 'size', idxSize, '(parsed from footer pos', p1, p2, ')');

const indexBlock = buf.subarray(idxOff, idxOff + idxSize);
console.log('index block size:', indexBlock.length);
console.log('index block first 32 bytes:', indexBlock.subarray(0, 32).toString('hex'));
console.log('index block compression byte:', indexBlock[0]);

// Try reading index entries assuming uncompressed payload after the compression byte
const payload = indexBlock.subarray(1);
const numRestarts = payload.readUInt32LE(payload.length - 4);
console.log('numRestarts:', numRestarts, 'restart area:', 4 + numRestarts * 4, 'payload len:', payload.length - 4 - numRestarts * 4);

let pos = 0;
const end = payload.length - 4 - numRestarts * 4;
let count = 0;
while (pos < end) {
  const [shared, q1] = readVarint(payload, pos);
  const [nonShared, q2] = readVarint(payload, q1);
  const [valueLen, q3] = readVarint(payload, q2);
  const key = payload.subarray(q3, q3 + nonShared);
  const value = payload.subarray(q3 + nonShared, q3 + nonShared + valueLen);
  console.log(`entry ${count}: shared=${shared} nonShared=${nonShared} valLen=${valueLen} key="${key.toString('utf8').slice(0, 60)}" valHex=${value.subarray(0, 16).toString('hex')}`);
  if (count++ > 6) break;
  pos = q3 + nonShared + valueLen;
}
