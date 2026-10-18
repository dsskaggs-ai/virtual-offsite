# Writing a template

A template is one plain JavaScript file in `api/_templates/` that exports data. No code runs in it. Register it in `api/_templates/index.js`, then `npm run build` and `npm test`.

Content in a template (talking points and tools) is always read from the file on the server. A request from a browser can only retitle, retime, reorder, remove, or add items from a small set of presets. This keeps one organizer from putting script into another person's room.

## Shape

```js
module.exports = {
  id: 'weekly',                    // lowercase, no spaces. Used in the room record.
  name: 'Weekly meeting',          // shown on the template card
  short: 'Weekly',
  basis: 'Based on ...',           // one line of attribution
  blurb: 'Two sentences for the picker.',
  recurring: true,                 // true adds the Next session button for facilitators
  defaultTitle: 'Weekly meeting',
  setup: [ /* optional date fields, see below */ ],
  carry: ['issues', 'todos'],      // collections that survive the roll to the next session
  days: [ { label: 'Weekly meeting', items: [ /* scenes and breaks */ ] } ],
  checks: [ /* the "what must leave the room" list */ ]
};
```

## Scenes

```js
{ id: 'ids', title: 'Identify, discuss, solve', mins: 60,
  out: 'The outcome this item must produce, in one sentence.',   // the amber Required Output card
  pts: ['Talking point. <b>Bold</b> is allowed.', 'Another point.'],
  nonotes: true,                                                  // optional: hide the notes box
  tools: [ { k: 'issues', id: 'issues', title: 'Issues list' } ] }
```

A break is `{ brk: 'Lunch', mins: 45 }`. Scene ids must be unique in the template. Start times are computed from the room's start time and the minutes.

## Tools

Every tool has `k` (its kind) and usually `id`, unique in the template, and `title`.

| k | What it is | Notable options |
|---|---|---|
| `required` | Card listing the decisions that must leave the room | none |
| `form` | A set of fields stored as one document | `rows: [{ k, label, type: text/area/date/select/pair/head, choices: [...] or 'roster', wide, ph }]` |
| `wall` | Cards anyone can post, with votes | `tags`, `prompt`, `ph`, `extras` |
| `board` | Cards in columns, drag or menu to move | `cols: [{ k, l, d }]` |
| `rocks` | Priorities with voting, a gate, approve and reject | `scope`, `noun`, `min`, `max`, `gate`, `due: '$horizon'` |
| `rocktrack` | Priorities tracked week to week: on track, off track, done | `noun`, `toIssue` |
| `targets` | Targets with a reference value, a target, and agreed | `scope`, `seeds: [{ metric }]` |
| `commits` | Individual commitments with owners and dates | `min`, `max`, `maxDue` |
| `signoff` | Each person signs off | `label` |
| `links` | Link items in one list to items in another | `from`, `to` |
| `metrics` | Scorecard: goal, actual, last, on or off track | `owners`, `types` (lead or lag), `toIssue`, `seeds: [{ name }]` |
| `issues` | Ranked issues list: identify, discuss, solve | `prompt` |
| `todos` | To-dos with owner, check-in and due dates | `mode: review / new / both`, `noun`, `goal`, `measure`, `toIssue` |
| `standup` | One card per person: finished, today, blocked | none |
| `rating` | Rate the meeting from 1 to 10 | `prompt` |
| `recap` | Read-back of new to-dos and decisions | none |
| `summary` | Read-back of what the room entered | `sections: [...]`, `copy` |

Helpers in `_h.js`: `crit()` for two counterbalancing Critical Numbers, `roles()`, `cadence()`, `pair()` (optional third argument is help text), and `GATE_ALL` for the priority gate.

## Dates

`setup` adds date fields to the organizer's Details step:

```js
setup: [{ k: 'horizon', label: 'Quarter ends', type: 'date', def: '+90d', help: '...' }]
```

`def: '+90d'` means 90 days after the first meeting date. A tool option written `'$horizon'` is replaced with that date.

## Checks

The list on the left of every room. Each check is `{ l: 'Label', kind, id or scope }`. A check is dropped automatically if the organizer removed the item that carries its tool.

Kinds: `rocks`, `targets`, `form`, `pairs`, `commits`, `signoff`, `metrics`, `rocktrack`, `todosreview`, `todosnew`, `ratings`, `updates`.

## Recurring rooms

When a facilitator ends a session on a recurring template, the server saves the record and rolls the room over.

- Collections named in `carry` are kept. Everything else is cleared.
- To-dos marked done are removed. To-dos not done are reset so they can be reviewed again.
- Issues marked solved are removed. Active issues go back to open.
- Scorecard actuals move to "last" and the actual is cleared.
- Priorities tracked week to week keep their title and owner, and their track is reset unless done.
- Stand-up cards move "today" into "finished" and clear the rest.

## Testing a new template

1. `npm run build`
2. `node test/test-templates.js` opens it in a real browser, in each look, and visits every item.
3. Add a flow test beside `test/test-app.js` if it uses a tool in a new way.
