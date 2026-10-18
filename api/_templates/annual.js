'use strict';
const H = require('./_h');
/* Annual planning over two days: look back, reaffirm or reset the foundation, read the trends, set the year's destination,
   then choose priorities, Critical Numbers, and the first quarter. Follows the shape of the annual planning meeting in the Scaling Up method. */
module.exports = {
  id: 'annual', name: 'Annual planning', short: 'Annual',
  basis: 'A two day annual planning meeting that sets the year on one page, then the first quarter.',
  blurb: 'Two working days. Day one looks back, reaffirms or resets the foundation, reads the trends, and sets the destination. Day two chooses three to five priorities, two Critical Numbers, and the first quarter\'s priorities.',
  recurring: false, defaultTitle: 'Annual planning',
  setup: [{ k: 'horizon', label: 'Plan year ends', type: 'date', def: '+365d', help: 'Annual priorities default to this due date.' },
          { k: 'qend', label: 'First quarter ends', type: 'date', def: '+90d', help: 'First quarter priorities (Rocks, if you run EOS) default to this due date.' }],
  carry: [],
  days: [
    { label: 'Day 1', items: [
      { id: 'open', title: 'Open and agree on success', mins: 15, out: 'Roles named, rules agreed, and the outputs the two days must produce are visible.',
        pts: ['<b>Measure backward.</b> See what was gained before deciding which gaps still matter.', '<b>Facts before assumptions.</b> Challenge inherited constraints instead of planning by analogy.', '<b>Choices before additions.</b> Every priority must displace something else.'],
        tools: [{ k: 'required', day: 0 }, H.roles('roles')] },
      { id: 'lookback', title: 'Look back at the year', mins: 45, out: 'A shared list of what the year proved, and an honest scoreboard against plan.',
        pts: ['<b>Compare today with the first day of the year,</b> not with the ideal.', '<b>Three gains per person,</b> each with one piece of evidence.', '<b>Name the capability:</b> what can the team do now that it could not do then?'],
        tools: [{ k: 'metrics', id: 'year', title: 'The year, plan against actual', help: 'Enter plan and actual for each measure. Mark lower-is-better where it applies.', seeds: [{ name: 'Revenue' }, { name: 'Gross margin' }, { name: 'Net profit' }, { name: 'Cash' }] },
          { k: 'wall', id: 'gain', title: 'What the year proved', prompt: 'One card per item.', tags: ['Gain', 'Miss', 'Lesson'], ph: 'The gain, miss, or lesson, in a sentence', extras: [{ k: 'x1', label: 'Evidence', ph: 'Number, date, or document' }, { k: 'x2', label: 'Capability it proves', ph: 'What can we do now that we could not before?' }] }] },
      { id: 'found', title: 'Reaffirm what endures, reset what changed', mins: 60, out: 'A foundation the annual priorities can actually support.',
        pts: ['<b>Enduring:</b> core values, purpose, long-term goal, and brand promise.', '<b>Review</b> the sandbox, the brand-promise measures, and the reputation drivers.', '<b>Reset</b> the three to five year endpoint if it no longer serves the business.', '<b>Test:</b> does the strategy fit the current footprint, the year-end position, and capital reality?'],
        tools: [{ k: 'form', id: 'found', title: 'Foundation', help: 'Mark each item Reaffirm or Reset. If it resets, write the new wording.', rows: [
          H.pair('purpose', 'Purpose'), H.pair('values', 'Core values'), H.pair('bhag', 'Long-term goal', '10 to 25 years out, bold enough to stretch the company.'), H.pair('brand', 'Brand promise'), H.pair('sandbox', 'Sandbox (where we play)'), H.pair('horizon', 'Three to five year date and targets')] }] },
      { brk: 'Break', mins: 15 },
      { id: 'trends', title: 'Read the trends', mins: 50, out: 'The trends, strengths, weaknesses, and threats that should shape next year.',
        pts: ['<b>Trends</b> in customers, competitors, technology, rules, and capital.', '<b>Strengths and weaknesses</b> are about us. <b>Opportunities and threats</b> come from outside.', 'Vote. The top items feed the priorities on Day 2.'],
        tools: [{ k: 'wall', id: 'trends', title: 'Trends and SWOT', prompt: 'One card per item.', tags: ['Trend', 'Strength', 'Weakness', 'Opportunity', 'Threat'], ph: 'What do we see?' }] },
      { brk: 'Lunch', mins: 60 },
      { id: 'targets', title: 'Set the destination for the year', mins: 60, out: 'Agreed annual targets with a credible operating bridge.',
        pts: ['<b>Start from the year-end position.</b> Confirm footprint and financing assumptions out loud.', '<b>A draft is not an approval.</b> A model column labeled Goals is a starting case.', '<b>Test liquidity separately from profit.</b> Targets need the capacity to deliver them.'],
        tools: [{ k: 'targets', scope: 'y', title: 'Annual targets', seeds: [{ metric: 'Revenue' }, { metric: 'Gross margin' }, { metric: 'Net profit' }, { metric: 'Cash' }] }] },
      { id: 'people', title: 'Make the strategy executable through people', mins: 45, out: 'Function owners, critical seat gaps, and the function that needs the most support.',
        pts: ['<b>Functions:</b> purpose, owner, and result for every major function.', '<b>Seats:</b> filled, interim, and open leadership seats, without debating personalities.', '<b>Support:</b> name the one function that needs the most investment next year.'],
        tools: [{ k: 'wall', id: 'face', title: 'Functions, seats, and support', prompt: 'One card per function or seat.', tags: ['Function owner', 'Seat gap', 'Needs most support'], ph: 'Function or seat, and what is true today' }] },
      { id: 'wrap1', title: 'Close Day 1', mins: 15, out: 'Overnight corrections captured and the year-end starting point recorded.',
        pts: ['Corrections go in the notes or the decision log, not in side files.', 'Record the year-end position that Day 2 starts from.'],
        tools: [{ k: 'form', id: 'landing', title: 'Year-end starting point', help: 'The credible exit position that Day 2 builds on.', rows: [
          { k: 'text', label: 'Starting point', type: 'area', wide: true, ph: 'Revenue, profit, cash, inventory, and headcount at year end' }, { k: 'by', label: 'Recorded by', type: 'select', choices: 'roster' }] },
          { k: 'signoff', id: 'day1', label: 'Day 1' }] }
    ] },
    { label: 'Day 2', items: [
      { id: 'reopen', title: 'Reopen and confirm Day 1', mins: 15, out: 'Overnight corrections approved, and Day 1\'s output confirmed as the starting point.',
        pts: ['What Day 1 produced is below, pulled live from the room.', 'Corrections go in the notes or the decision log.'],
        tools: [{ k: 'summary', id: 'sum1', title: 'What Day 1 produced', sections: [
          { h: 'Targets', kind: 'targets', scope: 'y' }, { h: 'Foundation', kind: 'pairs', form: 'found', items: [['purpose', 'Purpose'], ['values', 'Core values'], ['bhag', 'Long-term goal'], ['brand', 'Brand promise'], ['sandbox', 'Sandbox'], ['horizon', 'Three to five year']] },
          { h: 'Starting point', kind: 'fields', form: 'landing', items: [['text', 'Starting point'], ['by', 'Recorded by']] }] }] },
      { id: 'prio', title: 'Choose three to five annual priorities', mins: 75, out: 'A short priority list with no disguised operating tasks.',
        pts: ['<b>Strategic:</b> materially advances the destination.', '<b>Finite:</b> a measurable year-end finish line.', '<b>Owned:</b> one or more named owners, each clear on their part.', '<b>Funded:</b> resources and tradeoffs are explicit.', '<b>Scorable:</b> weekly or monthly leading indicators exist.'],
        tools: [{ k: 'rocks', scope: 'y', noun: 'priority', min: 3, max: 5, gate: H.GATE_ALL, due: '$horizon', title: 'Annual priorities' }] },
      { id: 'crit', title: 'Choose two annual Critical Numbers', mins: 45, out: 'Two numbers that counterbalance each other, with a visible scoreboard and a theme.',
        pts: ['<b>Lagging result</b> reflects success. <b>Leading behavior</b> is the repeatable action most likely to produce it.', '<b>Pick two that pull against each other.</b> Improving one by sacrificing the other must show up as a miss.', '<b>Visibility:</b> one scoreboard, one update owner, one review cadence.'],
        tools: [H.crit('crit', 'Annual Critical Numbers', null, [
          { k: 'h4', type: 'head', label: 'Scoreboard and theme' }, { k: 'board', label: 'Scoreboard location', type: 'text' }, { k: 'updater', label: 'Update owner', type: 'select', choices: 'roster' },
          { k: 'cadence', label: 'Review cadence', type: 'text' }, { k: 'theme', label: 'Annual theme', type: 'text', wide: true }])] },
      { brk: 'Break', mins: 15 },
      { id: 'q1', title: 'Make the first quarter the first move', mins: 60, out: 'Three to five first-quarter priorities, each tied to an annual priority.',
        pts: ['<b>Connect:</b> which annual priority does each first-quarter priority enable?', '<b>Sequence:</b> the first 30-day move after each finish line.', '<b>Remove conflict:</b> resolve any action that reduces capacity for the year.'],
        tools: [{ k: 'rocks', scope: 'q1', noun: 'priority', min: 3, max: 5, gate: H.GATE_ALL, due: '$qend', title: 'First-quarter priorities' }, { k: 'links', id: 'links', from: 'q1', to: 'y', title: 'Each first-quarter priority, and what it enables' }] },
      { brk: 'Lunch', mins: 60 },
      { id: 'commits', title: 'Each person makes the plan executable', mins: 45, out: 'Every person has three to five priorities that support the annual priorities.',
        pts: ['<b>Priorities:</b> three to five personal commitments that support the company plan.', '<b>Dates:</b> a check-in date and a due date for each.', '<b>Capacity:</b> one item to stop, defer, or delegate.'],
        tools: [{ k: 'commits', id: 'plans', title: 'Individual plans', min: 3, max: 5, maxDue: '$qend' }] },
      { id: 'rhythm', title: 'Lock the execution rhythm', mins: 30, out: 'A rhythm that survives the meeting and exposes problems early.',
        pts: ['<b>Weekly:</b> fixed agenda, scorecard, and commitments review.', '<b>Cutoff:</b> one weekly deadline for every scorecard input.', '<b>Cascade:</b> one company message explaining the focus.'],
        tools: [H.cadence('rhythm')] },
      { id: 'readback', title: 'Read back the annual plan', mins: 30, out: 'The page tells one coherent story from the starting point forward.',
        pts: ['This page assembles itself from what the room entered. Read it top to bottom.', 'Anything blank is a decision still owed.'],
        tools: [{ k: 'summary', id: 'sum2', title: 'The annual plan, as entered', copy: 'Annual plan', sections: [
          { h: 'Destination', kind: 'targets', scope: 'y' }, { h: 'Priorities', kind: 'rocks', scope: 'y' }, { h: 'Critical Numbers', kind: 'crit', form: 'crit' },
          { h: 'Foundation', kind: 'pairs', form: 'found', items: [['purpose', 'Purpose'], ['values', 'Core values'], ['bhag', 'Long-term goal'], ['brand', 'Brand promise'], ['sandbox', 'Sandbox'], ['horizon', 'Three to five year']] },
          { h: 'First quarter', kind: 'rocks', scope: 'q1' }, { h: 'Coherence checks', kind: 'checks' }] }] },
      { id: 'final', title: 'Final sign-off', mins: 20, out: 'The annual plan is approved. Every owner states the first action and the next check.',
        pts: ['Approve the plan. Each owner states the first action and the next check, then signs.'],
        tools: [{ k: 'signoff', id: 'day2', label: 'the annual plan' }, { k: 'rating', id: 'rate', title: 'Rate these two days', prompt: 'One to ten. What would make it a ten next year?' }] }
    ] }
  ],
  checks: [
    { l: 'Annual targets agreed', kind: 'targets', scope: 'y', day: 0 },
    { l: 'Foundation reviewed', kind: 'pairs', id: 'found', keys: ['purpose', 'values', 'bhag', 'brand', 'sandbox', 'horizon'], day: 0 },
    { l: 'Year-end starting point', kind: 'form', id: 'landing', keys: ['text'], day: 0 },
    { l: 'Day 1 sign-off', kind: 'signoff', id: 'day1', day: 0 },
    { l: 'Annual priorities, three to five', kind: 'rocks', scope: 'y', min: 3, max: 5, gate: true, day: 1 },
    { l: 'Two Critical Numbers', kind: 'form', id: 'crit', keys: ['c1name', 'c2name', 'balance'], day: 1 },
    { l: 'First-quarter priorities', kind: 'rocks', scope: 'q1', min: 3, max: 5, gate: true, day: 1 },
    { l: 'Individual priorities', kind: 'commits', id: 'plans', min: 3, day: 1 },
    { l: 'Rhythm locked', kind: 'form', id: 'rhythm', keys: ['day', 'cutoff', 'escalation'], day: 1 },
    { l: 'Final sign-off', kind: 'signoff', id: 'day2', day: 1 }
  ]
};
