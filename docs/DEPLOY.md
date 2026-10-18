# Deploy and operate your organization’s rooms

This guide sets up one independent organization using Vercel and a dedicated Upstash Redis database. Organizers share a passcode. Invitees get individual room links. No billing or AI configuration is required.

## 1. Make your own copy

Fork [dsskaggs-ai/virtual-offsite](https://github.com/dsskaggs-ai/virtual-offsite), or use the Deploy with Vercel button in the README. Your fork is where you keep custom templates and themes. Do not put passwords, credentials, invitation links, or meeting records in it.

## 2. Create the database

Create an Upstash Redis database for this deployment, either directly in Upstash or through Vercel's Marketplace/Storage connection flow. Pick a region close to your application and review the provider's current pricing and limits. Live rooms poll for changes, so database requests grow with the number of open browser tabs.

Get the database's **REST URL** and **read/write REST token** privately from its connection details. This app uses the HTTP REST connection, not a `redis://` TCP URL. A read-only token cannot create rooms or save meeting work. Upstash documents its [REST API and authentication](https://upstash.com/docs/redis/features/restapi).

Use a dedicated database for each organization. Do not connect this edition to a database used by another application or a hosted edition. All rooms in one deployment belong to its organizers; there is no separate tenant or account boundary inside it.

## 3. Import into Vercel

Import your fork as a new Vercel project, with the repository root as the Root Directory. The repository provides:

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Node.js | 22.x |
| Build command | `node tools/verify-parts.js` |
| Output directory | `public` |
| Function source | `api/` |

Leave the values supplied by `vercel.json` in place. The empty public directory is intentional: organizer and attendee pages are assembled by functions from checksummed `parts/`. Source files and tests are not a public static website. See Vercel's [project configuration](https://vercel.com/docs/project-configuration) for how repository configuration applies.

## 4. Add private environment variables

In the project's environment settings, add these to **Production**. Store passwords, signing secrets, and tokens as **Secret** values. Never prefix credentials with a public/client variable prefix.

| Name | Value |
| --- | --- |
| `ADMIN_PASSCODE` | A long random organizer passcode, shared only with trusted organizers |
| `SESSION_SECRET` | A separate random value with at least 32 bytes of entropy |
| `KV_REST_API_URL` | The dedicated database's HTTPS REST URL |
| `KV_REST_API_TOKEN` | Its read/write REST token |
| `BASE_URL` | Your canonical HTTPS origin, such as `https://meetings.example.com`, once assigned |

The code also accepts `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as aliases. If a Marketplace integration adds `KV_URL` or a read-only token as well, this app does not use those. If you customize the integration's variable prefix, map the REST values to one of the supported pairs.

You can generate a secret locally with:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex')+'\n')"
```

Run it twice and use separate values for the passcode and signing secret. Enter them privately in Vercel and keep them in your password manager. Organizer passcodes ignore case and surrounding whitespace, so use a sufficiently long random value.

Use **different databases and credentials** for Preview and Development. A preview connected to your production database can change real meeting data. Do not share production secrets with unreviewed pull requests. Vercel explains [environment scopes and configuration](https://vercel.com/docs/environment-variables).

## 5. Deploy and set the origin

Deploy the project. Set `BASE_URL` to the assigned Vercel domain or your custom domain, with `https://` and no path, query, or trailing slash, then redeploy. This makes invitation and calendar links use a consistent origin. After changing environment values, create a new deployment so the functions receive them.

For attendee access, configure Vercel Deployment Protection so your intended attendees can reach the production URL. The app has its own passcode and room authentication; a Vercel sign-in page in front of it will stop attendees who do not belong to your Vercel team. Keep previews protected as appropriate for your development workflow.

## 6. Check the first meeting

1. Visit `/api/health`. `adminPasscodeSet`, `sessionSecretSet`, and `redisEnv` should be `true`; `redis` and `page` should be `"ok"`. `emailConfigured: false` is fine when using copied links.
2. Open the site root in a browser and sign in. Create a small test room with two synthetic people; make one a facilitator.
3. Open the two private links in separate browser profiles. Type a note in one and confirm it appears in the other. Open the participant link on a phone too.
4. Confirm a participant cannot lead the room or start the next session.
5. Download a Markdown record. In a recurring room, end a session and verify the saved record appears under **Manage** and open work carries forward.
6. Close the test room, confirm its links stop admitting people, and delete it when finished.

Keep the organizer passcode private. Give meeting participants their own links, not the organizer login.

## Optional: email invitations

Without email configuration, the console gives you private links and buttons to open your own email program. Nothing needs to be purchased just to copy links.

To have the server send invitations, configure a sending domain in your own Resend account and add these private values:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | A sending key for your Resend account |
| `MAIL_FROM` | A sender on your verified domain, such as `Meetings <meetings@example.com>` |

Redeploy, then create a test meeting with your own email address and select the send option. Verify the link and calendar attachment. If delivery fails, copy the person's link while you fix the sender setup. Follow Resend's [domain verification documentation](https://resend.com/docs/dashboard/domains/introduction).

The app sends invitations, not reminder campaigns or an inbound email service. Configure your mailbox separately if you want recipients to reply to the sender address.

## Ongoing operation

- **Backup:** download meeting records and use your database provider's backup/export capabilities. Data remains in Redis until deleted; this app does not automatically expire meeting rooms or records.
- **Access:** every organizer with the passcode can view and manage every room in this deployment. Share it only within your organization. Rotate credentials when an organizer leaves.
- **Room links:** use **Manage → New link** to replace a personal link, remove an attendee to revoke their access, or close the room to stop all attendee access. A room code admits anyone who knows it as a participant. Close sensitive rooms when no longer needed.
- **Secrets:** rotating `SESSION_SECRET` signs everyone out, including participants. Rotating only `ADMIN_PASSCODE` does not invalidate existing signed organizer cookies; rotate both when revoking organizer access, then redeploy.
- **Deletion:** deleting a room removes its metadata, live collections, and stored records. Download anything you need first. Provider backups and emails already sent have their own retention policies.
- **Cost:** inspect Vercel function usage, Redis command usage/storage, and optional email sends. Review provider plan terms and spending controls for your intended use; free code does not guarantee free infrastructure.
- **Updates:** review upstream changes, merge into your fork, run `npm ci`, rebuild, and test before deploying. Preserve your custom templates and secret settings.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Vercel sign-in appears instead of the app | Deployment Protection and the intended production URL |
| Health reports `redisEnv: false` | REST URL/token variable names and the correct environment scope |
| Health reports `redis: "error"` | REST endpoint, read/write token, network access, and database limits |
| Health reports a checksum or missing-file error | Run `npm run build`, commit `parts/`, and redeploy |
| Organizer passcode does not work | Correct project/environment, latest deployment, and passcode value; wait ten minutes after rate limiting |
| Page says single-screen mode | Browser cannot sync with the server; check health and browser network failures before relying on shared edits |
| Another attendee cannot see changes | Open the same room in both profiles; check network access and Redis; allow a few seconds for polling |
| Invitation link points to the wrong domain | Correct `BASE_URL` and redeploy before sending more invitations |
| Email invites are off | Both `RESEND_API_KEY` and `MAIL_FROM` must be present in the deployed environment |
| Local changes do not show | Run `npm run build` and restart `npm run dev`; pages are cached by the process |

For source development you need Python 3 to regenerate the design tokens and HTML. Cloud deployment only verifies the already-generated files using Node.js.
