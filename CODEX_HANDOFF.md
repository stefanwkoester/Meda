# Codex Handoff — Meda Dermatology Beta

## Your goal

Reproduce the Meda dermatology web application so it visually matches `reference/patient-body-map-reference.png` and `reference/dashboard-reference.png` while preserving the product behavior in this repository.

Do not redesign the product into a generic admin dashboard. Maintain the specific Meda character:

- premium clinical software
- dark navy shell
- purple/blue gradient brand accent
- high information density without feeling cluttered
- media-first workflows
- anatomical spatial organization
- longitudinal change tracking
- calm, patient-centered language

## Exact brand asset

Use `public/assets/meda-logo.png` as the canonical logo. Do not substitute or redraw the mark unless explicitly asked.

## Primary screens

### 1. Case Log / Dashboard

Purpose: rapidly locate a patient or recent dermatology case.

Main areas:

- fixed left navigation
- global patient/case search
- activity summary cards
- recent cases table/list
- selected-patient preview panel
- body-map mini preview
- case timeline

### 2. Patient Skin Map

This is the signature Meda screen and should receive the most design attention.

Main areas:

- left patient rail
- body-map exam history
- patient statistics
- large central anterior/posterior body imagery
- spatial markers for findings
- additional standardized views
- selected-finding inspector on the right
- lesion image history
- pathology/procedure metadata
- surgical video/media strip

### 3. Finding Detail

A finding is a persistent object tied to anatomy and time.

It should include:

- stable finding ID
- anatomical location
- finding category
- size and structured measurements
- current status
- photo/video media
- comparisons across timepoints
- biopsy/procedure/pathology information
- clinician notes

## Interaction assumptions

Implement the following behavior unless backend requirements later override it:

- Clicking a patient opens the patient record and preserves last active tab.
- Clicking a body-map marker selects the finding and opens the right-side inspector.
- Clicking a lesion thumbnail changes the main preview.
- Clicking a historical timepoint compares that lesion against the current image.
- “Add Media” begins a capture/import flow associated with the current patient.
- “New Exam” creates a new dated body-map session.
- “Compare” enters a two-timepoint comparison mode.
- “Open Case” goes to the full patient case workspace.
- “Share Case” must default to **private/internal sharing**. Global sharing requires an explicit de-identification workflow and confirmation.
- Video play controls never autoplay clinical media.
- Search covers patient name, MRN, case label, anatomical site, finding ID, pathology text, and clinician tags.

## Patient-centered UX

Protect context and dignity:

- Avoid showing full-body clinical photographs on dashboard thumbnails when a localized image is sufficient.
- Use neutral terms such as “finding,” “site,” “image,” and “comparison.”
- Never use alarming AI labels in the beta.
- Keep patient identity visible while inside a chart to reduce wrong-patient errors.
- Show capture date on every comparison.
- Clearly distinguish clinician-entered facts from future AI-generated suggestions.
- Any future AI output must be reviewable, editable, and never silently inserted into the medical record.

## Responsive rules

Desktop is primary for beta.

- >=1440 px: full 3-column skin-map layout.
- 1100–1439 px: narrower patient rail and right inspector.
- 768–1099 px: patient rail becomes drawer; inspector becomes slide-over.
- <768 px: stack into mobile case-view; do not attempt to display front/back full-body maps side-by-side.

## Accessibility

- WCAG AA contrast minimum.
- Visible keyboard focus states.
- Every marker has accessible text: finding ID, category, body location, status.
- Never rely only on marker color; pair color with icon/shape/category label.
- Images require clinically meaningful alt text where appropriate.

## Coding preferences

- React + TypeScript.
- CSS variables for design tokens.
- Components should remain backend-agnostic.
- No PHI in source code, analytics payloads, logs, URLs, or localStorage.
- Mock data lives only in `src/data/`.
- Keep all network calls behind a future `services/` layer.
- Avoid hard-coding layout into one giant component.

## Definition of visual success

A first-time user should immediately understand:

1. which patient is open,
2. when the skin exam occurred,
3. where findings are located,
4. which finding is currently selected,
5. how that finding changed over time,
6. what procedure/pathology is associated with it,
7. how to add new media or start another exam.
