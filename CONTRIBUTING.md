# Contributing

Virtual Offsite is a small, self-hosted meeting-room application for one organization. Contributions should improve meeting collaboration, accessibility, templates, themes, security, or self-hosting.

Use Node.js 22 and Python 3. Install dependencies with `npm ci`, install Chromium with `npx playwright install chromium`, and run `npm test`. Tests use synthetic data and local Redis/mail fixtures; no service keys are required. On Linux, Playwright may need `npx playwright install --with-deps chromium`.

## Change the application

1. Edit numbered JavaScript files in `src/js/`, `src/head.html`, `src/tools.css`, `src/tour.css`, or the organizer console in `src/console.src.html`.
2. For theme changes, edit `tools/looks.py`; never hand edit the generated LOOKS blocks.
3. Run `npm run build`. It writes local `dist/` and deployable `parts/`.
4. Run `npm test`, including the contrast check. Commit source and updated `parts/` together. Do not commit `dist/`, `.env`, or local browser state.

See [TEMPLATES.md](docs/TEMPLATES.md) to add a meeting type and [LOOKS.md](docs/LOOKS.md) to edit visual themes. Keep template content server-owned; accept only the documented agenda edits from browsers. Collections must agree in the server library, browser shim, and client configuration.

## Keep the public edition focused

The repository deliberately contains no paid subscriptions, account signup, AI provider calls, shared document ingestion, business dashboards, operator access, or central telemetry. The distribution test checks this boundary. Human facilitator permissions and ordinary meeting planning tools are core meeting features.

Use example.com addresses and synthetic meeting content in tests and screenshots. Never attach personal room links, credentials, or customer data to a pull request. For security reports, follow [SECURITY.md](SECURITY.md).

Pull requests should explain the user-visible change, relevant tradeoffs, and the checks you ran. For a UI change, include synthetic screenshots of the affected theme and a mobile view. Contributions are provided under this repository's MIT license.
