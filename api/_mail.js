'use strict';
/* Optional email through Resend's REST API. With no RESEND_API_KEY the invite is not sent and the organizer gets the link to copy.
   MAIL_API_URL can point at a test server. */
const L = require('./_lib');

function configured() { return !!(L.env('RESEND_API_KEY') && L.env('MAIL_FROM')); }
function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

async function post(payload) {
  const url = L.env('MAIL_API_URL') || 'https://api.resend.com/emails';
  const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + L.env('RESEND_API_KEY'), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  let j = {}; try { j = await r.json(); } catch (e) { }
  return { ok: r.ok, status: r.status, id: j.id, message: j.message || j.error || '' };
}
async function send(msg) {
  if (!configured()) return { sent: false, skipped: true, reason: 'Email is not set up on this server.' };
  const payload = { from: L.env('MAIL_FROM'), to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text };
  if (msg.replyTo) payload.reply_to = msg.replyTo;
  try {
    let r = await post(Object.assign({}, payload, msg.ics ? { attachments: [{ filename: 'meeting.ics', content: Buffer.from(msg.ics).toString('base64') }] } : {}));
    if (!r.ok && msg.ics && r.status >= 400 && r.status < 500) r = await post(payload);
    return r.ok ? { sent: true, id: r.id } : { sent: false, reason: r.message || ('Mail service said ' + r.status) };
  } catch (e) { return { sent: false, reason: 'Could not reach the mail service.' }; }
}

function inviteContent(o) {
  /* o: {name, title, tname, when, link, code, base, org} */
  const subject = 'You are invited: ' + o.title;
  const text = ['Hi ' + o.name + ',', '', (o.org ? o.org + ' is' : 'You are') + ' meeting' + (o.when ? ' on ' + o.when : '') + '.', o.title + ' (' + o.tname + ')', '',
    'Your personal link, no password needed:', o.link, '', 'This link is yours. Please do not forward it.' + (o.code ? ' If you lose it, the room code ' + o.code + ' and your name will also get you in at ' + o.base + '.' : ''), ''].join('\n');
  const html = '<div style="font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#1B241D;max-width:34rem">' +
    '<p>Hi ' + esc(o.name) + ',</p>' +
    '<p>' + esc(o.org ? o.org + ' is' : 'You are') + ' meeting' + (o.when ? ' on <b>' + esc(o.when) + '</b>' : '') + '.</p>' +
    '<p style="margin:0 0 .2rem"><b>' + esc(o.title) + '</b></p><p style="margin:0 0 1rem;color:#475046">' + esc(o.tname) + '</p>' +
    '<p><a href="' + esc(o.link) + '" style="display:inline-block;background:#2C5E3B;color:#fff;text-decoration:none;padding:.7rem 1.1rem;border-radius:.5rem;font-weight:600">Open the room</a></p>' +
    '<p style="color:#475046;font-size:13px">Your personal link, no password needed:<br>' + esc(o.link) + '<br><br>This link is yours. Please do not forward it.' +
    (o.code ? ' If you lose it, the room code <b>' + esc(o.code) + '</b> and your name will also get you in at ' + esc(o.base) + '.' : '') + '</p></div>';
  return { subject: subject, text: text, html: html };
}

module.exports = { configured, send, inviteContent, esc };
