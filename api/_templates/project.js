'use strict';
module.exports = {
  id: 'project', name: 'Project meeting', short: 'Project',
  basis: 'A working meeting for a project team: status, work in flight, risks, decisions, and actions.',
  blurb: 'A 60 minute project meeting. A status line, a work board, risks and blockers, decisions that need making, and actions with owners and dates.',
  recurring: true, defaultTitle: 'Project meeting',
  setup: [],
  carry: ['cards', 'todos', 'issues', 'forms'],
  days: [{ label: 'Project meeting', items: [
    { id: 'status', title: 'Status', mins: 10, out: 'One honest status line, the next milestone, and the date it is due.',
      pts: ['Choose green, yellow, or red against the plan, not against hope.', 'Say what changed since the last meeting.'],
      tools: [{ k: 'form', id: 'status', title: 'Project status', rows: [
        { k: 'rag', label: 'Status', type: 'select', choices: ['Green, on plan', 'Yellow, at risk', 'Red, off plan'], blank: 'Choose status' }, { k: 'owner', label: 'Project lead', type: 'select', choices: 'roster' },
        { k: 'summary', label: 'Status in a sentence', type: 'area', wide: true }, { k: 'milestone', label: 'Next milestone', type: 'text' }, { k: 'due', label: 'Milestone date', type: 'date' }, { k: 'changed', label: 'What changed since last time', type: 'area', wide: true }] }] },
    { id: 'work', title: 'Work in flight', mins: 15, out: 'Every piece of work is in the right column, and anything blocked has a reason.',
      pts: ['Add each piece of work, then drag it to a column or use the menu on the card.', 'Anything blocked moves to the Blocked column and gets an owner for the unblock.'],
      tools: [{ k: 'board', id: 'work', title: 'Work board', help: 'Add each piece of work, then drag it to a column or use the menu on the card.', cols: [{ k: 'todo', l: 'To do', d: 'Not started.' }, { k: 'doing', l: 'Doing', d: 'In progress now.' }, { k: 'blocked', l: 'Blocked', d: 'Waiting on something.' }, { k: 'done', l: 'Done', d: 'Finished and checked.' }] }] },
    { id: 'risks', title: 'Risks, blockers, and dependencies', mins: 15, out: 'Risks and blockers are visible, ranked, and each has an owner.',
      pts: ['<b>Risk:</b> might happen. <b>Blocker:</b> is happening. <b>Dependency:</b> needs something from outside the team.', 'Vote on what worries the room most.'],
      tools: [{ k: 'wall', id: 'risks', title: 'Risks and blockers', prompt: 'One card each.', tags: ['Risk', 'Blocker', 'Dependency', 'Question'], ph: 'What could stop or slow the project?' }] },
    { id: 'decide', title: 'Decisions needed', mins: 10, out: 'Open decisions are discussed and decided, or given an owner and a date.',
      pts: ['State the decision, the options, and who decides.', 'Log each decision in the right-hand log with an owner and dates.'],
      tools: [{ k: 'issues', id: 'issues', title: 'Open decisions and issues', prompt: 'Add a decision that is needed, vote for the urgent ones, and work from the top.' }] },
    { id: 'actions', title: 'Actions', mins: 10, out: 'Every action has an owner, a check-in date, and a due date.',
      pts: ['One owner per action. Two dates per action.'],
      tools: [{ k: 'todos', id: 'actions', title: 'Actions', mode: 'both', noun: 'action' }, { k: 'rating', id: 'rate', title: 'Rate this meeting', prompt: 'One to ten.' }] }
  ] }],
  checks: [
    { l: 'Status recorded', kind: 'form', id: 'status', keys: ['rag', 'summary'] },
    { l: 'Blocked work has an owner for the unblock', kind: 'todosnew' },
    { l: 'Everyone rated the meeting', kind: 'ratings', id: 'rate' }
  ]
};
