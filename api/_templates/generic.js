'use strict';
module.exports = {
  id: 'generic', name: 'Generic meeting', short: 'Meeting',
  basis: 'A plain meeting you shape yourself: edit the agenda to fit.',
  blurb: 'A simple agenda you can change. Add, remove, and reorder items and choose the working tool for each one: a discussion wall, a ranked issues list, actions, a round table, or notes only.',
  recurring: false, defaultTitle: 'Team meeting',
  setup: [],
  carry: [],
  days: [{ label: 'Meeting', items: [
    { id: 'open', title: 'Open', mins: 5, out: 'The purpose of the meeting and the outcome it needs.',
      pts: ['State the purpose in a sentence and the outcome in a sentence.'],
      tools: [{ k: 'form', id: 'purpose', title: 'Purpose and outcome', rows: [{ k: 'purpose', label: 'Purpose', type: 'text', wide: true }, { k: 'outcome', label: 'Outcome we need by the end', type: 'text', wide: true }, { k: 'lead', label: 'Facilitator', type: 'select', choices: 'roster' }] }] },
    { id: 'discuss', title: 'Discussion', mins: 20, out: 'Ideas and questions from everyone are on the wall and ranked.',
      pts: ['Add a card for each idea or question. Vote on what matters most.'],
      tools: [{ k: 'wall', id: 'wall', title: 'Ideas and questions', prompt: 'One card each.', ph: 'Add an idea or question' }] },
    { id: 'decide', title: 'Decide', mins: 20, out: 'The top items are decided, or given an owner and a date.',
      pts: ['Work the list from the top. Log each decision in the right-hand log.'],
      tools: [{ k: 'issues', id: 'issues', title: 'Items to decide', prompt: 'Add an item, vote for the ones that matter, and work them from the top.' }] },
    { id: 'actions', title: 'Actions', mins: 10, out: 'Every action has an owner, a check-in date, and a due date.',
      pts: ['One owner per action. Two dates per action.'],
      tools: [{ k: 'todos', id: 'actions', title: 'Actions', mode: 'new', noun: 'action' }] },
    { id: 'close', title: 'Close', mins: 5, out: 'Actions recapped and the meeting rated.',
      pts: ['Recap the actions out loud, then rate the meeting.'],
      tools: [{ k: 'recap', id: 'recap', title: 'Recap' }, { k: 'rating', id: 'rate', title: 'Rate this meeting', prompt: 'One to ten.' }] }
  ] }],
  checks: [
    { l: 'Purpose written', kind: 'form', id: 'purpose', keys: ['purpose', 'outcome'] },
    { l: 'Actions have owners and dates', kind: 'todosnew' },
    { l: 'Everyone rated the meeting', kind: 'ratings', id: 'rate' }
  ]
};
