# Security and data handling

This is a self-hosted application for a trusted organization. The deployment owner is responsible for hosting access, secrets, database retention, backups, and who receives meeting links.

## Access model

- One organizer passcode grants access to all rooms, attendee lists, private links, and saved records in that deployment. It is not a multi-tenant account system.
- Personal links contain random bearer tokens. Opening one creates a signed, HttpOnly, Secure, SameSite=Lax cookie for that room. Treat the full invitation URL as a password.
- People who know a room code may enter any name and join as a participant. Names entered this way are not verified identities. A participant can contribute shared content; facilitator controls are checked on the server.
- Attendee roles and room boundaries are enforced by the API. Link replacement or attendee removal invalidates the old personal credential on subsequent requests. Closing a room stops attendee access. Allow for brief polling and metadata cache delays on an already-open page.
- Organizer cookies last two days; attendee cookies last fourteen days. Rotate the session signing secret and redeploy when you need to invalidate existing cookies immediately. Changing only the organizer passcode does not sign out existing sessions.

Use HTTPS for public deployments. The local development server binds to loopback and is not a production web server. Use a dedicated Redis database per deployment, and separate development/preview data from production.

## Where data goes

Room metadata, attendee names and emails, random invite tokens, meeting contributions, presence, and saved session records are stored in the Redis database you configure. The browser also keeps display preferences and tutorial state in local storage and temporary room state in memory. The organizer can delete rooms and export stored records.

The app has no model integration, publisher-controlled backend, central analytics, or operator agent. Your hosting and database providers still process traffic and may retain infrastructure logs and backups. If you enable invitations, recipient details, meeting titles/times, private links, and calendar attachments are sent through your configured Resend account. Emails already delivered are not revoked when a room is deleted.

Google Fonts is loaded for the visual themes. Font requests expose ordinary request metadata to Google, but do not intentionally include meeting contents. Pages set a no-referrer policy on the supported hosting configuration. To avoid external font requests, remove the Google Fonts links in `src/head.html`, `src/console.src.html`, and `api/page.js`, then rebuild. The themes have system font fallbacks.

The app's no-index headers and robots policy discourage search indexing; they are not access controls. Do not publish credentials, personal invite URLs, records, database exports, or real meeting screenshots in issues or pull requests.

## Reporting a vulnerability

Do not disclose credentials or exploitable details in a public issue. Use this repository's **Security → Report a vulnerability** option when available. If private reporting is unavailable, open a public issue asking for a private reporting channel without including the vulnerability details. Ordinary bugs with synthetic examples can be reported in Issues.

MIT licensing includes no warranty. Review the access model and your organization's data requirements before storing sensitive information.
