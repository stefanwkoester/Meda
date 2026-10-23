export type Procedure = {
  id: string;
  type: string;
  site: string;
  phase: "Pre" | "Intra" | "Post";
};
export type Encounter = {
  id: string;
  patientId: string;
  reason: string;
  date: string;
  status: "Draft" | "Completed";
  procedures: Procedure[];
  note: string;
  version?: number;
};
export type MediaAsset = {
  id: string;
  patient: string;
  encounterId: string;
  procedureId: string;
  url: string;
  name: string;
  type: string;
  rotation: number;
  createdAt: string;
  site: string;
  phase: "Pre" | "Intra" | "Post";
  source: string;
  parentId?: string;
  manifest?: { rotation: number; crop: boolean; annotations: number };
};
export const sites = [
  "Not assigned",
  "Scalp",
  "Face",
  "Left upper chest",
  "Right upper chest",
  "Abdomen",
  "Upper back",
  "Lower back",
  "Left shoulder",
  "Right shoulder",
  "Left forearm",
  "Right forearm",
  "Left thigh",
  "Right thigh",
  "Left lower leg",
  "Right lower leg",
];
export function seedEncounters(): Encounter[] {
  return [
    ["10284", "Full body skin exam", "Left upper chest", "Draft"],
    ["10367", "Excision · Upper back", "Upper back", "Completed"],
    ["10421", "Post-op follow-up", "Left forearm", "Completed"],
    ["10458", "Lesion monitoring", "Right shoulder", "Draft"],
    ["10502", "Rash evaluation", "Right forearm", "Completed"],
  ].map(([patientId, reason, site, status], i) => ({
    id: `enc-demo-${i + 1}`,
    patientId,
    reason,
    date: `2026-10-${22 - i}T16:00:00Z`,
    status: status as Encounter["status"],
    note: "",
    procedures: [
      {
        id: `proc-demo-${i + 1}`,
        type: i === 1 ? "Excision" : "Clinical photography",
        site,
        phase: "Pre",
      },
    ],
  }));
}
export function createEncounter(
  patientId: string,
  reason: string,
  id: string,
  date = new Date().toISOString(),
): Encounter {
  if (!patientId || !reason.trim())
    throw new Error("Choose a patient and enter an encounter reason.");
  return {
    id,
    patientId,
    reason: reason.trim(),
    date,
    status: "Draft",
    procedures: [],
    note: "",
  };
}
export function validateAssignment(
  patientId: string,
  encounterId: string,
  procedureId: string,
  encounters: Encounter[],
) {
  const encounter = encounters.find(
    (e) => e.id === encounterId && e.patientId === patientId,
  );
  if (!encounter) return "Choose an encounter belonging to this patient.";
  if (procedureId && !encounter.procedures.some((p) => p.id === procedureId))
    return "Choose a procedure belonging to this encounter.";
  return "";
}
export const supportedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
];
export function validateFile(file: { type: string; size: number }) {
  if (!supportedTypes.includes(file.type.split(";")[0]))
    return "Unsupported format. Use JPG, PNG, WebP, MP4, MOV, WebM, MP3, M4A, Ogg, or WAV.";
  if (!file.size) return "This file is empty. Choose another file.";
  if (file.size > 25 * 1024 * 1024)
    return "This file is larger than 25 MB. Choose a smaller file.";
  return "";
}
export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Phoenix",
  });
}
