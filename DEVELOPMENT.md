# Developer handoff — Meda 0.2

## Implementation

- React + TypeScript/Vite frontend. Responsive desktop/tablet/mobile presentation shares one application state and authenticated API.
- Node.js 24 / Express API, built-in SQLite driver, versioned `/api/v1` routes.
- `server/migrations.sql` creates normalized clinic/user/patient/encounter/procedure/media/session/audit tables on startup. It is idempotent for this initial schema. Further schema changes must use explicit versioned migrations; do not edit existing tables in place and assume automatic upgrades.
- Files use generated server keys outside public assets. SHA-256, byte count, source and assignment are retained. Upload IDs provide retry idempotency. Originals are never overwritten.
- Upload signature checks validate common file headers, not full decoding or malware safety. This is one of the reasons real patient media is prohibited.
- A browser queue holds up to 10 files, 25 MB each. Confirming uploads them as `pending_review`, then commits the batch transactionally. Failed transfers remain reviewable after refresh. There is no background/offline PHI queue or browser persistent storage.
- Image derivatives are rasterized in the browser and uploaded as new PNG files with original linkage and an edit manifest. Crop is a defined 10% edge crop; freeform cropping is not included. Rotation/crop clears drawings with visible guidance. Image exports are limited to 1800 pixels. Video/audio playback and recording are included; video trim and transcription are not.

## Files

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Authenticated shell, patient charts, encounters, notes, team and activity screens |
| `src/api.ts` | Cookie-authenticated API and idempotent upload/review requests |
| `src/components/AuthGate.tsx` | Setup/sign-in and session handling |
| `src/components/CaptureStudio.tsx` | Shared patient context, browser capture, multi-file review queue |
| `src/components/MediaStudio.tsx` | Filtered gallery, comparison and non-destructive photo editing |
| `src/components/Dialog.tsx` | Native modal with browser focus containment and return focus |
| `src/domain/workspace.ts` | Domain contracts and client validation |
| `server/app.mjs` | Authorization, validation, persistence and private media routes |
| `server/index.mjs` | Server start/shutdown |
| `tests/` | Unit/domain, HTTP integration, and browser journeys |
| `infra/aws/` | Fictional-data AWS demo template and deployment runbook |

Legacy handoff components remain in `src/components/` but are not used by the new application. They should not be mistaken for wired production features.

## Commands and environment

Use the existing checkout. A separate Git worktree is unnecessary.

- `npm run dev`: Node API on 127.0.0.1:3001 and Vite on port 5173. Vite proxies `/api`; never expose Vite as an Internet service.
- `npm run build && npm start`: one frontend/API origin.
- `npm test`: temporary HTTP server + SQLite integration tests and domain tests.
- `npm run test:e2e`: builds must exist first; launches an isolated app on port 3201 and a bundled test Chromium. Does not require a separately running dev server or browser download.
- `node scripts/package-source.mjs`: explicit source-only ZIP, excluding databases, uploads and secrets. Requires Python 3 for archive creation.

| Variable | Purpose |
| --- | --- |
| `MEDA_DATA_DIR` | Durable private directory; defaults to `.meda-data` |
| `PORT` | Server port, default 3001 |
| `HOST` | Bind address, default 127.0.0.1; Docker uses 0.0.0.0 |
| `APP_ORIGIN` | Exact public HTTPS origin for production write requests |
| `MEDA_SETUP_KEY` | Private first-run key, required before production setup |
| `NODE_ENV=production` | Secure cookies and production response headers |

The server refuses first production startup without an origin and setup key. Never commit `.env`, `.meda-data`, or credential values. Development uses a local password-based identity store; it is real authentication but not the Cognito/MFA identity system in the clinical handoff. Password reset, account suspension, and self-service password changes still need implementation.

## Data and operational limits

Single process / one instance only. Do not scale SQLite and private files across instances. Use persistent disk and back up both database and media. Shut the app down cleanly before filesystem snapshots, or use SQLite's online backup API plus a coordinated media snapshot. Production clinical hosting should migrate to the PostgreSQL/private-S3 architecture in the original handoff.

The activity feed records modifications and logins, not every record read. Roles are fixed in this release rather than granular per-capability toggles. Note drafts use optimistic versions to prevent silent overwrites; no signing workflow is provided. File signature validation and local disk storage are appropriate for controlled synthetic testing, not a clinical assurance claim.

## Delivery

No developer credentials or first account have been pre-created. The owner creates the initial account after opening the app. The GitHub repository contains no patient database or uploaded media. GitHub Actions runs build, API/domain tests and browser tests, and uploads synthetic screenshots. Check the remote workflow result independently before claiming CI passed.
