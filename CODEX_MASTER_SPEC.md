# Product and UX specification — Meda Dermatology Pilot

## 1. Scope and personas
One dermatology clinic with a few providers plus clinical staff. Email/password sign-in; invite-only user provisioning, no public registration. Configurable roles: Clinic Admin, Physician, Nurse/MA, Read-only Auditor. Admin manages permissions via granular capability toggles (patients.read/write, encounters.read/write, media.capture/upload/edit/delete, notes.draft/sign, device.control, users.manage, audit.read). Clinical record signing restricted to credentialed physician role by default.

## 2. Visual identity
Use supplied gradient Meda logo exactly. Primary inspiration `reference/dashboard-reference.png`: dark navy sidebar and header, violet active state, off-white main canvas, spacious rounded cards, subtle borders, restrained shadows. Existing `src/styles/tokens.css` is a visual starting point; consolidate into named tokens. Accessible contrast WCAG AA; visible keyboard focus; minimum 44px touch targets where practical. Responsive desktop/tablet/mobile; mobile browser capture first class. No real PHI in demo screenshots.

## 3. Navigation / pages
- Dashboard: patient search, recent encounters, capture activity, pending review queue, device connection indicator, primary New Patient/New Encounter/Capture actions. Click a patient -> detail; click a pending upload -> review queue.
- Patients: searchable/sortable table (name, DOB, MRN, last encounter), create/import, duplicate detection, status. Do not put PHI in URL slugs; use opaque IDs.
- Patient detail: header with demographics, allergies alert, clinical tabs Overview / Encounters / Media / Dermatology History / Pathology / Medications / Allergies. Media gallery and chronological timeline. Simple anterior/posterior anatomical silhouette with clickable named regions, not photorealistic stitching.
- Encounter detail: date, reason, provider, procedure list, media timeline, short note, consent documentation; add procedure and capture.
- Procedure detail: type, anatomical site/laterality, description, media, pre/intra/post labels, short procedure note with template, draft/sign state. Optional pathology reference and follow-up.
- Media library: patient/encounter/procedure filtered photo/video/audio gallery; preview and metadata, editor, versions, compare, review queue. No global public sharing.
- Device: Mentra Live status, connect instructions, camera/photo/record controls, supported video quality/audio controls, battery, pending sync, errors and reconnect. Explicit 'Integration pending' before hardware developer connects it; demo simulator must be labeled.
- Settings: clinic, staff roles, password/security, consent policy metadata, audit access (privileged), retention policy configuration (admin only), device pairing status.
- AI and EHR: visible as 'Coming later', nonfunctional and never misleadingly active.

## 4. Data entry
Patient: full dermatology-specific chart (name, DOB, MRN, optional contact, skin cancer history, family history, relevant risk/exposure history, prior procedures, medication list, allergies, pathology records, clinical notes). Limit collection to minimum necessary for clinical pilot and clinic-approved fields. Structured + free-text where appropriate; timestamps and authorship on changes. CSV import with preview, required mapping, validation, duplicate MRN resolution, error report, all-or-nothing or explicit per-row results; do not silently overwrite.

## 5. Clinical flow
1. Select patient (mandatory before normal capture). Create/open encounter and optionally procedure.
2. Verify patient identity and institutional photo/video consent status + scope. Display blocking warning if status unknown/expired/not applicable; staff may document institutional consent evidence and permitted scope, not manufacture consent.
3. Choose Capture: glasses (placeholder until integrated), phone/browser camera or upload. Photo/video/audio via browser capabilities and permission prompts; fallback to file picker.
4. On ingest, assign to patient and encounter and optional procedure; media enters `pending_review` with capture source/time, orientation, anatomy label, pre/intra/post category.
5. Reviewer checks thumbnail and patient/encounter; can reassign BEFORE committing, with confirmation and audit event. After commit, corrections require privileged audited move; preserve history and links.
6. Commit to chart -> appears in timeline/gallery; optional edit generates new version. Create/edit draft procedure note and physician sign.
7. Search/retrieve chronologically, by procedure or anatomy. Comparison shows two images side by side with timestamps and zoom; no automated image registration or growth measurements.

## 6. Media editor (pilot)
Image: rotate, crop, draw, text label, undo/redo, compare two photos. Video: non-destructive start/end trim and poster frame; playback with timeline; do not promise frame-accurate advanced editing if transcoding not available. Audio: player and metadata, no transcription in pilot. Save edits as separate derivatives with transformation manifest; original downloadable only to authorized roles. Record edit author/time, prevent accidental unsaved navigation. Strip location EXIF from derivatives and avoid exposing sensitive metadata publicly, while preserving clinical provenance securely. Use server-validated formats, size limits and malware checks.

## 7. Device behaviors
Controls: Connect, Take Photo, Start/Stop Recording, quality, audio, battery, pending upload, connection health. Show only controls supported by discovered hardware capabilities; unsupported ones disabled with explanation. Device capture requires active patient context and confirmation at upload review. Glasses button/voice capture events can be received later by adapter. Allow deferred upload when offline; never assume browser can directly pair/control glasses.

## 8. States, accessibility and safety
Loading/empty/error/permission denied/no camera/offline/upload progress/processing failure/retry states. Never display 'Saved' until server commit succeeds. Confirm destructive actions; soft-delete policy and admin recovery. Prevent browser cache of PHI. Keyboard/screen-reader labels, accessible contrast, mobile layouts. All patient names/data in UI prototype must be fictitious.

## 9. Excluded from pilot
AI diagnosis, AI op note generation, live EHR integrations, public/global sharing, full-body stitched photography, automatic lesion tracking, billing coding, Mentra SDK implementation. Keep future seams, not fake working functionality.

## Approved mobile UI — required
See `MOBILE_RESPONSIVE_SPEC.md` for mobile page-by-page requirements, breakpoint, bottom navigation, capture workflow, security and acceptance criteria. Mobile is a responsive presentation of the same website and backend. The starter `MobileApp` component is illustrative only.
