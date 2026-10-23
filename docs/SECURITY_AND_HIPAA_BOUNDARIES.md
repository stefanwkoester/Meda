# Security and HIPAA Boundaries

This repository is a UI prototype and **is not itself a HIPAA compliance certification**.

For a production system handling protected health information, design for:

- authenticated users and role-based access control
- least privilege
- encryption in transit and at rest
- encrypted object storage for media
- auditable view/create/edit/export/share events
- session timeout and device/session controls
- signed, short-lived media URLs
- secure backups and retention policies
- breach detection/incident response
- BAAs with applicable cloud/service vendors
- secure EHR integration
- tenant/institution isolation
- consent and de-identification workflows for teaching/global sharing
- policy around capture devices and local caching

## Frontend-specific rules

Never put PHI in:

- browser localStorage/sessionStorage unless an approved architecture explicitly requires it
- analytics events
- error-reporting payloads
- URL query strings
- public asset names
- source code

Do not cache clinical images with public service workers.

Never assume removing name/MRN alone makes a dermatology image de-identified. Full-body images, tattoos, faces, unique scars, metadata, and context may be identifying.

## Beta recommendation

For an early pilot, keep global sharing disabled until the de-identification, consent, institutional policy, audit, and review workflow are explicitly implemented.
