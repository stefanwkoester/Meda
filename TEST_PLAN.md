# Test plan and acceptance criteria

## Automated tests
- Unit: patient MRN uniqueness per clinic, role capabilities, consent scope/expiry, note signing, editor manifests, capture state machine.
- Integration: auth, RBAC/IDOR denial, CSV import preview/commit, encounter/procedure linkage, presigned upload completion/checksum, media review/reassignment, versioning, signed URL expiry, device idempotency and retry.
- E2E browser: responsive dashboard, patient create/search, create encounter and procedure, browser photo/video/audio capture with mocked permissions, upload file, review/commit, crop/rotate/draw/label, compare, trim, short note draft/sign, device page offline/unsupported states.
- Security: no PHI in console/network errors/logs, access controls on S3 read URL issuance, rate limiting, CSRF/XSS, cross-patient and cross-clinic access attempts, malware/unsupported media rejection.
- Accessibility: keyboard navigation, focus, labels, contrast, touch controls, screen reader basics.

## Acceptance scenarios
1. Admin invites clinician and MA; permissions restrict note signing to clinician.
2. MA imports 20 synthetic patients, sees invalid rows and duplicate MRNs, commits validated subset only.
3. Clinician selects patient, creates encounter with two procedures and a short draft note.
4. Phone/browser takes photo; user sees permission denial guidance when camera blocked. Manual upload fallback works.
5. Captured video/photo/audio enter pending review; unreviewed files do not appear as committed chart media.
6. Reviewer changes incorrect patient assignment before commit, confirms destination and audit entry; no cross-patient thumbnail leakage.
7. Editor crop/rotate/annotate/trim creates derivative; original unchanged, hash and provenance retained.
8. Compare two photos with date/site metadata; no unsupported automatic lesion measurement.
9. Device tab reports Mentra 'not connected' truthfully, offers supported control placeholders; fake adapter tests run without hardware.
10. Simulate duplicate `external_capture_id`, intermittent upload and server crash; one committed asset, resumed transfer, correct checksum.
11. Signed physician note cannot be edited in place; amendment creates linked version.
12. Unauthorized user cannot view another role's restricted assets; expired signed URL fails.
13. Restore database and media from backup in staging, document recovery time.
14. All PHI pilot gates in `AWS_SECURITY_DEPLOYMENT.md` have evidence and owners before go-live.

## Definition of done
Builds cleanly, migrations reproducible, automated CI green, no fake 'connected/saved' statuses, all primary journeys demonstrated using synthetic data, deployment scripts documented, separate hardware adapter spec implemented as mock, known risks documented. Actual PHI launch requires external approvals, not only test completion.

## Mobile-specific acceptance
All scenarios and viewports in `MOBILE_RESPONSIVE_SPEC.md` must pass before pilot release. The mobile demo scaffold does not satisfy backend/security requirements.
