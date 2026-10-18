'use strict';
/* Walk-in join with the room code and a name. Always joins as a member. */
const L = require('./_lib');

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ code: 'invalid_argument' });
  try {
    if (!L.redisReady()) return res.status(503).json({ code: 'not_configured', message: 'The shared database is not connected yet.' });
    if (await L.tooManyTries(req)) return res.status(429).json({ code: 'rate_limited', message: 'Too many tries. Wait ten minutes.' });
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const rid = String(b.rid || ''), code = String(b.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const m = await L.getMeta(rid, true);
    if (!m || m.status === 'closed' || !name || !code || !L.safeEq(code, m.code)) {
      await L.noteFailure(req);
      return res.status(401).json({ code: 'bad_code', message: !name ? 'Type your name.' : 'That code did not work.' });
    }
    L.grantRoom(res, rid, 'member', name);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ code: e.code || 'unavailable', message: e.message });
  }
};
