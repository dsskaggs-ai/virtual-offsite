'use strict';
const L = require('./_lib');
const page = require('./page');
const Mail = require('./_mail');

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const out = { adminPasscodeSet: !!L.env('ADMIN_PASSCODE'), sessionSecretSet: !!L.env('SESSION_SECRET'), redisEnv: L.redisReady(), emailConfigured: Mail.configured(), page: 'ok', redis: 'not checked' };
  try { page.loadApp(); } catch (e) { out.page = e.message; }
  if (L.redisReady()) { try { await L.R([['PING']]); out.redis = 'ok'; } catch (e) { out.redis = 'error'; } }
  res.status(200).json(out);
};
