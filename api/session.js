'use strict';
/* Facilitator only. Saves this session's record and, for a recurring room, starts the next session:
   open issues, open to-dos, Rocks and scorecard measures carry over. Everything else is cleared. */
const L = require('./_lib');
const Rooms = require('./_rooms');

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ code: 'invalid_argument' });
  try {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const rid = String(b.rid || '');
    const g = await L.gate(req, res, rid); if (!g) return;
    if (g.s.role !== 'lead') return res.status(403).json({ code: 'forbidden', message: 'Only a facilitator can end the session.' });
    const meta = await L.getMeta(rid, true);
    const record = typeof b.record === 'string' ? b.record : '';
    if (b.a === 'next') {
      if (!meta.recurring) throw L.bad('This room is not a recurring meeting.');
      if (b.sess && Number(b.sess) !== meta.sess) throw L.bad('Another facilitator already started the next session. Reload.');
      const sess = await Rooms.rollover(rid, meta, record);
      return res.status(200).json({ ok: true, sess: sess });
    }
    if (b.a === 'save') {
      if (record) await L.R([['RPUSH', L.rp(rid) + 'rec', await Rooms.recordEntry(rid, meta, record)]]);
      return res.status(200).json({ ok: true });
    }
    throw L.bad('Unknown action');
  } catch (e) {
    res.status(e.status || 500).json({ code: e.code || 'unavailable', message: e.message });
  }
};
