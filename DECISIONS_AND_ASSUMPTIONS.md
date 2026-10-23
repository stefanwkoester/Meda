# Final decisions, assumptions and open validation items

## Fixed user decisions
Dermatology-only beta; one clinic, few providers + staff; email/password; configurable role permissions; AWS; real patient data controlled pilot; manual + CSV patient creation; full dermatology chart including skin history, pathology, medications and allergies; Patient -> Encounter -> Procedure; simple anatomical location picker (not stitched skin map); glasses + phone/browser + manual media; photos/videos/audio; chronological timeline and procedure grouping; image crop/rotate/draw/label/compare and video trim; select patient before capture, reassignment after review; short procedure notes; EHR architecture only; disabled future AI sections; Mentra Live; website and glasses control pathways; live transfer plus offline queue as device capability allows; controls for capture, quality, audio and battery; document existing institutional consent; full-stack AWS build by Codex, hardware integration later by second developer.

## Reasonable implementation assumptions (clinic must validate)
- Consent verified per encounter/capture and scope; clinic provides actual policy, form identifiers and permitted modalities.
- Staff may draft notes but only credentialed clinicians sign; clinic can configure permissions.
- Patient MRN unique within clinic; timezone clinic-configured; no public sharing.
- Browser camera functionality subject to permissions/HTTPS/device support; phone capture uses browser getUserMedia and file input fallback.
- Device live upload is aspirational pending actual Mentra Live SDK/hardware testing; offline queue belongs to native companion when browser cannot access device directly.
- S3 originals retained immutably; retention period defined by clinic, not hard-coded.

## Blocking external facts to confirm before PHI pilot
Clinic name/ownership and BAA signatories; actual institutional consent policy (photo, video, audio, teaching use); data retention and record amendment requirements; exact patient demographic fields and clinical template; region and residency requirements; role matrix approval; actual Mentra Live firmware/SDK/phone OS; vendor BAAs and permitted PHI handling; maximum recording length/storage budget; emergency downtime process; security assessor and clinic compliance owner.

## Non-goals
Global case sharing, public educational library, diagnostic AI, AI transcription, EHR exchange, full-body stitched skin atlas, real-time remote mentoring, billing automation.
