'use strict';
const L = require('./_lib');

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ code: 'invalid_argument' });
  try {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const rid = String(b.rid || '');
    const g = await L.gate(req, res, rid); if (!g) return;
    const ops = Array.isArray(b.ops) ? b.ops : null;
    if (!ops || !ops.length || ops.length > 25) throw L.bad('Send between 1 and 25 operations');
    for (const op of ops) await L.writeOp(rid, op, g.s.role);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ code: e.code || 'unavailable', message: e.message });
  }
};
