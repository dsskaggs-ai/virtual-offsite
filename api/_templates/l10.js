'use strict';
/* Weekly leadership meeting, 90 minutes. Follows the shape of the Level 10 Meeting Agenda from the Entrepreneurial Operating System:
   segue, scorecard, rock review, headlines, to-do list, IDS, conclude. */
module.exports = {
  id: 'l10', name: 'Weekly leadership meeting', short: 'Weekly',
  basis: 'A 90 minute weekly leadership agenda: numbers, headlines, then issue-solving with owners.',
  blurb: 'A 90 minute weekly meeting on the same page every week. Scorecard numbers, priorities, headlines, to-dos, and a ranked issues list you identify, discuss, and solve. The room keeps open issues and to-dos from week to week.',
  recurring: true, defaultTitle: 'Weekly leadership meeting',
  setup: [],
  carry: ['rocks', 'metrics', 'issues', 'todos'],
  days: [{ label: 'Weekly meeting', items: [
    { id: 'segue', title: 'Good news', mins: 5, out: 'Everyone arrives. One piece of personal good news and one piece of business good news each.', nonotes: true,
      pts: ['One personal and one professional best from the last week. Keep it to a sentence each.', 'The point is to arrive, not to report.'],
      tools: [{ k: 'wall', id: 'segue', title: 'Share good news', prompt: 'One card each.', tags: ['Personal', 'Business'], ph: 'A good thing from the last week' }] },
    { id: 'scorecard', title: 'Scorecard', mins: 5, out: 'Every weekly number is on track or off track. Off-track numbers drop to the issues list.',
      pts: ['Read the numbers, do not discuss them. Save discussion for Identify, discuss, solve.', 'Use the button on an off-track number to send it to the issues list.'],
      tools: [{ k: 'metrics', id: 'score', title: 'Weekly scorecard', help: 'Add each weekly number with an owner and a goal. Enter this week\'s actual. Last week\'s actual stays in view.', toIssue: true, owners: true }] },
    { id: 'rocks', title: 'Priority check-in', mins: 5, out: 'Each priority is on track, off track, or done. Off-track priorities drop to the issues list.',
      pts: ['One word per priority: on track, off track, or done.', 'Add the quarter\'s priorities (Rocks, if you run EOS) the first time. They stay from week to week.'],
      tools: [{ k: 'rocktrack', id: 'rocks', title: 'Priorities for the quarter', noun: 'priority', toIssue: true }] },
    { id: 'headlines', title: 'Customer and employee headlines', mins: 5, out: 'Good and bad news about customers and people is shared. Anything that needs work drops to the issues list.', nonotes: true,
      pts: ['Headlines only. If it needs discussion, it goes to the issues list.'],
      tools: [{ k: 'wall', id: 'headlines', title: 'Headlines', prompt: 'One card per headline.', tags: ['Customer', 'Employee'], ph: 'The headline' }] },
    { id: 'todos', title: 'To-do list', mins: 5, out: 'Last week\'s to-dos are done or not done. The goal is nine out of ten done.',
      pts: ['Done or not done. No explanations.', 'Anything not done goes to the issues list if it is stuck, or is carried forward with a new date.'],
      tools: [{ k: 'todos', id: 'todos', title: 'To-dos', mode: 'review', noun: 'to-do', goal: 90, toIssue: true }] },
    { id: 'ids', title: 'Identify, discuss, solve', mins: 60, out: 'The most important issues are solved for good, and every solution has an owner and a to-do.',
      pts: ['<b>Identify</b> the real issue, not the symptom. <b>Discuss</b> until everyone has said their part. <b>Solve</b> it with a decision and a to-do.', 'Rank by votes. Work the top issue first and move to the next only when it is solved.'],
      tools: [{ k: 'issues', id: 'issues', title: 'Issues list', prompt: 'Add an issue, vote for the ones that matter most, and work them from the top.' }, { k: 'todos', id: 'new', title: 'New to-dos from this meeting', mode: 'new', noun: 'to-do', help: 'Every solved issue ends in a to-do with an owner and two dates.' }] },
    { id: 'conclude', title: 'Conclude', mins: 5, out: 'To-dos recapped, any message for the company agreed, and the meeting rated.',
      pts: ['Recap the new to-dos out loud.', 'Agree what, if anything, to tell the rest of the company.', 'Rate the meeting one to ten. If it is under eight, say what would raise it.'],
      tools: [{ k: 'recap', id: 'recap', title: 'Recap' }, { k: 'form', id: 'cascade', title: 'Message to the company', rows: [{ k: 'text', label: 'What to tell the rest of the company', type: 'area', wide: true }, { k: 'owner', label: 'Who shares it', type: 'select', choices: 'roster' }] },
        { k: 'rating', id: 'rate', title: 'Rate this meeting', prompt: 'One to ten.' }] }
  ] }],
  checks: [
    { l: 'Scorecard numbers entered', kind: 'metrics', id: 'score' },
    { l: 'Priorities reviewed', kind: 'rocktrack', id: 'rocks' },
    { l: 'To-dos reviewed', kind: 'todosreview' },
    { l: 'New to-dos have owners and dates', kind: 'todosnew' },
    { l: 'Everyone rated the meeting', kind: 'ratings', id: 'rate' }
  ]
};
