'use strict';
module.exports = {
  id: 'standup', name: 'Daily stand-up', short: 'Stand-up',
  basis: 'A short daily stand-up: what moved, what is next, and what is blocked.',
  blurb: 'A 15 minute daily check-in. Everyone writes what they finished, what they are doing today, and anything blocking them. Yesterday\'s plan carries into today.',
  recurring: true, defaultTitle: 'Daily stand-up',
  setup: [],
  carry: ['updates', 'todos'],
  days: [{ label: 'Stand-up', items: [
    { id: 'round', title: 'Updates', mins: 10, out: 'Everyone has said what they finished, what they are doing today, and what is blocking them.', nonotes: true,
      pts: ['Keep it to a minute each. Details belong in a follow-up, not here.', 'Yesterday\'s plan is carried over. Update it, then write today\'s.'],
      tools: [{ k: 'standup', id: 'updates', title: 'Round table' }] },
    { id: 'follow', title: 'Blockers and follow-ups', mins: 5, out: 'Every blocker has an owner and a day it will be cleared.',
      pts: ['Take blockers offline unless they stop the whole team.', 'Anything that needs more than two minutes becomes a follow-up with an owner and a date.'],
      tools: [{ k: 'todos', id: 'follow', title: 'Follow-ups', mode: 'both', noun: 'follow-up', help: 'Owner and dates are required.' }] }
  ] }],
  checks: [
    { l: 'Everyone has posted', kind: 'updates', id: 'updates' },
    { l: 'Follow-ups have owners', kind: 'todosnew' }
  ]
};
