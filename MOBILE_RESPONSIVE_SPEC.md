# Meda Mobile Responsive Implementation — Mandatory

## Status
Approved mobile UX direction. This is the mobile presentation of the SAME authenticated Meda web application, not a separate native app or independent database. Implement in production routes/components, not merely a static screenshot.

## Visual reference
Approved October 2026 10-screen mobile storyboard: dark navy backgrounds, purple primary actions, clean rounded cards, bottom navigation, large touch targets, reduced information density, clinical photo thumbnails with privacy-safe previews, blurred nonessential anatomy. Retain existing official Meda logo asset at `public/assets/meda-logo.png`. Never place patient PHI in public/static assets or screenshots.

## Responsive rules
- At viewport widths <= 767 CSS pixels, use mobile layout; >= 768 use adaptive tablet/desktop layout. Ensure landscape and tablet work without horizontal overflow.
- Mobile bottom navigation: Patients, Capture, Media, Device, More. Fixed at bottom with safe-area inset, active purple icon and label; main content must not be obscured.
- Use at least 44x44 CSS-pixel tap targets, readable labels, keyboard-safe forms, accessible focus/contrast, screen-reader labels.
- No desktop 4-column patient/body-map/inspector workspace squeezed into phone width. Present one task at a time, with stacked cards and drill-down pages.
- Preserve session and navigation state on resize; server-side authorization must be identical on mobile and desktop.

## Required mobile pages / flows
1. Sign-in: email/password, validation, forgot password; reuse actual auth service.
2. Patients: search by name/MRN, add patient per permission, scrollable cards; click opens patient profile.
3. Patient profile: name, DOB/MRN, key chart summary (skin history, pathology, allergies, medications), encounters list and New Encounter action; protected PHI.
4. Encounter / procedure: chronological encounters, procedure detail, short notes, consent documentation, media thumbnails.
5. Capture: active patient always visible; Glasses / Phone / Upload segmented source; Photo / Video / Audio controls where supported. Browser camera/microphone permission handling. Glasses UI must show genuine adapter status, not fabricated live connectivity.
6. Review & assign: review captured/uploaded media; verify patient and select encounter/procedure; allow reassignment before commit; handle cancellation, interrupted uploads and duplicates.
7. Media gallery: All / Photos / Videos / Audio filters; thumbnails, encounter grouping and secure playback.
8. Media editor: crop, rotate, draw, label, side-by-side comparison, trim video; original preserved; save derived version with audit metadata.
9. Anatomical location: simple Front / Back location picker and structured region names. Use privacy-safe silhouettes; blur or neutral schematic for any potentially sensitive reference art.
10. Device settings: Mentra Live connection state, battery (when available), quality and audio controls only if SDK capabilities support them, capture commands, upload queue/sync status, error and retry UX. AI and EHR under More are visibly disabled as coming soon.

## Implementation contract
- Share design tokens, API client, authentication, domain types and media pipeline with desktop. Use responsive components or shared route components with mobile variants; do not duplicate business logic.
- Use mobile-specific shell with bottom tabs and nested route stack. On mobile, capture defaults to the last explicitly selected patient only if still authorized; always show identity confirmation.
- Keep device controls behind `CaptureDeviceAdapter`; implement a safe mock adapter for development and a real Mentra adapter in the separate integration project.
- Offline queue must encrypt locally held PHI/media where feasible and use bounded retention, user-scoped access, explicit error state, reliable idempotent upload and purge on logout; no unencrypted persistent browser cache of clinical media.
- Use mock/synthetic data for previews and automated tests. Real pilot must not launch before security/compliance review.

## Acceptance tests
- Playwright mobile viewports: 375x812, 390x844, 430x932, 768x1024; desktop 1440x900.
- No horizontal overflow, clipped buttons, overlays over navigation, or inaccessible dialogs.
- Patient -> encounter -> procedure -> capture -> review -> save -> gallery flow on phone.
- Phone capture and file upload function with permissions and error states; glasses commands gracefully unavailable without connected hardware.
- Crop/rotate/annotate and video trim persist derivative while original remains immutable.
- RBAC, patient isolation, upload authorization, audit logs, consent display, and logout work identically on mobile and desktop.
- Keyboard, VoiceOver/TalkBack basics, safe-area and touch-target checks.

## Starter implementation status
`src/components/MobileApp.tsx` and `src/components/mobile.css` contain a responsive **visual/demo scaffold** with functioning local navigation and selection. It is NOT connected to the clinical backend, browser camera, uploads or glasses, and is NOT production-ready. Codex must replace demo state and placeholder interactions with real authenticated routes and backend services.
