'use strict';
/* Weekly accountability session in the style of the 4 Disciplines of Execution WIG session:
   account for last week's commitments, review the scoreboard, clear the path and commit to the next week. */
module.exports = {
  id: '4dx', name: 'Weekly accountability', short: 'Account',
  basis: 'A 30 minute weekly accountability meeting built around one written goal.',
  blurb: 'A 30 minute weekly session built around one goal, written as "from X to Y by when". Account for last week\'s commitments, read the lead and lag scoreboard, clear the path, and make new commitments that move the lead measures.',
  recurring: true, defaultTitle: 'Weekly accountability session',
  setup: [],
  carry: ['metrics', 'todos', 'forms'],
  days: [{ label: 'Weekly session', items: [
    { id: 'wig', title: 'The goal', mins: 3, out: 'The one goal is written as "from X to Y by when" and everyone can say it.', nonotes: true,
      pts: ['One goal, written as a starting number, a finish number, and a date.', 'If the goal changed, change it here and log the decision.'],
      tools: [{ k: 'form', id: 'wig', title: 'The one goal', rows: [{ k: 'goal', label: 'Goal in words', type: 'text', wide: true }, { k: 'from', label: 'From', type: 'text' }, { k: 'to', label: 'To', type: 'text' }, { k: 'by', label: 'By when', type: 'date' }] }] },
    { id: 'account', title: 'Account for last week\'s commitments', mins: 10, out: 'Each person reports done or not done on every commitment they made last week.',
      pts: ['Report in three parts: what I committed to, what I did, what I learned.', 'Done or not done. If not done, say what got in the way in a few words.', 'Count only what each person controls.'],
      tools: [{ k: 'todos', id: 'account', title: 'Last week\'s commitments', mode: 'review', noun: 'commitment', goal: 80 }] },
    { id: 'board', title: 'Review the scoreboard', mins: 7, out: 'Lead and lag measures are updated, and the team can see at a glance whether it is winning.',
      pts: ['<b>Lag measures</b> show the result you want. <b>Lead measures</b> show the activity that drives it. Lead measures are the ones you can move this week.', 'Update the actuals. Look at the trend, not just the number.'],
      tools: [{ k: 'metrics', id: 'board', title: 'Scoreboard', help: 'Add the lag measure and one or two lead measures. Mark each as lead or lag.', types: true, owners: true }] },
    { id: 'path', title: 'Clear the path', mins: 5, out: 'Obstacles that block the lead measures are named, and someone owns each one.',
      pts: ['Name the obstacle in the team\'s way. Say what help is needed and from whom.', 'The leader\'s job is to remove it this week.'],
      tools: [{ k: 'wall', id: 'path', title: 'Obstacles and help needed', prompt: 'One card each.', tags: ['Obstacle', 'Help needed'], ph: 'What is in the way?' }] },
    { id: 'commit', title: 'Make new commitments', mins: 5, out: 'Each person makes one or two commitments for the week that move a lead measure.',
      pts: ['Each commitment must be specific, owned by one person, and able to be done in the week.', 'Say which lead measure it moves.'],
      tools: [{ k: 'todos', id: 'commit', title: 'This week\'s commitments', mode: 'new', noun: 'commitment', measure: true, help: 'Pick the lead measure each one moves.' }, { k: 'rating', id: 'rate', title: 'Rate this session', prompt: 'One to ten.' }] }
  ] }],
  checks: [
    { l: 'Goal written', kind: 'form', id: 'wig', keys: ['goal', 'to', 'by'] },
    { l: 'Last week reviewed', kind: 'todosreview' },
    { l: 'Scoreboard updated', kind: 'metrics', id: 'board' },
    { l: 'New commitments made', kind: 'todosnew' }
  ]
};
