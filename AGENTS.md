# Working on Virtual Offsite

- This repository is the self-hosted meeting-room edition for one organization. Keep it limited to meeting collaboration. Do not add subscription billing, account signup, AI model calls, central telemetry, or operator access.
- Sources live in `src/`, server functions in `api/`, and templates in `api/_templates/`.
- Never hand edit `parts/` or `dist/`. Run `npm run build`, and commit generated `parts/` with source changes.
- Edit theme tokens in `tools/looks.py`. Run `python3 tools/contrast.py` and fix every reported issue.
- Keep collection names aligned in `api/_lib.js`, `src/host-shim.js`, and `src/js/00-config.js`.
- Template content is server-owned data. Never accept scene tools or HTML from a request.
- Run `npm test` before reporting a change as working. Email tests use a mock service only.
- Never commit credentials, passcodes, personal invite links, real attendee information, or meeting data. Use synthetic examples and reserved example.com addresses.
- See `docs/DEPLOY.md`, `docs/TEMPLATES.md`, and `docs/LOOKS.md` for the deployment and authoring workflows.
