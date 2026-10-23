# Independent developer contract — Mentra Live glasses integration

## Purpose and scope
Second developer implements glasses functionality **after** Codex ships stable website/backend and mocked adapter. Hardware target: **Mentra Live**, exact firmware, SDK versions and capabilities to be verified on physical device before work acceptance. Do not assume direct browser Bluetooth or support for a specific video quality/audio setting without testing. Phone companion/bridge may be necessary. All PHI paths must meet pilot security gates.

## Responsibilities
Codex team owns: patient/case context, consent check, `DeviceAdapter` interface, capture sessions, backend auth, signed media upload, review queue, UI status, audit, processing and persistent records, fake adapter tests.
Glasses developer owns: hardware pairing, supported SDK transport (native phone companion/bridge if required), start/stop/photo command handling, event reception for on-glasses button/voice, device state/battery/capabilities, upload and offline queue, reconnect, and device-specific integration tests. No direct writes to patient/encounter tables or raw DB access.

## Adapter contract (TypeScript pseudocode)
```ts
type DeviceCapabilities = {
  photo: boolean; video: boolean; audio: boolean;
  videoQualities: string[]; canToggleAudio: boolean;
  supportsBattery: boolean; supportsLiveUpload: boolean;
  supportsOfflineQueue: boolean; supportsGlassesTrigger: boolean;
};
type DeviceState = {
  deviceId: string; connected: boolean; batteryPercent?: number;
  recording: boolean; activeSessionId?: string;
  syncPending: number; capabilities: DeviceCapabilities;
};
type CaptureContext = {
  patientId: string; encounterId: string; procedureId?: string;
  consentId: string; captureSessionId: string;
};
interface DeviceAdapter {
  discover(): Promise<DeviceState[]>;
  connect(deviceId: string): Promise<DeviceState>;
  disconnect(deviceId: string): Promise<void>;
  getState(deviceId: string): Promise<DeviceState>;
  takePhoto(deviceId: string, ctx: CaptureContext, idempotencyKey: string): Promise<{jobId:string}>;
  startRecording(deviceId: string, ctx: CaptureContext, idempotencyKey: string): Promise<{jobId:string}>;
  stopRecording(deviceId: string, captureSessionId: string, idempotencyKey: string): Promise<{jobId:string}>;
  setSettings(deviceId: string, settings: {videoQuality?:string; audioEnabled?:boolean}): Promise<DeviceState>;
  subscribeEvents(onEvent: (e: DeviceEvent)=>void): ()=>void;
}
```
All commands are asynchronous; HTTP `202` job receipt means accepted, **not** capture completed. Emit status events `connected`, `disconnected`, `capture_started`, `capture_stopped`, `media_ready`, `upload_progress`, `upload_complete`, `upload_failed`, `battery_changed`, `capabilities_changed`, `error`. Use WebSocket/SSE to reflect state in browser; ensure authorization and no PHI in event logs.

## Patient association and safeguards
Normal flow: select patient -> encounter -> procedure optional -> verify consent -> create capture session -> device command. A glasses-initiated capture without active context must be held in encrypted **unassigned quarantine**; never auto-attach to last patient silently. Show explicit identity confirmation at review. Reassignment before commit is allowed and audited; after commit privileged correction with immutable audit trail. In disconnected cases, the companion holds a signed, expiring session context; never infer patient from camera imagery or voice.

## Offline sync protocol
Encrypted storage on companion (OS keystore/keychain protected), app-level session lock, no unencrypted photo gallery writes, background upload subject to OS limits. Queue record: `external_capture_id`, `capture_session_id`, deviceId, file checksum, capturedAt, byte size, mime type, uploadState, retryCount, lastError. Unique idempotency key and checksum required. Resume multipart uploads when possible; exponential backoff, clear user status, manual retry. Reconcile after crashes/restarts; do not mark uploaded until server verifies object and responds. Allow explicit remote wipe/session revocation policy, with honest limitations while device offline.

## Security requirements
TLS, authenticated device-to-backend bridge, short-lived scoped upload credentials, no static cloud keys in mobile app, encryption at rest, PHI-free telemetry, minimum necessary permissions, per-device pairing revocation, lost device process, audited capture commands. Consent verification required for capture flow; never claim recording indicators/physical device privacy properties without test. Confirm HIPAA vendor coverage/BAAs for SDK, transport, streaming, storage and crash reporting before live pilot.

## Capability matrix — verify on actual device
Photo capture, video start/stop, button events, voice triggers, audio enable/disable, quality modes, battery, connection status, background sync, live transfer, offline queue, video length/file size limits, iOS/Android compatibility. Mark each Supported / Unsupported / Requires companion / Unverified with firmware + SDK version + test evidence. Unsupported controls hidden/disabled.

## Deliverables
1. Source repo/module for device adapter and any native companion, build/run docs and SDK license inventory.
2. Hardware compatibility matrix and firmware-tested evidence.
3. API integration tests using fake adapter and hardware end-to-end tests.
4. Failure-mode test evidence: lost connectivity, interrupted capture, duplicate retries, no patient selected, consent missing, storage full, device unpaired, battery low, upload resume, wrong-patient prevention.
5. Operational runbook, pairing/revocation procedure, logs redaction policy and handover demo.

## Acceptance
On a test patient, authenticated clinician selects encounter, records photo and video with Mentra Live, sees truthful device state, disconnects mid-transfer, resumes upload without duplication, reviews and commits to correct patient/procedure, and retrieves both original and derivative through authorized Meda UI. No PHI exposed to other roles/clinic or in telemetry. Any unverified feature explicitly disabled.
