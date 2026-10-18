'use strict';
/* Small builders shared by the templates. A template is plain data: days, scenes, tools. */
const GATE_ALL = ['owner', 'finish', 'leading', 'source', 'tradeoff'];

function typeRow(k) { return { k: k, label: 'Type', type: 'select', choices: ['Lagging result', 'Leading behavior'], blank: 'Choose type' }; }
/* Two Critical Numbers that counterbalance each other. Keys are fixed (c1*, c2*, balance) so the read-back and the record can find them. */
function crit(id, title, help, extraRows) {
  const rows = [
    { k: 'h1', type: 'head', label: 'Critical Number 1' }, typeRow('c1type'),
    { k: 'c1name', label: 'Measure', type: 'text' }, { k: 'c1cel', label: 'Celebrate at', type: 'text' }, { k: 'c1goal', label: 'Goal', type: 'text' }, { k: 'c1dis', label: 'Disappointing at', type: 'text' },
    { k: 'h2', type: 'head', label: 'Critical Number 2' }, typeRow('c2type'),
    { k: 'c2name', label: 'Measure', type: 'text' }, { k: 'c2cel', label: 'Celebrate at', type: 'text' }, { k: 'c2goal', label: 'Goal', type: 'text' }, { k: 'c2dis', label: 'Disappointing at', type: 'text' },
    { k: 'h3', type: 'head', label: 'How the two counterbalance' },
    { k: 'balance', label: 'What each one stops the other from sacrificing', type: 'area', wide: true, ph: 'Example: margin keeps volume honest, and volume keeps margin from hiding in a shrinking base' }
  ].concat(extraRows || []);
  return { k: 'form', id: id, title: title, help: help || 'Two numbers that counterbalance each other. Name both, set the three thresholds on each, then say how they keep each other honest.', rows: rows };
}
function roles(id) {
  return { k: 'form', id: id, title: 'Roles for this meeting', rows: [
    { k: 'facilitator', label: 'Facilitator', type: 'select', choices: 'roster' }, { k: 'scribe', label: 'Scribe on this page', type: 'select', choices: 'roster' },
    { k: 'timekeeper', label: 'Timekeeper', type: 'select', choices: 'roster' }, { k: 'logowner', label: 'Decision log owner', type: 'select', choices: 'roster' }] };
}
function cadence(id, title) {
  return { k: 'form', id: id, title: title || 'Rhythm', rows: [
    { k: 'day', label: 'Weekly team meeting, day and time', type: 'text', ph: 'Day, time, length' },
    { k: 'daily', label: 'Daily huddle', type: 'text', ph: 'Time and length, or none' },
    { k: 'cutoff', label: 'Scorecard input cutoff', type: 'text', ph: 'Day and time' },
    { k: 'escalation', label: 'Escalation rule', type: 'area', wide: true, ph: 'What triggers a recovery plan, and who gets it' },
    { k: 'cascade', label: 'Message to the rest of the company', type: 'area', wide: true },
    { k: 'cascadeowner', label: 'Who delivers it', type: 'select', choices: 'roster' },
    { k: 'cascadedue', label: 'Delivered by', type: 'date' }] };
}
const pair = function (k, label, help) { const r = { k: k, label: label, type: 'pair' }; if (help) r.help = help; return r; };
module.exports = { GATE_ALL, crit, roles, cadence, pair };
