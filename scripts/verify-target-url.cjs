const path = require('path');
const fs = require('fs');

const __dirname = 'E:\\Software Development\\StudyFlow\\StudyFlow-win32-x64\\resources\\app\\lib';
const targetUrl = 'file://app/dist/index.html';

// Mirror of the patched main.js line
const resolved = targetUrl.startsWith('file://app/')
  ? 'file://' + path.join(__dirname, '..', targetUrl.slice('file://app/'.length)).replace(/\\/g, '/')
  : targetUrl;

console.log('resolved URL:', resolved);
const filePath = resolved.replace(/^file:\/\//, '');
console.log('file path:   ', filePath);
console.log('exists:      ', fs.existsSync(filePath));
