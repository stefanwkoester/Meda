# Database and HTTP API contract

## Architecture choice
Recommended: TypeScript monorepo; React + TypeScript frontend, Node TypeScript API (Fastify or NestJS), PostgreSQL (RDS), S3 private media storage, async processing queue. OpenAPI 3.1 generated from implementation, typed client generated from OpenAPI. Use UUID/ULID opaque IDs, UTC timestamps and server-side authorization. Prefer normalized relational data, JSONB only for extensible dermatology fields and editor manifests.

## Required tables (minimum)
- clinics(id, name, timezone, retention_policy_id)
- users(id, clinic_id, email, password_auth_subject, status, created_at)
- roles(id, clinic_id, name); role_permissions(role_id, permission); user_roles(user_id, role_id)
- patients(id, clinic_id, mrn, first_name, last_name, dob, contact_json_encrypted, created_at, archived_at); unique(clinic_id,mrn)
- patient_history(id, patient_id, type, structured_payload, entered_by, effective_at, version)
- medications(id, patient_id, name, dosage, status, updated_at); allergies(id, patient_id, substance, reaction, severity, updated_at)
- pathology_reports(id, patient_id, encounter_id_nullable, procedure_id_nullable, specimen_label, result, collected_at, report_date, status)
- encounters(id, patient_id, clinic_id, date, reason, clinician_id, status)
- procedures(id, encounter_id, type, site_code, site_label, laterality, description, performed_at, status)
- anatomical_findings(id, patient_id, anatomical_region_code, laterality, description, category, status, created_at) [optional but useful for continuity]
- consents(id, patient_id, encounter_id_nullable, consent_type, source_institution, reference, scope, verified_by, verified_at, effective_at, expires_at_nullable, status)
- capture_sessions(id, clinic_id, patient_id, encounter_id, procedure_id_nullable, initiated_by, device_id_nullable, source, state, started_at, ended_at, consent_id)
- media_assets(id, clinic_id, patient_id, encounter_id, procedure_id_nullable, capture_session_id_nullable, media_type, source, phase, anatomical_region_code_nullable, state, original_s3_key, sha256, mime_type, bytes, captured_at, uploaded_at, created_by, reviewed_by_nullable, committed_at_nullable, deleted_at_nullable)
- media_versions(id, media_asset_id, parent_version_id_nullable, derivative_s3_key, editor_manifest_json, sha256, created_by, created_at)
- notes(id, encounter_id, procedure_id_nullable, body, status[draft|signed|amended], author_id, signed_by_nullable, signed_at_nullable, version)
- devices(id, clinic_id, hardware_model, display_name, paired_user_id_nullable, adapter_type, capability_json, status, last_seen_at)
- device_jobs(id, device_id, capture_session_id_nullable, command, idempotency_key, status, requested_by, requested_at, completed_at_nullable, error_code_nullable)
- ingest_jobs(id, clinic_id, capture_session_id, external_capture_id, media_asset_id_nullable, checksum, state, attempt_count, last_error, updated_at); unique(clinic_id, external_capture_id)
- audit_events(id, clinic_id, actor_user_id_nullable, action, target_type, target_id, event_time, outcome, ip, user_agent, metadata_redacted)

## API convention
All endpoints `/api/v1`. Require auth, RBAC, tenant-scoped DB queries, input validation, request IDs and structured errors. Use cursor pagination and optimistic concurrency on updates. No PHI in query strings, URLs, logs or error payloads. Server-side rate limits. Example resources:

- `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/password-reset/request` (generic responses); prefer Cognito-backed auth/session management.
- `GET/POST /patients`, `GET/PATCH /patients/{id}`, `POST /patients/import/preview`, `POST /patients/import/commit`
- `GET/POST /patients/{id}/encounters`, `GET/PATCH /encounters/{id}`, `GET/POST /encounters/{id}/procedures`, `GET/PATCH /procedures/{id}`
- `GET/POST /patients/{id}/history`, `GET/POST /patients/{id}/medications`, `/allergies`, `/pathology`, `/consents`
- `POST /capture-sessions`, `GET/PATCH /capture-sessions/{id}`, `POST /capture-sessions/{id}/complete`
- `POST /media/uploads/initiate` (patient/encounter/consent checks, file metadata), `POST /media/uploads/{uploadId}/complete` (server checksum verification, scan/process), `GET /media?patientId=...`, `GET /media/{id}`, `POST /media/{id}/review`, `POST /media/{id}/commit`, `POST /media/{id}/reassign`, `POST /media/{id}/versions`, `GET /media/{id}/download-url` (short-lived scoped signed URL), `POST /media/{id}/archive`
- `GET/POST /notes`, `PATCH /notes/{id}`, `POST /notes/{id}/sign`
- `GET /devices`, `GET /devices/{id}/capabilities`, `POST /devices/{id}/commands`, `GET /devices/{id}/jobs/{jobId}`, `GET /devices/{id}/sync-status`
- `POST /device-ingest/initiate`, `POST /device-ingest/{id}/complete` (idempotent external_capture_id), `GET /device-ingest/{id}`
- `GET /audit-events` (authorized admin/auditor only)

## Media upload lifecycle
`created -> uploading -> scanning -> processing -> pending_review -> committed` OR `failed/quarantined`. Server creates short-lived presigned multipart upload; private S3 bucket; object encryption; size/type validation; verify SHA256; malware scanning; processing via queue; thumbnail/transcode derivatives; only publish signed read URLs after RBAC and review. Media is NOT chart-committed until reviewed. Keep ingest event idempotency to prevent duplicate recording on retry.

## Notes / editor
Draft autosave with version check; signed notes immutable and amendable via new version. Editor operations stored as ordered manifest (`crop`, `rotate`, `draw`, `text`, `trim`) plus derivative file. Use background processing for expensive video trims. No overwriting originals.

## Error shape
`{ "error": { "code": "CONSENT_REQUIRED", "message": "...", "requestId": "..." } }`; stable codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, CONSENT_REQUIRED, MEDIA_TOO_LARGE, UNSUPPORTED_FORMAT, DEVICE_OFFLINE, NOT_SUPPORTED, UPLOAD_FAILED, INTEGRITY_MISMATCH, RATE_LIMITED.

## Integration seams
Provide an `EhrAdapter` interface with `exportEncounter`, `exportMediaManifest` but default disabled/no-op; no external EHR calls in pilot. Provide `DeviceAdapter` contract per separate file. Do not mix SDK imports into frontend components or core domain services.
