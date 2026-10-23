# Patient-Centered UX Principles

## 1. Patient identity is persistent

The patient's name/identifier should remain visible in the patient workspace. Before capture, import, procedure linking, or sharing, require a lightweight patient confirmation.

## 2. Dignity by default

Full-body dermatologic imaging is sensitive. The product should minimize unnecessary exposure:

- dashboard cards favor localized thumbnails
- body-map images appear only inside the patient record
- use configurable privacy masks for non-clinically relevant areas
- full-screen viewing is intentional rather than automatic
- sharing previews should show exactly what will leave the chart

## 3. Explain why media exists

Every image or video should be associated with a reason:

- baseline examination
- lesion surveillance
- procedure documentation
- postoperative follow-up
- rash/burn/wound documentation

This prevents the record from becoming an unstructured media dump.

## 4. Make longitudinal context obvious

Display dates prominently. The user should never compare images without knowing when each was captured.

## 5. Separate observation from interpretation

UI should clearly distinguish:

- raw media
- clinician observations
- pathology-confirmed facts
- future AI suggestions

Future AI suggestions should include provenance and review state.

## 6. Sharing is deliberate

Global case sharing is not a one-click extension of the medical record.

Recommended flow:

1. Select media/findings.
2. Create a de-identified case copy.
3. Run/confirm metadata stripping and visual de-identification.
4. Preview final case.
5. Confirm consent/policy state.
6. Publish/share.

The original patient chart remains separate.

## 7. Reduce clinician burden

Prefer quick actions and smart defaults:

- remember last used exam type
- allow batch media assignment
- support keyboard shortcuts on desktop
- keep anatomical location selection visual
- avoid repeated data entry already known from patient/exam context
