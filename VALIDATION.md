# Validation for Meda 0.2

## Passed locally

- TypeScript and Vite production build.
- **16 API/domain tests**, including real HTTP authentication, CSRF/origin checks, bootstrap key and Secure-cookie behavior, role restrictions, clinic isolation, duplicate MRNs, encounter/procedure relationships, stale-note conflicts, upload content validation and idempotency, review confirmation, private media access, and persistence through a real server/database restart.
- **26 browser checks** covering first-account setup, provider sign-in/out, patient/encounter/procedure creation, draft notes and unsaved changes, upload/review/gallery, patient-scoped filtering, actual derived PNG creation, byte-for-byte original preservation, undo/redo/drawing/labels, side-by-side comparison, camera denial, photo/video/audio recording with mocked synthetic live tracks, mobile upload, and overflow checks at 375, 390, 430, 768, and 1440 CSS pixels.
- No uncaught browser page errors during those journeys.
- Native dialogs provide focus containment and Escape dismissal. Browser tests exercise the dialogs; no independent screen-reader or formal accessibility certification has been performed.
- App server executed as a **non-root user inside the official Node 24 Docker image** with private persistent storage. Account creation and five seeded patients worked, and the initialized database survived a container restart.
- AWS CloudFormation template passed `cfn-lint`; deployment shell script passed `bash -n`.

## Limits and unrun checks

- The cloud machine's Docker image builder stalled at a RUN instruction even for a minimal `node -e` check, in both BuildKit and legacy builder. The app's container runtime was tested, but the full multi-stage image build remains unverified. Test `docker compose up --build` in the developer/AWS environment before deployment.
- No AWS resources were created. No customer AWS account, region, DNS hostname, or live HTTPS deployment is configured. Offline template validation does not establish AWS deployment or application readiness.
- Real cameras, microphones and Mentra hardware were not tested. The browser's native capture/recording paths were exercised with synthetic media streams; device failure was checked separately.
- Remote GitHub Actions results require independent inspection after the push. Local tests passing are not a claim that a remote CI run passed.
- No real patient data was used. This is a functional fictional-data development release, not a completed clinical pilot or HIPAA compliance claim.

See `DEVELOPMENT.md`, `docs/IMPLEMENTED_API.md`, and `infra/aws/AWS_DEMO.md` for supported scope and remaining clinical/operational requirements.
