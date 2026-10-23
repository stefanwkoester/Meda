import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Camera,
  Images,
  Glasses,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  FolderOpen,
  Activity,
  LogOut,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Save,
  ShieldCheck,
} from "lucide-react";
import logo from "../public/assets/meda-logo.png";
import { AuthGate } from "./components/AuthGate";
import { Dialog } from "./components/Dialog";
import { CaptureStudio } from "./components/CaptureStudio";
import { MediaStudio } from "./components/MediaStudio";
import {
  api,
  commitAssets,
  type Person,
  type Session,
  type Workspace,
} from "./api";
import {
  sites,
  formatDate,
  type Encounter,
  type MediaAsset,
} from "./domain/workspace";
const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Patients", icon: Users },
  { name: "Capture", icon: Camera },
  { name: "Media", icon: Images },
  { name: "Device", icon: Glasses },
];
const procedureTypes = [
  "Clinical photography",
  "Full skin examination",
  "Shave biopsy",
  "Punch biopsy",
  "Excisional biopsy",
  "Excision",
  "Cryotherapy",
  "Curettage",
  "Wound review",
  "Other",
];
function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}
function Body({
  back = false,
  onSite,
}: {
  back?: boolean;
  onSite: (s: string) => void;
}) {
  return (
    <div className="anatomy">
      <svg
        viewBox="0 0 140 300"
        aria-label={
          back ? "Posterior anatomical diagram" : "Anterior anatomical diagram"
        }
      >
        <path
          d="M70 8c-12 0-18 10-18 23 0 9 5 17 10 20v12L42 72c-9 4-12 12-15 25L10 159c-3 11 7 14 11 4l22-58-1 59-3 50-1 65c0 13 14 13 16 1l8-61 8-40 8 40 8 61c2 12 16 12 16-1l-1-65-3-50-1-59 22 58c4 10 14 7 11-4l-17-62c-3-13-6-21-15-25l-20-9V51c5-3 10-11 10-20C88 18 82 8 70 8Z"
          fill="#e7e0f7"
          stroke="#c4b6de"
          strokeWidth="1.3"
        />
        <path
          d="M70 74v89M47 104l23 7 23-7M43 162q27 13 54 0"
          fill="none"
          stroke="#c6b8dd"
        />
        {[
          {
            x: 82,
            y: 90,
            s: back ? "Upper back" : "Left upper chest",
            c: "#7855ef",
          },
          { x: 55, y: 126, s: back ? "Lower back" : "Abdomen", c: "#d89b3e" },
          { x: 86, y: 219, s: "Left thigh", c: "#39a892" },
        ].map((p) => (
          <g
            key={p.s}
            role="button"
            tabIndex={0}
            aria-label={`${back ? "Back" : "Front"}: ${p.s}`}
            onClick={() => onSite(p.s)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSite(p.s);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <circle cx={p.x} cy={p.y} r="13" fill={p.c} opacity=".13" />
            <circle cx={p.x} cy={p.y} r="4" fill={p.c} />
          </g>
        ))}
      </svg>
      <small>{back ? "Posterior" : "Anterior"}</small>
    </div>
  );
}
export function App() {
  return (
    <AuthGate>
      {(session, logout) => (
        <WorkspaceApp key={session.user.id} session={session} logout={logout} />
      )}
    </AuthGate>
  );
}
function readRoute() {
  const q = new URLSearchParams(window.location.hash.slice(1));
  return {
    page:
      navigation.some((n) => n.name === q.get("page")) ||
      q.get("page") === "Settings"
        ? q.get("page")!
        : "Dashboard",
    patient: q.get("patient") || "",
    encounter: q.get("encounter") || "",
    profile: q.get("view") === "chart",
    tab: [
      "Overview",
      "Encounters",
      "Media",
      "Dermatology history",
      "Notes",
    ].includes(q.get("tab") || "")
      ? q.get("tab")!
      : "Overview",
  };
}
function WorkspaceApp({
  session,
  logout,
}: {
  session: Session;
  logout: () => Promise<void>;
}) {
  const [workspace, setWorkspace] = useState<Workspace>({
      patients: [],
      encounters: [],
      media: [],
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [page, setPage] = useState(readRoute().page),
    [patientId, setPatientId] = useState(readRoute().patient),
    [profile, setProfile] = useState(readRoute().profile),
    [tab, setTab] = useState(readRoute().tab),
    [encounterId, setEncounterId] = useState(readRoute().encounter),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All encounters"),
    [modal, setModal] = useState(""),
    [modalError, setModalError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [site, setSite] = useState("Left upper chest"),
    [note, setNote] = useState(""),
    [pendingCount, setPendingCount] = useState(0),
    [queuedAction, setQueuedAction] = useState<(() => void) | null>(null),
    [pendingPatient, setPendingPatient] = useState(""),
    [team, setTeam] = useState<Session["user"][]>([]),
    [audit, setAudit] = useState<
      { id: string; action: string; date: string; actor: string }[]
    >([]),
    [recoveryBusy, setRecoveryBusy] = useState(false);
  const { patients: people, encounters, media } = workspace;
  const selected = people.find((p) => p.id === patientId) || people[0];
  const patientEncounters = encounters.filter(
    (e) => e.patientId === selected?.id,
  );
  const encounter =
    patientEncounters.find((e) => e.id === encounterId) || patientEncounters[0];
  const canWrite = session.user.role !== "auditor";
  const pendingMedia = media.filter(
    (m) => (m as MediaAsset & { state: string }).state === "pending_review",
  );
  const committedMedia = media.filter(
    (m) => (m as MediaAsset & { state: string }).state === "committed",
  );
  const noteDirty = !!encounter && note !== encounter.note;
  const revoke = useRef(new Set<string>());
  useEffect(() => {
    if (!selected) return;
    const q = new URLSearchParams({ page, patient: selected.id });
    if (profile) {
      q.set("view", "chart");
      q.set("tab", tab);
      if (encounter) q.set("encounter", encounter.id);
    }
    window.history.replaceState(null, "", "#" + q.toString());
  }, [page, selected?.id, profile, tab, encounter?.id]);
  const refresh = useCallback(async () => {
    const next = await api<Workspace>("/workspace");
    setWorkspace(next);
    setPatientId(
      (id) => id || next.encounters[0]?.patientId || next.patients[0]?.id || "",
    );
    return next;
  }, []);
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    return () => {
      revoke.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [refresh]);
  useEffect(() => {
    setNote(encounter?.note || "");
  }, [encounter?.id, encounter?.version]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (noteDirty || pendingCount) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [noteDirty, pendingCount]);
  useEffect(() => {
    if (page === "Settings") {
      if (session.user.role === "admin")
        api<{ users: Session["user"][] }>("/team")
          .then((r) => setTeam(r.users))
          .catch((e) => setError(e.message));
      if (["admin", "auditor"].includes(session.user.role))
        api<{ events: typeof audit }>("/audit")
          .then((r) => setAudit(r.events))
          .catch((e) => setError(e.message));
    }
  }, [page, session.user.role]);
  function guard(action: () => void) {
    if (noteDirty || pendingCount) {
      setQueuedAction(() => action);
      return;
    }
    action();
  }
  function go(name: string) {
    guard(() => {
      setPage(name);
      setProfile(false);
      setSearch("");
      setError("");
      window.scrollTo(0, 0);
    });
  }
  function open(p: Person) {
    guard(() => {
      setPatientId(p.id);
      setEncounterId("");
      setProfile(true);
      setTab("Overview");
      setPage("Patients");
      setSite(
        encounters.find((e) => e.patientId === p.id)?.procedures[0]?.site ||
          "Not assigned",
      );
      window.scrollTo(0, 0);
    });
  }
  function pickPatient(id: string) {
    setPatientId(id);
    setEncounterId("");
  }
  function showModal(name: string) {
    setModalError("");
    setModal(name);
  }
  async function saveNote() {
    if (!encounter) return;
    setBusy(true);
    setError("");
    try {
      await api(`/encounters/${encounter.id}`, {
        method: "PATCH",
        body: JSON.stringify({ note, version: encounter.version }),
      });
      await refresh();
      setToast("Encounter draft saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addMedia(items: MediaAsset[]) {
    await commitAssets(items);
    items.forEach((m) => {
      if (m.url.startsWith("blob:")) {
        URL.revokeObjectURL(m.url);
        revoke.current.delete(m.url);
      }
    });
    await refresh();
    setPage("Media");
    setProfile(false);
    setPendingCount(0);
  }
  async function addVersion(m: MediaAsset) {
    revoke.current.add(m.url);
    await addMedia([m]);
  }
  async function recoverPending(commit: boolean) {
    const items = pendingMedia
      .filter((m) => m.patient === pendingPatient)
      .slice(0, 10);
    if (!items.length) return;
    setRecoveryBusy(true);
    setModalError("");
    try {
      if (commit) {
        for (const m of items)
          await api("/media/review", {
            method: "POST",
            body: JSON.stringify({
              ids: [m.id],
              patient: m.patient,
              encounterId: m.encounterId,
              procedureId: m.procedureId,
              site: m.site,
              phase: m.phase,
              confirmed: true,
            }),
          });
      } else
        for (const m of items)
          await api(`/media/${m.id}`, { method: "DELETE" });
      await refresh();
      setToast(
        commit
          ? "Reviewed files added to the patient gallery."
          : "Uncommitted uploads discarded.",
      );
      setModal("");
      if (commit) {
        pickPatient(pendingPatient);
        setPage("Media");
        setProfile(false);
      }
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setRecoveryBusy(false);
    }
  }
  const matches = people.filter(
    (p) =>
      `${p.name} ${p.mrn}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter !== "In progress" ||
        encounters.find((e) => e.patientId === p.id)?.status === "Draft"),
  );
  async function formSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setModalError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (modal === "New patient") {
        const result = await api<{ id: string }>("/patients", {
          method: "POST",
          body: JSON.stringify({ ...values, age: Number(values.age) }),
        });
        const data = await refresh();
        const p = data.patients.find((p) => p.id === result.id)!;
        setPatientId(p.id);
        setEncounterId("");
        setPage("Patients");
        setProfile(true);
        setTab("Encounters");
      } else if (modal === "New encounter") {
        const r = await api<{ id: string }>(
          `/patients/${selected.id}/encounters`,
          { method: "POST", body: JSON.stringify(values) },
        );
        await refresh();
        setEncounterId(r.id);
        setTab("Encounters");
      } else if (modal === "Add procedure") {
        await api(`/encounters/${encounter!.id}/procedures`, {
          method: "POST",
          body: JSON.stringify(values),
        });
        await refresh();
      } else if (modal === "Edit dermatology profile") {
        await api(`/patients/${selected.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...values, version: selected.version }),
        });
        await refresh();
      } else if (modal === "Add team member") {
        await api("/team", { method: "POST", body: JSON.stringify(values) });
        const r = await api<{ users: Session["user"][] }>("/team");
        setTeam(r.users);
      }
      setModal("");
      setToast("Changes saved to the workspace.");
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="Meda dashboard"
          onClick={(e) => {
            e.preventDefault();
            go("Dashboard");
          }}
        >
          <img src={logo} alt="Meda" />
        </a>
        <div className="clinic">
          <span className="clinic-icon">{session.clinic.name[0]}</span>
          <div>
            {session.clinic.name}
            <small>Dermatology workspace</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-label={name}
              aria-current={page === name ? "page" : undefined}
              className={page === name ? "active" : ""}
              onClick={() => go(name)}
            >
              <Icon size={19} />
              {name}
              {name === "Media" && committedMedia.length > 0 && (
                <span className="count">{committedMedia.length}</span>
              )}
            </button>
          ))}
        </nav>
        <p className="nav-label">COMING LATER</p>
        <nav>
          <button disabled>
            <Activity size={19} />
            AI insights<span className="soon">Soon</span>
          </button>
          <button disabled>
            <FolderOpen size={19} />
            EHR integration
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="pilot">
            <ShieldCheck size={22} />
            <strong>Designed around your care</strong>
            <p>One patient. A connected picture.</p>
          </div>
          <button className="settings" onClick={() => go("Settings")}>
            <Settings size={19} />
            Settings & team
          </button>
          <div className="user">
            <span className="avatar">{initials(session.user.name)}</span>
            <div>
              {session.user.name}
              <small>
                {session.user.role === "admin"
                  ? "Workspace administrator"
                  : session.user.role}
              </small>
            </div>
            <button
              aria-label="Sign out"
              onClick={() =>
                guard(() => {
                  logout().catch((e) => setError(e.message));
                })
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button onClick={() => go("Dashboard")}>Workspace</button>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <span className="demo">
              <i />
              Fictional-data workspace
            </span>
            <button
              className="refresh-button"
              aria-label="Refresh workspace"
              onClick={() =>
                guard(() => {
                  refresh()
                    .then(() => setToast("Workspace refreshed."))
                    .catch((e) => setError(e.message));
                })
              }
            >
              <RefreshCw size={17} />
            </button>
            <span className="avatar small">{initials(session.user.name)}</span>
          </div>
        </header>
        <div className="demo-strip">
          Development workspace · Use fictional patients only · Records are
          saved on this server
        </div>
        <main>
          {loading ? (
            <div className="card empty" role="status">
              <div className="loading-line" />
              <h2>Preparing your workspace…</h2>
            </div>
          ) : !selected ? (
            <div className="card empty">
              <h2>
                {error
                  ? "Workspace unavailable"
                  : "Start your patient directory"}
              </h2>
              <p>{error || "Add a fictional patient to start."}</p>
              <button
                className="primary"
                onClick={() =>
                  error
                    ? refresh()
                        .then(() => setError(""))
                        .catch((e) => setError(e.message))
                    : showModal("New patient")
                }
              >
                {error ? "Retry" : "Add patient"}
              </button>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    MEDA / {profile ? "PATIENT CHART" : page.toUpperCase()}
                  </p>
                  <h1>
                    {profile
                      ? selected.name
                      : page === "Dashboard"
                        ? `Welcome back, ${session.user.name}`
                        : page === "Device"
                          ? "Connected care"
                          : page === "Capture"
                            ? "Capture the details"
                            : page === "Media"
                              ? "Media library"
                              : page === "Settings"
                                ? "Workspace settings"
                                : "Your patients"}
                  </h1>
                  <p>
                    {profile
                      ? `MRN ${selected.mrn} · ${selected.age} years · ${selected.sex}`
                      : page === "Dashboard"
                        ? "Your dermatology practice, in focus."
                        : page === "Patients"
                          ? "Every patient, every encounter, in one place."
                          : page === "Capture"
                            ? "Capture once. Review carefully. Keep the patient story connected."
                            : page === "Device"
                              ? "Your tools, working together."
                              : page === "Settings"
                                ? "Manage your practice, team, and workspace activity."
                                : "Photos, recordings, and the context behind every capture."}
                  </p>
                </div>
                <div className="heading-actions">
                  {profile ? (
                    <>
                      <button
                        className="secondary"
                        onClick={() => go("Patients")}
                      >
                        <ChevronLeft size={16} />
                        Patients
                      </button>
                      {canWrite && (
                        <button
                          className="primary"
                          onClick={() => go("Capture")}
                        >
                          <Camera size={17} />
                          Capture media
                        </button>
                      )}
                    </>
                  ) : (
                    canWrite &&
                    (page === "Dashboard" || page === "Patients") && (
                      <>
                        <button
                          className="secondary"
                          onClick={() => go("Capture")}
                        >
                          <Camera size={17} />
                          Start capture
                        </button>
                        <button
                          className="primary"
                          aria-label="New patient"
                          onClick={() => showModal("New patient")}
                        >
                          <Plus size={17} />
                          <span>New patient</span>
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
              {error && (
                <div className="inline-error" role="alert">
                  <AlertCircle size={18} />
                  {error}
                  <button
                    aria-label="Dismiss error"
                    onClick={() => setError("")}
                  >
                    ×
                  </button>
                </div>
              )}
              {pendingMedia.length > 0 && canWrite && page !== "Capture" && (
                <div className="pending-banner">
                  <Clock size={19} />
                  <div>
                    <strong>
                      {pendingMedia.length} uploaded{" "}
                      {pendingMedia.length === 1 ? "file needs" : "files need"}{" "}
                      review
                    </strong>
                    <span>
                      These files are saved but not in the chart gallery yet.
                    </span>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setPendingPatient(pendingMedia[0].patient);
                      showModal("Review pending uploads");
                    }}
                  >
                    Review uploads
                  </button>
                </div>
              )}
              {(page === "Dashboard" || page === "Patients") && !profile && (
                <>
                  {page === "Dashboard" && (
                    <div className="stats">
                      {[
                        {
                          label: "Patients",
                          value: people.length,
                          icon: Users,
                          color: "purple",
                          caption: "In your practice workspace",
                          target: "Patients",
                        },
                        {
                          label: "Encounters",
                          value: encounters.length,
                          icon: FolderOpen,
                          color: "teal",
                          caption: "Connected to every visit",
                          target: "Patients",
                        },
                        {
                          label: "Pending review",
                          value: pendingMedia.length + pendingCount,
                          icon: Clock,
                          color: "amber",
                          caption: "Ready for your attention",
                          target: "Capture",
                        },
                        {
                          label: "Chart media",
                          value: committedMedia.length,
                          icon: Images,
                          color: "blue",
                          caption: "Reviewed and organized",
                          target: "Media",
                        },
                      ].map(
                        ({
                          label,
                          value,
                          icon: Icon,
                          color,
                          caption,
                          target,
                        }) => (
                          <button
                            className={`stat ${color}`}
                            key={label}
                            onClick={() => {
                              if (
                                label === "Pending review" &&
                                pendingMedia.length
                              ) {
                                setPendingPatient(pendingMedia[0].patient);
                                showModal("Review pending uploads");
                              } else go(target);
                            }}
                          >
                            <div>
                              <span>{label}</span>
                              <Icon size={21} />
                            </div>
                            <strong>{String(value).padStart(2, "0")}</strong>
                            <small>
                              {caption}
                              <ArrowUpRight size={14} />
                            </small>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                  <div className="dashboard-grid">
                    <section className="card encounters">
                      <div className="card-heading">
                        <div>
                          <h2>
                            {page === "Dashboard"
                              ? "Recent encounters"
                              : "Patient directory"}
                          </h2>
                          <p>The context you need, before the next visit.</p>
                        </div>
                        <span className="subtle-pill">
                          {people.length} patients
                        </span>
                      </div>
                      <div className="table-controls">
                        <div className="tabs">
                          {["All encounters", "In progress"].map((t) => (
                            <button
                              className={filter === t ? "active" : ""}
                              aria-pressed={filter === t}
                              onClick={() => setFilter(t)}
                              key={t}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <label className="search">
                          <Search size={16} />
                          <input
                            aria-label="Search patients"
                            placeholder="Search name or MRN"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="table-labels">
                        <span>PATIENT</span>
                        <span>LATEST ENCOUNTER</span>
                        <span>STATUS</span>
                        <span />
                      </div>
                      {matches.map((p) => {
                        const recent = encounters.find(
                          (e) => e.patientId === p.id,
                        );
                        return (
                          <button
                            className="patient-row"
                            key={p.id}
                            onClick={() => open(p)}
                          >
                            <div className="person">
                              <span className={`avatar ${p.color}`}>
                                {p.initials}
                              </span>
                              <div>
                                <strong>{p.name}</strong>
                                <small>
                                  {p.age} years · {p.sex} · {p.mrn}
                                </small>
                              </div>
                            </div>
                            <div className="encounter-summary">
                              <strong>
                                {recent?.reason || "No encounters yet"}
                              </strong>
                              <small>
                                {recent
                                  ? formatDate(recent.date)
                                  : "Open chart to begin"}
                              </small>
                            </div>
                            <span
                              className={`status ${recent?.status === "Completed" ? "complete" : ""}`}
                            >
                              <i />
                              {recent?.status === "Completed"
                                ? "Completed"
                                : recent
                                  ? "In progress"
                                  : "New patient"}
                            </span>
                            <ChevronRight size={17} />
                          </button>
                        );
                      })}
                      {!matches.length && (
                        <div className="empty">
                          <Search size={32} />
                          <h3>No patients found</h3>
                          <p>Try a different name or MRN.</p>
                          <button
                            className="secondary"
                            onClick={() => {
                              setSearch("");
                              setFilter("All encounters");
                            }}
                          >
                            Clear filters
                          </button>
                        </div>
                      )}
                      <div className="table-footer">
                        <span>Fictional records · Dermatology workspace</span>
                        <button
                          className="text-button"
                          onClick={() =>
                            go(page === "Dashboard" ? "Patients" : "Dashboard")
                          }
                        >
                          {page === "Dashboard"
                            ? "View all patients"
                            : "Back to dashboard"}
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                    </section>
                    <aside className="right-column">
                      <section className="card featured">
                        <div className="card-heading">
                          <h2>Patient spotlight</h2>
                          <span className="tiny-dot" />
                        </div>
                        <div className="spotlight-person">
                          <span className={`avatar large ${selected.color}`}>
                            {selected.initials}
                          </span>
                          <h3>{selected.name}</h3>
                          <p>
                            {selected.age} years · {selected.sex} · MRN{" "}
                            {selected.mrn}
                          </p>
                        </div>
                        <div className="mini-heading">
                          <strong>Anatomical overview</strong>
                          <span>Location picker</span>
                        </div>
                        <div className="bodies">
                          <Body onSite={setSite} />
                          <Body back onSite={setSite} />
                        </div>
                        <div className="location">
                          <i />
                          {site}
                          <span>Selected site</span>
                        </div>
                        <button
                          className="secondary full"
                          onClick={() => open(selected)}
                        >
                          Open patient chart
                          <ArrowUpRight size={16} />
                        </button>
                      </section>
                      <section className="capture-card">
                        <div className="capture-icon">
                          <Camera size={23} />
                        </div>
                        <h3>Stay in the moment.</h3>
                        <p>
                          Bring photos, video, and notes into the patient story.
                        </p>
                        <button onClick={() => go("Capture")}>
                          Start a capture
                          <ArrowUpRight size={16} />
                        </button>
                        <div className="orbit" />
                      </section>
                    </aside>
                  </div>
                </>
              )}
              {profile && (
                <>
                  <div className="patient-context-bar">
                    <span className={`avatar ${selected.color}`}>
                      {selected.initials}
                    </span>
                    <div>
                      <strong>{selected.name}</strong>
                      <small>MRN {selected.mrn} · Fictional patient</small>
                    </div>
                    <span className="subtle-pill">
                      {patientEncounters.length} encounters
                    </span>
                    <span className="subtle-pill">
                      {
                        committedMedia.filter((m) => m.patient === selected.id)
                          .length
                      }{" "}
                      media
                    </span>
                  </div>
                  <div className="profile-tabs tabs">
                    {[
                      "Overview",
                      "Encounters",
                      "Media",
                      "Dermatology history",
                      "Notes",
                    ].map((t) => (
                      <button
                        className={tab === t ? "active" : ""}
                        aria-pressed={tab === t}
                        onClick={() => guard(() => setTab(t))}
                        key={t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="profile-grid">
                    <section className="card padded">
                      <div className="card-heading">
                        <h2>{tab === "Overview" ? "Patient overview" : tab}</h2>
                        {canWrite &&
                          (tab === "Overview" ||
                            tab === "Dermatology history") && (
                            <button
                              className="text-button"
                              onClick={() =>
                                showModal("Edit dermatology profile")
                              }
                            >
                              Edit profile
                            </button>
                          )}
                      </div>
                      {tab === "Overview" ? (
                        <>
                          <div className="summary-grid">
                            {[
                              ["Allergies", selected.allergies],
                              ["Medications", selected.medications],
                              ["Skin & family history", selected.history],
                              [
                                "Consent",
                                "Clinical consent workflow not connected",
                              ],
                            ].map(([k, v]) => (
                              <div key={k}>
                                <small>{k}</small>
                                <p>{v}</p>
                              </div>
                            ))}
                          </div>
                          <div className="section-title-row">
                            <h3>Recent encounters</h3>
                            {canWrite && (
                              <button
                                className="text-button"
                                onClick={() => showModal("New encounter")}
                              >
                                <Plus size={15} />
                                New encounter
                              </button>
                            )}
                          </div>
                          {patientEncounters.slice(0, 3).map((e) => (
                            <button
                              className="encounter-link"
                              key={e.id}
                              onClick={() => {
                                setEncounterId(e.id);
                                setTab("Encounters");
                              }}
                            >
                              <FolderOpen size={20} />
                              <div>
                                <strong>{e.reason}</strong>
                                <small>
                                  {formatDate(e.date)} · {e.procedures.length}{" "}
                                  procedures · {e.status}
                                </small>
                              </div>
                              <ChevronRight size={17} />
                            </button>
                          ))}
                          {!patientEncounters.length && (
                            <p>
                              No encounters yet. Create one to begin the patient
                              workflow.
                            </p>
                          )}
                        </>
                      ) : tab === "Encounters" ? (
                        <>
                          <div className="section-title-row">
                            <p>
                              Every visit, with its own procedures and notes.
                            </p>
                            {canWrite && (
                              <button
                                className="secondary"
                                onClick={() => showModal("New encounter")}
                              >
                                <Plus size={16} />
                                New encounter
                              </button>
                            )}
                          </div>
                          {encounter ? (
                            <>
                              <label className="field">
                                Encounter
                                <select
                                  value={encounter.id}
                                  onChange={(e) =>
                                    guard(() => setEncounterId(e.target.value))
                                  }
                                >
                                  {patientEncounters.map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {formatDate(e.date)} · {e.reason}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="encounter-detail">
                                <span className="subtle-pill">
                                  {encounter.status}
                                </span>
                                <h3>{encounter.reason}</h3>
                                <p>
                                  {formatDate(encounter.date)} ·{" "}
                                  {
                                    committedMedia.filter(
                                      (m) => m.encounterId === encounter.id,
                                    ).length
                                  }{" "}
                                  reviewed files
                                </p>
                              </div>
                              <div className="section-title-row">
                                <h3>Procedures</h3>
                                {canWrite && (
                                  <button
                                    className="text-button"
                                    onClick={() => showModal("Add procedure")}
                                  >
                                    <Plus size={15} />
                                    Add procedure
                                  </button>
                                )}
                              </div>
                              {encounter.procedures.map((p) => (
                                <div className="procedure-row" key={p.id}>
                                  <span className="procedure-icon">
                                    <ClipboardList size={18} />
                                  </span>
                                  <div>
                                    <strong>{p.type}</strong>
                                    <small>
                                      {p.site} · {p.phase}-procedure
                                    </small>
                                  </div>
                                  <span className="subtle-pill">
                                    {
                                      committedMedia.filter(
                                        (m) => m.procedureId === p.id,
                                      ).length
                                    }{" "}
                                    files
                                  </span>
                                </div>
                              ))}
                              {!encounter.procedures.length && (
                                <div className="mini-empty">
                                  No procedures added. Encounter-level capture
                                  is also available.
                                </div>
                              )}
                              <div className="actions">
                                {canWrite && (
                                  <button
                                    className="primary"
                                    onClick={() => go("Capture")}
                                  >
                                    <Camera size={17} />
                                    Capture for this patient
                                  </button>
                                )}
                                <button
                                  className="secondary"
                                  onClick={() => setTab("Notes")}
                                >
                                  <ClipboardList size={17} />
                                  Encounter notes
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="empty">
                              <FolderOpen size={32} />
                              <h3>Start with an encounter</h3>
                              <p>
                                Create a visit to connect procedures, media, and
                                notes.
                              </p>
                            </div>
                          )}
                        </>
                      ) : tab === "Notes" ? (
                        <>
                          {encounter ? (
                            <>
                              <label className="field">
                                Encounter
                                <select
                                  value={encounter.id}
                                  onChange={(e) =>
                                    guard(() => setEncounterId(e.target.value))
                                  }
                                >
                                  {patientEncounters.map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {e.reason}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="section-title-row">
                                <span className="subtle-pill">
                                  Draft note · Not clinically signed
                                </span>
                                {canWrite && (
                                  <button
                                    className="text-button"
                                    onClick={() => {
                                      if (
                                        !note ||
                                        confirm(
                                          "Replace the current draft with a dermatology template?",
                                        )
                                      )
                                        setNote(
                                          "Reason for visit:\n\nRelevant dermatology history:\n\nExamination / anatomical sites:\n\nProcedure and media references:\n\nAssessment and follow-up:\n",
                                        );
                                    }}
                                  >
                                    Insert dermatology template
                                  </button>
                                )}
                              </div>
                              <textarea
                                aria-label="Encounter note"
                                readOnly={!canWrite}
                                placeholder="Document this fictional encounter…"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                maxLength={20000}
                              />
                              <div className="section-title-row">
                                <small>
                                  {noteDirty
                                    ? "Unsaved changes"
                                    : "Draft matches saved record"}{" "}
                                  · {note.length.toLocaleString()}/20,000
                                </small>
                                {canWrite && (
                                  <button
                                    className="primary"
                                    disabled={!noteDirty || busy}
                                    onClick={saveNote}
                                  >
                                    <Save size={16} />
                                    {busy ? "Saving…" : "Save draft"}
                                  </button>
                                )}
                              </div>
                              <p className="muted">
                                Saved to this encounter. Physician signing and
                                amendments are not implemented.
                              </p>
                            </>
                          ) : (
                            <p>Create an encounter before adding a note.</p>
                          )}
                        </>
                      ) : tab === "Media" ? (
                        <>
                          <p>
                            {
                              committedMedia.filter(
                                (m) => m.patient === selected.id,
                              ).length
                            }{" "}
                            reviewed files across this patient’s encounters.
                          </p>
                          <button
                            className="primary"
                            onClick={() => go("Media")}
                          >
                            Open patient gallery
                            <ArrowUpRight size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="summary-grid">
                            {[
                              ["Skin & family history", selected.history],
                              ["Medications", selected.medications],
                              ["Allergies", selected.allergies],
                              [
                                "Pathology",
                                "No structured pathology records in this version.",
                              ],
                            ].map(([k, v]) => (
                              <div key={k}>
                                <small>{k}</small>
                                <p>{v}</p>
                              </div>
                            ))}
                          </div>
                          <p className="muted">
                            Use Edit profile to record fictional dermatology
                            history, medications, and allergies.
                          </p>
                        </>
                      )}
                    </section>
                    <section className="card padded">
                      <h2>Anatomical location</h2>
                      <p className="section-description">
                        A simple site reference for the current patient.
                      </p>
                      <div className="bodies">
                        <Body onSite={setSite} />
                        <Body back onSite={setSite} />
                      </div>
                      <label className="field">
                        Selected site
                        <select
                          value={site}
                          onChange={(e) => setSite(e.target.value)}
                        >
                          {sites.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <p className="muted">
                        Capture includes a separate site and procedure
                        assignment. This picker is a chart reference, not lesion
                        tracking.
                      </p>
                    </section>
                  </div>
                </>
              )}
              {page === "Capture" &&
                (canWrite ? (
                  <CaptureStudio
                    key="capture"
                    people={people.map((p) => ({ ...p, id: p.id }))}
                    patientId={selected.id}
                    encounters={encounters}
                    onPatient={pickPatient}
                    onCommit={addMedia}
                    notify={setToast}
                    onPending={setPendingCount}
                    initialEncounterId={encounter?.id}
                    onCreateEncounter={() =>
                      guard(() => {
                        setProfile(true);
                        setTab("Encounters");
                        setPage("Patients");
                        showModal("New encounter");
                      })
                    }
                  />
                ) : (
                  <section className="card empty">
                    <ShieldCheck size={36} />
                    <h2>Read-only access</h2>
                    <p>
                      Your auditor account can view charts and media. Capture is
                      available to clinical staff.
                    </p>
                  </section>
                ))}
              {page === "Media" && (
                <MediaStudio
                  people={people}
                  selectedId={selected.id}
                  items={committedMedia}
                  encounters={encounters}
                  onPatient={pickPatient}
                  onCapture={() => go("Capture")}
                  onVersion={addVersion}
                  notify={setToast}
                  canWrite={canWrite}
                />
              )}
              {page === "Device" && (
                <div className="workflow-grid">
                  <section className="card device-card">
                    <div className="device-art">
                      <Glasses size={120} strokeWidth={1} />
                    </div>
                    <span className="subtle-pill">MENTRA LIVE</span>
                    <h2>Care, from your perspective.</h2>
                    <p>Hands-free capture. Connected to the patient story.</p>
                    <span className="status">Integration pending</span>
                  </section>
                  <section className="card padded">
                    <h2>Device connection</h2>
                    <p>The hardware adapter has not been connected.</p>
                    {[
                      ["Connection", "Not connected"],
                      ["Battery", "Unavailable"],
                      ["Video quality", "Awaiting capabilities"],
                      ["Audio", "Awaiting capabilities"],
                      ["Sync queue", "No device events"],
                    ].map(([k, v]) => (
                      <div className="setting-row" key={k}>
                        <span>{k}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                    <button
                      className="primary full"
                      disabled={!canWrite}
                      onClick={() => go("Capture")}
                    >
                      <Camera size={17} />
                      Use browser capture
                    </button>
                  </section>
                </div>
              )}
              {page === "Settings" && (
                <div className="settings-grid">
                  <section className="card padded">
                    <div className="card-heading">
                      <div>
                        <h2>Practice workspace</h2>
                        <p>{session.clinic.name}</p>
                      </div>
                      <span className="subtle-pill">Fictional data only</span>
                    </div>
                    {[
                      ["Your account", session.user.email],
                      ["Role", session.user.role],
                      [
                        "Storage",
                        "Server-side database and private media files",
                      ],
                      ["Session", "8 hours · Sign in required"],
                      ["Clinical consent", "Not connected"],
                      ["AI / EHR / Mentra", "Not connected"],
                    ].map(([k, v]) => (
                      <div className="setting-row" key={k}>
                        <span>{k}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                    <p className="muted">
                      This is a working development app. Backups, managed
                      authentication, malware scanning, secure hosting, and
                      clinical sign-off are required before a real patient
                      pilot.
                    </p>
                    <button
                      className="secondary"
                      onClick={() =>
                        guard(() => {
                          logout().catch((e) => setError(e.message));
                        })
                      }
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </section>
                  {session.user.role === "admin" && (
                    <section className="card padded">
                      <div className="card-heading">
                        <div>
                          <h2>Your team</h2>
                          <p>Invite-only workspace accounts.</p>
                        </div>
                        <button
                          className="secondary"
                          onClick={() => showModal("Add team member")}
                        >
                          <Plus size={15} />
                          Add member
                        </button>
                      </div>
                      {team.map((u) => (
                        <div className="team-row" key={u.id}>
                          <span className="avatar">{initials(u.name)}</span>
                          <div>
                            <strong>{u.name}</strong>
                            <small>{u.email}</small>
                          </div>
                          <span className="subtle-pill">{u.role}</span>
                        </div>
                      ))}
                      <p className="muted">
                        Admins manage accounts. Physicians and assistants edit
                        charts and capture media. Auditors have read-only
                        access.
                      </p>
                    </section>
                  )}
                  {["admin", "auditor"].includes(session.user.role) && (
                    <section className="card padded audit-card">
                      <h2>Recent workspace activity</h2>
                      <p className="section-description">
                        Server-recorded actions. Patient details and note
                        contents are excluded from this list.
                      </p>
                      <div className="activity-list">
                        {audit.map((event) => (
                          <div className="activity-row" key={event.id}>
                            <span className="activity-dot" />
                            <div>
                              <strong>
                                {event.action
                                  .replace(/\./g, " · ")
                                  .replace(/_/g, " ")}
                              </strong>
                              <small>
                                {event.actor} · {formatDate(event.date)}
                              </small>
                            </div>
                          </div>
                        ))}
                        {!audit.length && <p>No activity recorded.</p>}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-mark">✧</span>A clearer picture of care.
            </span>
            <span>Meda · Development workspace</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation
          .slice(1)
          .concat([{ name: "Settings", icon: Settings }])
          .map(({ name, icon: Icon }) => (
            <button
              aria-label={name}
              aria-current={page === name ? "page" : undefined}
              className={page === name ? "active" : ""}
              onClick={() => go(name)}
              key={name}
            >
              <Icon size={21} />
              <span>{name === "Settings" ? "More" : name}</span>
            </button>
          ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
      {queuedAction && (
        <Dialog title="Unsaved work" onClose={() => setQueuedAction(null)}>
          <p>
            {pendingCount
              ? "Your review queue contains files that have not been uploaded. Leaving this page discards those files."
              : "Your encounter note has unsaved changes."}
          </p>
          <div className="actions">
            <button className="secondary" onClick={() => setQueuedAction(null)}>
              Keep working
            </button>
            <button
              className="primary danger"
              onClick={() => {
                setNote(encounter?.note || "");
                setPendingCount(0);
                const action = queuedAction;
                setQueuedAction(null);
                action();
              }}
            >
              Discard and continue
            </button>
          </div>
        </Dialog>
      )}
      {modal && (
        <Dialog
          title={modal}
          wide={modal === "Review pending uploads"}
          onClose={() => {
            if (!busy && !recoveryBusy) setModal("");
          }}
        >
          {modal === "Review pending uploads" ? (
            <>
              <p>
                These uploaded files survived an interrupted review. Verify the
                patient and encounter before adding them to the chart. Review up
                to 10 files at a time.
              </p>
              <label className="field">
                Patient
                <select
                  value={pendingPatient}
                  onChange={(e) => setPendingPatient(e.target.value)}
                >
                  {people
                    .filter((p) => pendingMedia.some((m) => m.patient === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.mrn}
                      </option>
                    ))}
                </select>
              </label>
              <div className="staged-list">
                {pendingMedia
                  .filter((m) => m.patient === pendingPatient)
                  .slice(0, 10)
                  .map((m) => (
                    <div key={m.id} className="staged-item">
                      <div className="staged-thumbnail">
                        {m.type.startsWith("image") ? (
                          <img src={m.url} alt={m.name} />
                        ) : (
                          <Images size={22} />
                        )}
                      </div>
                      <div>
                        <strong>{m.name}</strong>
                        <small>
                          {
                            encounters.find((e) => e.id === m.encounterId)
                              ?.reason
                          }{" "}
                          · {m.site} · {m.phase}
                        </small>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="actions">
                <button
                  className="primary"
                  disabled={recoveryBusy}
                  onClick={() => recoverPending(true)}
                >
                  {recoveryBusy ? "Working…" : "Confirm and add to gallery"}
                </button>
                <button
                  className="secondary"
                  disabled={recoveryBusy}
                  onClick={() => recoverPending(false)}
                >
                  Discard these uploads
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="section-description">
                {modal === "Add team member"
                  ? "Create an account for a trusted team member. Share its password securely outside this app."
                  : "Fictional patient information only. Changes are saved to the server."}
              </p>
              <form onSubmit={formSubmit}>
                {modal === "New patient" ? (
                  <>
                    <label className="field">
                      Patient name
                      <input
                        name="name"
                        required
                        maxLength={100}
                        autoComplete="off"
                      />
                    </label>
                    <div className="form-grid">
                      <label className="field">
                        MRN
                        <input
                          name="mrn"
                          required
                          maxLength={40}
                          placeholder="Unique medical record number"
                        />
                      </label>
                      <label className="field">
                        Age
                        <input
                          name="age"
                          type="number"
                          min="0"
                          max="120"
                          required
                        />
                      </label>
                    </div>
                    <label className="field">
                      Sex
                      <select name="sex">
                        <option>Female</option>
                        <option>Male</option>
                        <option>Not specified</option>
                      </select>
                    </label>
                  </>
                ) : modal === "New encounter" ? (
                  <>
                    <div className="assignment-summary">
                      <strong>{selected?.name}</strong>
                      <small>MRN {selected?.mrn}</small>
                    </div>
                    <label className="field">
                      Reason for visit
                      <input
                        name="reason"
                        required
                        maxLength={200}
                        list="encounter-reasons"
                        placeholder="e.g. Full skin examination"
                      />
                      <datalist id="encounter-reasons">
                        {[
                          "Full skin examination",
                          "Lesion evaluation",
                          "Biopsy",
                          "Excision",
                          "Post-procedure follow-up",
                          "Rash evaluation",
                          "Acne follow-up",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </datalist>
                    </label>
                  </>
                ) : modal === "Add procedure" ? (
                  <>
                    <label className="field">
                      Procedure type
                      <select name="type">
                        {procedureTypes.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Anatomical site
                      <select name="site" defaultValue={site}>
                        {sites.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Phase
                      <select name="phase">
                        <option>Pre</option>
                        <option>Intra</option>
                        <option>Post</option>
                      </select>
                    </label>
                  </>
                ) : modal === "Edit dermatology profile" ? (
                  <>
                    {[
                      ["history", "Skin & family history", selected?.history],
                      [
                        "medications",
                        "Current medications",
                        selected?.medications,
                      ],
                      [
                        "allergies",
                        "Allergies & reactions",
                        selected?.allergies,
                      ],
                    ].map(([key, label, value]) => (
                      <label className="field" key={key}>
                        {label}
                        <textarea
                          name={key}
                          maxLength={5000}
                          defaultValue={value}
                        />
                      </label>
                    ))}
                  </>
                ) : (
                  <>
                    <label className="field">
                      Full name
                      <input name="name" required maxLength={100} />
                    </label>
                    <label className="field">
                      Email
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                      />
                    </label>
                    <label className="field">
                      Role
                      <select name="role">
                        <option value="physician">Physician</option>
                        <option value="assistant">
                          Nurse / Medical assistant
                        </option>
                        <option value="auditor">Read-only auditor</option>
                      </select>
                    </label>
                    <label className="field">
                      Initial password
                      <input
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        required
                      />
                      <small>
                        At least 12 characters. Password reset is not connected
                        yet.
                      </small>
                    </label>
                  </>
                )}
                <button className="primary full" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : modal === "Add team member"
                      ? "Create account"
                      : "Save changes"}
                </button>
              </form>
            </>
          )}
          {modalError && (
            <p className="inline-error" role="alert">
              {modalError}
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}
