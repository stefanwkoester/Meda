# Functional Specification

## Core data hierarchy

### Patient

- patient_id
- display_name
- MRN / external ID
- DOB or age
- sex fields as required by clinical workflow
- skin type / tone documentation fields when clinically relevant
- risk factors
- consent/share permissions

### Exam

A dated dermatology imaging session.

- exam_id
- patient_id
- capture timestamp
- exam type: full-body, targeted, postoperative, rash, burn, wound, surveillance
- standardized views completed
- provider
- capture device/source

### Finding

A persistent clinical location tracked over time.

- finding_id
- patient_id
- body region
- normalized body-map coordinates
- laterality
- category
- clinician label
- first_seen
- current_status
- notes

### Observation

A time-specific observation of a finding.

- observation_id
- finding_id
- exam_id
- dimensions
- visual descriptors
- clinician assessment
- associated media IDs

### Media

- media_id
- patient_id
- exam_id
- finding_id optional
- media_type: image/video
- anatomical site
- capture timestamp
- source
- procedure phase: pre-op/intra-op/post-op/follow-up

### Procedure

- procedure_id
- patient_id
- finding_id optional
- procedure type
- date/time
- anatomical site
- media
- pathology links
- postoperative follow-up

## Button and control behavior

### Left navigation

**Dashboard** — returns to high-level workload and recent cases.

**Case Log** — full searchable patient/case list.

**Body Maps** — opens body-map centric patient browser.

**Documentation** — future review queue for draft notes/procedure notes. Beta may be disabled or marked “Coming soon.”

**AI Dx** — future feature; beta should remain disabled/clearly labeled unless validated and authorized.

**New Case** — creates a patient-linked case. Existing patients should be searched before allowing duplicate creation.

**Start Capture** — launches media capture workflow after selecting/confirming patient.

**Import Media** — uploads already captured photos/videos and requires patient + date + site assignment.

### Patient skin map actions

**New Exam** — creates a new dated exam and opens standardized capture checklist.

**Add Media** — add image/video to current patient and optionally current finding.

**Compare** — choose two exam dates or two observations of the same finding.

**Add Finding** — place a new marker by clicking body region and completing a compact finding form.

**Open Finding** — open the complete history of selected marker.

**Mark for Follow-up** — set interval/date and reason.

**Link Procedure** — connect the finding to biopsy/excision/procedure media.

**View Pathology** — open structured pathology record/document link when available.

**Share Case** — opens permissions dialog. Default is internal care-team sharing. External/global share requires de-identification and separate consent/status checks.

### Media actions

**Play** — user-initiated only.

**Capture Still** — creates a still frame from video at the current timestamp.

**Set Key Frame** — marks the representative image for a finding/procedure.

**Compare** — side-by-side or overlay comparison.

**Annotate** — non-destructive annotation layer. Original media remains unchanged.

**Download/Export** — permission gated; should be auditable in production.

## Whole-body map workflow

1. Confirm patient identity.
2. Start a new full-body exam.
3. Present standardized capture sequence: anterior, posterior, left lateral, right lateral, head/scalp, hands, feet, optional targeted regions.
4. Validate image quality and completeness.
5. Create/stitch the body representation.
6. Associate existing findings spatially when possible.
7. Let clinician confirm/reposition markers.
8. Add new findings.
9. Review changes versus prior exam.
10. Finalize exam.

## Future longitudinal comparison

The design should anticipate:

- registration/alignment between historical captures
- same-lesion image pairs
- measurement change
- pigmentation/color change
- scar/wound healing
- rash distribution change
- postoperative evolution

These should be presented as **clinical comparison tools**, not automatic diagnoses in the beta.
