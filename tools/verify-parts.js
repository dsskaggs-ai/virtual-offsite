'use strict';
/* Vercel uses committed parts. Verify them without requiring Python in the cloud build. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const dir = path.join(__dirname, '..', 'parts');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const expected = ['console.html', 'host-shim.js', ...Array.from({ length: 8 }, (_, i) => 'p0' + (i + 1) + '.html')].sort();
if (JSON.stringify(manifest.files.map(f => f.n).sort()) !== JSON.stringify(expected)) throw new Error('Unexpected app parts. Run npm run build.');
for (const f of manifest.files) {
  const content = fs.readFileSync(path.join(dir, f.n), 'utf8');
  const hash = crypto.createHash('sha1').update(content, 'utf8').digest('hex');
  if (hash !== f.sha1 || Buffer.byteLength(content) !== f.bytes) throw new Error('App part differs: ' + f.n + '. Run npm run build.');
}
console.log('Verified all 10 committed app parts.');
