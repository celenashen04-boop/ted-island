# CHI Island v2 backend rollout

The game rules remain in [context.md](../context.md). This branch implements the first local backend milestone and the core v2 account, access, and in-app notification flows.

## Verify locally

Use Node.js 24 and run `npm test`. The integration test starts two server processes in sequence with the same temporary SQLite directory. It checks that independent sessions share live updates, adoption and participation grant the expected access, a judge can leave an island after access expires, and the garden and session survive the restart. It also verifies private notifications, discussion export, and plant dormancy.

Run `npm start` to play locally. Set `PORT=4180` to run beside the original prototype. Use a fresh data directory for the first hosted judging rehearsal. If existing playtest data should be imported, take a backup and restore a copy to staging first. Existing v1 bridge tables are retained as migration history. V2 access starts when a qualifying v2 action occurs.

## Set up the judging demo

In Railway or Render, create a staging service with one continuously running instance and a persistent volume. Set the Node version to 24 and the start command to `npm start`. Configure the platform health check to GET `/api/health`. In Railway, use the service settings for a new service. See [Railway deployment configuration](https://docs.railway.com/config-as-code) and [persistent volumes](https://docs.railway.com/volumes).

| Setting | Value |
| --- | --- |
| `HOST` | `0.0.0.0` |
| `PORT` | Use the port provided or expected by the platform |
| `TED_DATA_DIR` | Absolute mounted volume path, for example `/data` |
| `TED_SECURE_COOKIE` | `1` when the service uses HTTPS |
| `TED_ORIGIN` | The public HTTPS origin, without a trailing slash |

Run `npm run backup -- /path/to/backup.sqlite` with `TED_DATA_DIR` set to create a consistent SQLite snapshot, including committed changes in the WAL. Use a new destination each time and copy backups off the app volume. Test restoring into a fresh staging volume before judging. Set daily backups, then hourly during the conference.

Before sharing the link, test the deployed site on two different networks. Confirm that both browsers see updates without refreshing, then restart the service and confirm the same garden and judge session return. Verify HTTPS, the login cookie, and the proxy's handling of Server-Sent Events. Keep the existing conference link until staging passes.

## Work still open

- Choose the host account and decide whether to import existing playtest data. Provision staging and schedule an off-volume backup.
- Configure optional email and implement delivery, consent preferences, and password reset before offering email collection in the browser.
- Replace full state updates with smaller resumable SSE events and run the planned conference-scale load test. The current SSE path sends a fresh snapshot after reconnecting.
- Move PDF files out of SQLite before heavy upload use. Add moderation, account deletion, and any research consent flow after the team confirms the study requirements.
- Finish the Island Access and notification UI with the UI designer and replace the provisional permanent bridge geometry when the spatial assets are ready.
