#!/usr/bin/env node
'use strict';
/* Splits dist/app.html into checksummed parts (p01.html ...) and adds host-shim.js and console.html.
   The server refuses to serve a page whose checksums do not match, and /api/health reports it.
   usage: node tools/build-parts.js [app=dist/app.html] [outDir=parts] [parts=8] */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const src = path.resolve(process.argv[2] || path.join(root, 'dist', 'app.html'));
const out = path.resolve(process.argv[3] || path.join(root, 'parts'));
const n = Number(process.argv[4] || 8);
const sha = s => crypto.createHash('sha1').update(s, 'utf8').digest('hex');
const page = fs.readFileSync(src, 'utf8');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const lines = page.split(/(?<=\n)/), per = Math.ceil(lines.length / n), files = [];
for (let i = 0; i < n; i++) {
  const chunk = lines.slice(i * per, (i + 1) * per).join(''); if (!chunk) continue;
  const name = 'p' + String(i + 1).padStart(2, '0') + '.html';
  fs.writeFileSync(path.join(out, name), chunk, 'utf8'); files.push({ n: name, sha1: sha(chunk), bytes: Buffer.byteLength(chunk) });
}
for (const [from, to] of [[path.join(root, 'src', 'host-shim.js'), 'host-shim.js'], [path.join(root, 'dist', 'console.html'), 'console.html']]) {
  const txt = fs.readFileSync(from, 'utf8');
  fs.writeFileSync(path.join(out, to), txt, 'utf8'); files.push({ n: to, sha1: sha(txt), bytes: Buffer.byteLength(txt) });
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ files }, null, 1));
const joined = files.filter(f => /^p\d+\.html$/.test(f.n)).map(f => fs.readFileSync(path.join(out, f.n), 'utf8')).join('');
if (joined !== page) { console.error('Round trip mismatch'); process.exit(2); }
console.log('parts:', files.length, 'files, app bytes:', Buffer.byteLength(page));
