import type { Encounter, MediaAsset } from "./domain/workspace";
export type Person = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  sex: string;
  initials: string;
  color: string;
  allergies: string;
  medications: string;
  history: string;
  version: number;
};
export type Session = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "physician" | "assistant" | "auditor";
  };
  csrf: string;
  clinic: { id: string; name: string };
};
export type Workspace = {
  patients: Person[];
  encounters: Encounter[];
  media: MediaAsset[];
};
let csrf = "";
let expired = () => {};
export function setSession(session: Session | null) {
  csrf = session?.csrf || "";
}
export function onExpired(callback: () => void) {
  expired = callback;
}
export async function api<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/")) expired();
    throw new Error(
      body.error?.message ||
        "The server could not be reached. Please try again.",
    );
  }
  return body as T;
}
export async function uploadAsset(asset: MediaAsset) {
  const result = await fetch(asset.url);
  if (!result.ok) throw Error("The source file could not be read.");
  const blob = await result.blob();
  const data = new FormData();
  data.append("displayName", asset.name);
  data.append("file", new File([blob], asset.name, { type: asset.type }));
  for (const [key, value] of Object.entries(asset)) {
    if (
      ["url", "name", "type", "rotation"].includes(key) ||
      value === undefined
    )
      continue;
    data.append(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    );
  }
  return api<MediaAsset>("/media/uploads", { method: "POST", body: data });
}
export async function commitAssets(items: MediaAsset[]) {
  if (!items.length) return;
  for (const m of items) await uploadAsset(m);
  const groups = new Map<string, MediaAsset[]>();
  for (const m of items) {
    const key = JSON.stringify([
      m.patient,
      m.encounterId,
      m.procedureId,
      m.site,
      m.phase,
    ]);
    groups.set(key, [...(groups.get(key) || []), m]);
  }
  for (const group of groups.values()) {
    const m = group[0];
    await api("/media/review", {
      method: "POST",
      body: JSON.stringify({
        ids: group.map((i) => i.id),
        patient: m.patient,
        encounterId: m.encounterId,
        procedureId: m.procedureId,
        site: m.site,
        phase: m.phase,
        confirmed: true,
      }),
    });
  }
}
