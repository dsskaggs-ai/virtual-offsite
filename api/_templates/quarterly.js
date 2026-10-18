'use strict';
const H = require('./_h');
/* Quarterly planning. Written to follow the shape of the Scaling Up one-page strategic plan (OPSP) quarterly cycle:
   look back, reset targets, pick a theme, two Critical Numbers, company Rocks, individual priorities, rhythm. */
module.exports = {
  id: 'quarterly', name: 'Quarterly planning', short: 'Quarter',
  basis: 'A one day quarterly planning meeting that turns the one page plan into the next 13 weeks.',
  blurb: 'One working day to look back at the last quarter, reset the targets, choose no more than five company priorities, name two Critical Numbers, and leave with every person owning a short list.',
  recurring: false, defaultTitle: 'Quarterly planning',
  setup: [{ k: 'horizon', label: 'Quarter ends', type: 'date', def: '+90d', help: 'Company priorities (Rocks, if you run EOS) and individual priorities default to this due date.' }],
  carry: [],
  days: [{ label: 'Planning day', items: [
    { id: 'open', title: 'Open and set the ground rules', mins: 10, out: 'Roles named, success defined, and everyone knows what must leave the room.',
      pts: ['<b>Facts before opinions.</b> Bring the number, the date, or the document.', '<b>Choices before additions.</b> Every new priority displaces something else.', '<b>One source of truth.</b> This page and the decision log.'],
      tools: [{ k: 'required' }, H.roles('roles')] },
    { id: 'lookback', title: 'Look back at last quarter', mins: 40, out: 'An honest scoreboard for the quarter that just ended, with the lesson behind each miss.',
      pts: ['<b>Numbers first.</b> Enter goal and actual for each measure. Anything off track becomes a lesson below.', '<b>Name the win and the miss</b> in one sentence each, with the evidence.', '<b>Look for the cause</b> in a process or a decision, not in a person.'],
      tools: [{ k: 'metrics', id: 'lastq', title: 'Last quarter, goal against actual', help: 'Add the measures you tracked. Mark lower-is-better where it applies.', seeds: [{ name: 'Revenue' }, { name: 'Gross margin' }, { name: 'Net profit' }, { name: 'Cash' }] },
        { k: 'wall', id: 'lessons', title: 'Wins, misses, and surprises', prompt: 'One card each. Say what happened and what proves it.', tags: ['Win', 'Miss', 'Surprise'], ph: 'What happened, in a sentence', extras: [{ k: 'x1', label: 'Evidence', ph: 'Number, date, or document' }] }] },
    { id: 'lastrocks', title: 'Score last quarter\'s priorities', mins: 15, out: 'Each priority from last quarter marked done, on track, or off track.',
      pts: ['Add last quarter\'s priorities if they are not listed. Mark each one honestly.', 'A priority is done only when the finish line was met. Partial credit goes in the note.'],
      tools: [{ k: 'rocktrack', id: 'lastrocks', title: 'Last quarter\'s priorities', noun: 'priority' }] },
    { id: 'ssk', title: 'Start, stop, keep', mins: 25, out: 'A short list of what the team starts, stops, and keeps doing next quarter.',
      pts: ['<b>Start</b> only what you can staff. <b>Stop</b> what no longer earns its place. <b>Keep</b> what is working so nobody breaks it by accident.', 'Vote at the end. The top items feed the priorities.'],
      tools: [{ k: 'wall', id: 'ssk', title: 'Start, stop, keep', prompt: 'One card per item.', tags: ['Start', 'Stop', 'Keep'], ph: 'What should change, or stay the same?' }] },
    { brk: 'Break', mins: 15 },
    { id: 'targets', title: 'Set the quarter\'s targets', mins: 40, out: 'Agreed targets for the quarter, with the operating change that delivers each one.',
      pts: ['<b>Start from last quarter\'s actuals,</b> not from the ideal.', '<b>Write the bridge.</b> What has to change for the target to be real?', '<b>Vote,</b> then mark a target agreed only when the room agrees. Skip the ones you will not adopt.'],
      tools: [{ k: 'targets', scope: 'q', title: 'Targets for the quarter', seeds: [{ metric: 'Revenue' }, { metric: 'Gross margin' }, { metric: 'Net profit' }, { metric: 'Cash' }] }] },
    { id: 'crit', title: 'Choose two Critical Numbers', mins: 25, out: 'Two numbers that pull against each other, so improving one at the cost of the other shows up as a miss.',
      pts: ['<b>Lagging result:</b> the outcome that shows success. <b>Leading behavior:</b> the repeatable action most likely to produce it.', '<b>Pick two that balance.</b> Margin against volume, or cash collected against inventory held.', '<b>Thresholds</b> for celebrate, goal, and disappointing must be numeric.'],
      tools: [H.crit('crit', 'Critical Numbers for the quarter')] },
    { id: 'rocks', title: 'Choose the company priorities', mins: 55, out: 'Three to five priorities, each with an owner, a finish line, a leading indicator, a data source, and a tradeoff.',
      pts: ['Add candidates, vote, then fill in the gate on each one. A priority cannot be approved until its gate is complete.', '<b>Approved priorities move to the top,</b> rejected ones to the bottom, so what is left to decide stays in view.', '<b>Every priority must displace something.</b> Name what stops or moves.'],
      tools: [{ k: 'rocks', scope: 'q', noun: 'priority', min: 3, max: 5, gate: H.GATE_ALL, due: '$horizon', title: 'Company priorities for the quarter' }] },
    { brk: 'Lunch', mins: 45 },
    { id: 'theme', title: 'Theme and celebration', mins: 20, out: 'A theme the whole company can repeat, a scoreboard, and a reward for hitting the goal.',
      pts: ['<b>Theme:</b> a short phrase that makes the quarter\'s focus easy to remember.', '<b>Scoreboard:</b> where everyone will see the Critical Numbers.', '<b>Reward:</b> something people will actually want, with a date.'],
      tools: [{ k: 'form', id: 'theme', title: 'Theme and scoreboard', rows: [
        { k: 'theme', label: 'Quarterly theme', type: 'text', wide: true }, { k: 'board', label: 'Scoreboard location', type: 'text' }, { k: 'updater', label: 'Update owner', type: 'select', choices: 'roster' },
        { k: 'reward', label: 'Reward when the goal is met', type: 'text' }, { k: 'celebrate', label: 'Celebration date', type: 'date' }] }] },
    { id: 'people', title: 'Each person makes the plan executable', mins: 40, out: 'Every person has three to five priorities that support the company priorities, with a check-in date and a due date.',
      pts: ['<b>Priorities:</b> three to five that directly support a company priority.', '<b>Measures:</b> a daily or weekly leading measure the person controls.', '<b>Capacity:</b> one thing to stop, defer, or delegate.'],
      tools: [{ k: 'commits', id: 'plans', title: 'Individual plans', min: 3, max: 5, maxDue: '$horizon' }] },
    { id: 'rhythm', title: 'Lock the weekly rhythm', mins: 25, out: 'A meeting rhythm that survives the day and exposes problems early.',
      pts: ['<b>Weekly:</b> a fixed agenda, a scorecard, and a priority check-in.', '<b>Cutoff:</b> one weekly deadline for scorecard inputs.', '<b>Escalation:</b> two misses in a row trigger a recovery plan.'],
      tools: [H.cadence('rhythm')] },
    { id: 'signoff', title: 'Read back and sign off', mins: 20, out: 'The quarterly plan is approved, and every owner has stated a first action and a next check.',
      pts: ['Read the page top to bottom. Anything blank is a decision still owed.', 'Each owner states the first action and the next check date, then signs.'],
      tools: [{ k: 'summary', id: 'sum', title: 'The quarterly plan, as entered', sections: [
        { h: 'Targets', kind: 'targets', scope: 'q' }, { h: 'Priorities', kind: 'rocks', scope: 'q' }, { h: 'Critical Numbers', kind: 'crit', form: 'crit' },
        { h: 'Theme', kind: 'fields', form: 'theme', items: [['theme', 'Theme'], ['reward', 'Reward'], ['celebrate', 'Celebration']] }, { h: 'Coherence checks', kind: 'checks' }] },
        { k: 'signoff', id: 'signoff', label: 'the quarterly plan' }, { k: 'rating', id: 'rate', title: 'Rate this meeting', prompt: 'One to ten. What would make it a ten next time?' }] }
  ] }],
  checks: [
    { l: 'Targets agreed', kind: 'targets', scope: 'q' },
    { l: 'Two Critical Numbers', kind: 'form', id: 'crit', keys: ['c1name', 'c2name', 'balance'] },
    { l: 'Priorities, three to five', kind: 'rocks', scope: 'q', min: 3, max: 5, gate: true },
    { l: 'Theme set', kind: 'form', id: 'theme', keys: ['theme'] },
    { l: 'Individual priorities', kind: 'commits', id: 'plans', min: 3 },
    { l: 'Weekly rhythm locked', kind: 'form', id: 'rhythm', keys: ['day', 'cutoff', 'escalation'] },
    { l: 'Sign-off', kind: 'signoff', id: 'signoff' }
  ]
};
