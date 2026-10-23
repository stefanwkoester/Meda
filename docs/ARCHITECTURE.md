# Frontend Architecture

## Component tree

```text
App
├── AppShell
│   ├── Sidebar
│   ├── TopBar
│   └── RouterOutlet
├── DashboardPage
│   ├── ActivityCards
│   ├── CaseTabs
│   ├── CaseList
│   └── PatientPreviewPanel
└── PatientMapPage
    ├── PatientRail
    │   ├── PatientIdentityCard
    │   ├── RiskSummary
    │   ├── ExamHistory
    │   └── PatientAssetCounts
    ├── BodyMapWorkspace
    │   ├── BodyViewPanel
    │   ├── FindingMarkerLayer
    │   ├── BodyMapLegend
    │   └── AdditionalViewStrip
    └── FindingInspector
        ├── MediaViewer
        ├── MediaThumbStrip
        ├── FindingMetadata
        ├── FindingTimeline
        └── ProcedureMediaCard
```

## State model

Keep local UI state separate from future server state.

UI state examples:

- selectedPatientId
- selectedExamId
- selectedFindingId
- selectedMediaId
- compareMode
- activePatientTab
- sidebarCollapsed
- inspectorOpen

Future server state should be provided by API hooks/services rather than direct fetches scattered through components.

## Suggested routes

```text
/                         dashboard
/cases                    case log
/patients/:patientId      patient overview
/patients/:patientId/map  skin map
/patients/:patientId/media
/patients/:patientId/notes
/findings/:findingId
```

## Backend integration boundary

When backend work begins, add:

```text
src/services/
  apiClient.ts
  patients.ts
  exams.ts
  findings.ts
  media.ts
  procedures.ts
```

Components should not know whether data comes from Epic, Cerner, a custom database, or mock JSON.

## Media storage principle

Do not place raw clinical media in the frontend bundle or relational database blobs. In production, use encrypted object storage with short-lived authorized access URLs and strict audit/access control.
