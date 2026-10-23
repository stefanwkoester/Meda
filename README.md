# Meda — dermatology provider workspace

A working, responsive app for **fictional-data provider evaluation**, with real accounts and server-side persistence. This builds on the supplied Meda design handoff. It is not approved for real patient information or a clinical pilot.

## Run

Requires Node.js 24+, npm, and a writable local disk.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Create the first administrator account in the setup screen; there are no default credentials. Setup adds five explicitly fictional dermatology patients. Subsequent accounts are created under **Settings & team** by the administrator.

To run the built app:

```sh
npm run build
npm start
```

The built app serves its frontend and API together on port 3001. For local Docker use, run `docker compose up --build` and open port 3001 on your computer. The compose file binds only to loopback and is not an Internet deployment.

## Provider workflow

1. Find a patient by name or MRN. Open the chart and maintain allergies, medications, and dermatology history.
2. Create an encounter, add dermatology procedures and anatomical sites, and save an encounter-specific draft note.
3. Capture a browser photo/video/audio recording or upload supported files. Keep the patient, encounter, optional procedure, site, and phase visible.
4. Review the files and explicitly confirm their assignment. Media becomes visible in the chart gallery only after the server commits the review.
5. Retrieve media by patient, encounter, type, filename, or site. Compare two photos. Crop, rotate, draw, or label a photo and create a separate PNG version while preserving original bytes.

Unfinished server uploads appear in a recoverable review queue. Unsaved notes and local capture queues warn before in-app navigation or refresh. Opaque patient/encounter context in the URL survives a refresh.

## Access and storage

- Admin: manage team accounts and clinical workspace.
- Physician / Nurse or MA: edit charts, notes and procedures; capture/review media.
- Auditor: read-only charts and media; view the activity feed.
- Session cookies are HttpOnly and SameSite=Strict; passwords are scrypt hashes. Production uses Secure cookies, origin checks, CSRF tokens, and a protected first-run setup key.
- SQLite and private media files live in `.meda-data/` (or `MEDA_DATA_DIR`). This directory is ignored by Git and must be backed up and retained across deployments. No patient records, passwords, sessions, or uploads are bundled in source archives.

## Verification

```sh
npm run build
npm test
npm run test:e2e
```

API tests exercise real HTTP requests, role restrictions, cross-clinic isolation, media validation, review, optimistic note updates, and a database/server restart. Browser tests use an isolated temporary database and synthetic media; they do not create accounts in your workspace. Screenshots are written under `artifacts/`.

See [DEVELOPMENT.md](DEVELOPMENT.md) for architecture, limits, and developer handoff; [implemented API](docs/IMPLEMENTED_API.md) for actual routes; and [AWS demo deployment](infra/aws/AWS_DEMO.md) for hosting.

## Hosting status and clinical boundaries

AWS deployment configuration is included, but a public demo exists only after deployment in your authorized AWS account, DNS setup, HTTPS verification, and first-account creation. No hosted address is invented by the app.

Real-patient use requires additional work including managed authentication/MFA/password recovery, consent policy, malware scanning, encrypted database/backups and restore drills, complete audit coverage, retention, security review, and applicable agreements. Clinical note signing, pathology records, CSV imports, video trim, Mentra hardware, AI diagnosis, and EHR connectivity are not implemented. Device and future-feature screens report their status explicitly.

`CODEX_MASTER_SPEC.md`, `DATA_MODEL_AND_API.md`, and `AWS_SECURITY_DEPLOYMENT.md` preserve the original broader pilot requirements. They describe the target clinical product, not completed capabilities in this fictional-data release. The original single-file design demo is preserved in `prototype/Meda-offline-review.html`; it has no accounts or durable storage and is not the current working app.
