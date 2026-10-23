# Instructions to Codex

You are building the Meda dermatology controlled-pilot web app. Implement the product described in `CODEX_MASTER_SPEC.md` and API contract in `DATA_MODEL_AND_API.md`. Do not substitute a static mockup for functional requirements. Implement in vertical slices, run tests and show results.

## Non-negotiable
- Reuse exact `public/assets/meda-logo.png` as brand asset; do not generate a replacement.
- Preserve dark navy / purple aesthetic and page hierarchy of `reference/dashboard-reference.png`. Keep UI patient-centered, readable and responsive. Do not copy invented clinical facts from design reference into real charts.
- Primary hierarchy: Clinic -> Patient -> Encounter -> Procedure -> Media, with finding/anatomical labels optional.
- A single clinic for pilot; RBAC still enforces clinic ownership on EVERY server-side read/write, even if only one clinic is configured.
- Never use mock auth or browser localStorage for PHI. Do not store PHI in logs, analytics, error monitoring, browser cache or client-side persistent storage.
- Original media objects immutable. Transformations produce versions, never overwrite source. Store auditable actions and link originals/derivatives.
- Browser camera permission, device availability and failures handled gracefully. No fabricated connection to Mentra hardware.
- No live diagnostic AI, billing automation, global case sharing or EHR exchange in beta; disabled future features clearly labeled.
- Consent status documents existing institutional consent and scope; no assumption that capturing consent checkbox alone satisfies policy.
- Do not claim HIPAA compliance from code or AWS alone. Complete all deployment/security gates before PHI pilot.
- Device commands go through versioned interface and adapter; stub returns explicit `NOT_CONNECTED` / `NOT_SUPPORTED` and uses synthetic demo mode only when clearly labeled.

## Implementation sequence
1. Establish workspace, API, database, migrations, local compose, auth and RBAC.
2. Patient list/detail, dermatology profile, encounters/procedures, anatomical picker.
3. Upload + browser photo/video/audio capture, review queue, consent checks, storage and signed access.
4. Non-destructive editor (crop, rotate, draw, label, compare, trim), save versions, procedure notes.
5. Device page and backend API/SDK adapter seam; offline ingest protocol; fake-device integration tests.
6. IaC and deployment pipeline; tests, threat model, accessibility and pilot runbook.

## Output standards
For each vertical slice: implementation, migrations, API contract, tests, screenshots, risks, deployment notes. Flag external services and unverified Mentra capabilities; never silently fake functionality.

## Mandatory mobile implementation
Read `MOBILE_RESPONSIVE_SPEC.md` before modifying the frontend. The approved mobile storyboard is a binding design requirement. Build mobile as the same authenticated responsive website, with five bottom tabs and the specified ten flows; do not treat it as an optional mockup. `src/components/MobileApp.tsx` is only a demo scaffold and must be wired to production routes and backend.
