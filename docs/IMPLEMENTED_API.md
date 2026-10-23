# Implemented HTTP API — fictional-data workspace

This document describes actual implementation. `DATA_MODEL_AND_API.md` is the broader target clinical contract and is not a claim that every proposed route exists.

Base `/api/v1`. JSON errors have `{error:{code,message}}`. Authenticated writes require an HttpOnly `meda_session` cookie, `X-CSRF-Token` from the session response, and an exact allowed Origin. Production requires `APP_ORIGIN`; development permits documented loopback origins. No CORS access is enabled.

| Route | Behavior / access |
| --- | --- |
| `GET /health` | Public readiness response |
| `GET /auth/status` | Public setup/key-required flags only |
| `POST /auth/setup` | First admin/clinic, protected by setup key when configured; unavailable after first user |
| `POST /auth/login` | Email/password; generic failure; IP attempt limit |
| `GET /auth/session` | Current user, clinic and CSRF token |
| `POST /auth/logout` | Revoke current server session |
| `GET /workspace` | Clinic-scoped patients, encounters/procedures, committed and pending media |
| `POST /patients` | Admin/physician/assistant; name, unique MRN, age, sex |
| `PATCH /patients/:id` | Clinical staff; history/medications/allergies plus matching `version` |
| `POST /patients/:id/encounters` | Clinical staff; `reason` |
| `PATCH /encounters/:id` | Clinical staff; draft `note` plus matching `version` |
| `POST /encounters/:id/procedures` | Clinical staff; `type`, `site`, `phase` |
| `POST /media/uploads` | Clinical staff; one multipart file, 25 MB, type/signature and assignment checks; idempotent UUID upload |
| `POST /media/review` | Clinical staff; confirmed review, atomic 1–10-file chart commit, no post-commit reassignment |
| `GET /media/:id/content` | Clinic-scoped private media; authenticated, no-store, supports browser playback |
| `DELETE /media/:id` | Clinical staff; discard only an uncommitted upload; committed originals cannot be deleted |
| `GET /team`, `POST /team` | Admin only; accounts in current clinic; new physician/assistant/auditor roles |
| `GET /audit` | Admin/auditor only; latest 100 modification/login actions, no note bodies |

Upload fields: `file`, `id` (UUID), `patient` (opaque ID), `encounterId`, `procedureId` (optional), `site`, `phase` (`Pre`, `Intra`, `Post`), `source`, `displayName` (UTF-8). An edited PNG also supplies `parentId` and a JSON `manifest` with rotation, crop and annotation count. Original/derivative assignments must agree.

Review JSON: `{ids, patient, encounterId, procedureId, site, phase, confirmed:true}`. Files become gallery-visible only after successful commit. The browser never treats a failed request as saved. Pending files remain available for review/recovery after a refresh.

Roles are fixed, all clinical queries include clinic ownership checks, and missing/foreign records return a generic not-found response. This is not yet the full OpenAPI-generated clinical API, signed-S3 upload pipeline, processing queue, consent service or immutable note-signing service from the handoff.
