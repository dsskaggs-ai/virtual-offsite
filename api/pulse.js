'use strict';
const L = require('./_lib');
const KINDS = { agree: 1, q: 1, push: 1 };

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ code: 'invalid_argument' });
  try {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const rid = String(b.rid || '');
    const g = await L.gate(req, res, rid); if (!g) return;
    if (!L.PEER_RE.test(String(b.peer || ''))) throw L.bad('Bad peer');
    const rp = L.rp(rid), now = Date.now(), cmds = [];
    if (b.presence) {
      const who = b.presence.who ? String(b.presence.who).slice(0, 40) : null;
      const scene = b.presence.scene ? String(b.presence.scene).slice(0, 40) : null;
      cmds.push(['HSET', rp + 'm', 'p:' + b.peer, JSON.stringify({ who: who, scene: scene, t: now })]);
    }
    if (b.react && KINDS[b.react.k]) {
      const who = b.react.who ? String(b.react.who).slice(0, 40) : '';
      cmds.push(['HSET', rp + 'm', 'r:' + now + '-' + Math.random().toString(36).slice(2, 7), JSON.stringify({ k: b.react.k, who: who, t: now })]);
    }
    if (cmds.length) await L.R(cmds);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ code: e.code || 'unavailable', message: e.message });
  }
};
