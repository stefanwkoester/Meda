import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Upload,
  Glasses,
  Mic,
  Video,
  CheckCircle2,
  X,
  Square,
  AlertCircle,
  ImagePlus,
  Plus as PlusIcon,
} from "lucide-react";
import {
  sites,
  validateFile,
  validateAssignment,
  type Encounter,
  type MediaAsset,
} from "../domain/workspace";
type Patient = { id: string; name: string; mrn?: string };
type Staged = { id: string; file: File; url: string; fingerprint: string };
export function CaptureStudio({
  people,
  patientId,
  encounters,
  onPatient,
  onCommit,
  notify,
  onPending,
  initialEncounterId,
  onCreateEncounter,
}: {
  people: Patient[];
  patientId: string;
  encounters: Encounter[];
  onPatient: (id: string) => void;
  onCommit: (items: MediaAsset[]) => Promise<void>;
  notify: (s: string) => void;
  onPending: (n: number) => void;
  initialEncounterId?: string;
  onCreateEncounter: () => void;
}) {
  const [source, setSource] = useState("Upload"),
    [mode, setMode] = useState("Photo"),
    [encounterId, setEncounterId] = useState(
      encounters.find(
        (e) => e.id === initialEncounterId && e.patientId === patientId,
      )?.id ||
        encounters.find((e) => e.patientId === patientId)?.id ||
        "",
    ),
    [procedureId, setProcedureId] = useState(""),
    [site, setSite] = useState("Not assigned"),
    [phase, setPhase] = useState<"Pre" | "Intra" | "Post">("Pre"),
    [confirmed, setConfirmed] = useState(false),
    [staged, setStaged] = useState<Staged[]>([]),
    [error, setError] = useState(""),
    [stream, setStream] = useState<MediaStream | null>(null),
    [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [opening, setOpening] = useState(false),
    [dragging, setDragging] = useState(false),
    [showDiscard, setShowDiscard] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    input = useRef<HTMLInputElement>(null),
    recorder = useRef<MediaRecorder | null>(null),
    live = useRef(true),
    streamRef = useRef<MediaStream | null>(null),
    urls = useRef(new Set<string>()),
    fingerprints = useRef(new Set<string>()),
    cameraGeneration = useRef(0);
  const patient = people.find((p) => p.id === patientId)!;
  const available = encounters.filter((e) => e.patientId === patientId);
  const encounter = available.find((e) => e.id === encounterId);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      cameraGeneration.current++;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recorder.current?.state === "recording") recorder.current.stop();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      onPending(0);
    };
  }, []);
  useEffect(() => {
    setConfirmed(false);
    setEncounterId(
      encounters.find(
        (e) => e.id === initialEncounterId && e.patientId === patientId,
      )?.id ||
        encounters.find((e) => e.patientId === patientId)?.id ||
        "",
    );
    setProcedureId("");
  }, [patientId]);
  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
  }, [stream, mode]);
  useEffect(() => {
    onPending(staged.length + (recording ? 1 : 0));
  }, [staged.length, recording, onPending]);
  function stopCamera() {
    cameraGeneration.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setOpening(false);
  }
  function stage(files: File[]) {
    let messages: string[] = [];
    const additions: Staged[] = [];
    for (const file of files) {
      const err = validateFile(file);
      if (err) {
        messages.push(`${file.name}: ${err}`);
        continue;
      }
      const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
      if (fingerprints.current.has(fingerprint)) {
        messages.push(`${file.name} is already in this review queue.`);
        continue;
      }
      if (staged.length + additions.length >= 10) {
        messages.push("The review queue holds up to 10 files.");
        break;
      }
      fingerprints.current.add(fingerprint);
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      additions.push({ id: crypto.randomUUID(), file, url, fingerprint });
    }
    setStaged((old) => [...old, ...additions]);
    setError(messages.join(" "));
  }
  function remove(item: Staged) {
    URL.revokeObjectURL(item.url);
    urls.current.delete(item.url);
    fingerprints.current.delete(item.fingerprint);
    setStaged((old) => old.filter((f) => f.id !== item.id));
    setConfirmed(false);
  }
  async function enable() {
    if (opening) return;
    setError("");
    setOpening(true);
    const generation = ++cameraGeneration.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error();
      const next = await navigator.mediaDevices.getUserMedia({
        video: mode === "Audio" ? false : { facingMode: "environment" },
        audio: mode !== "Photo",
      });
      if (!live.current || generation !== cameraGeneration.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = next;
      setStream(next);
    } catch {
      if (live.current && generation === cameraGeneration.current)
        setError(
          "Camera or microphone unavailable, in use, or permission denied. Check browser permissions, or use Upload.",
        );
    } finally {
      if (live.current && generation === cameraGeneration.current)
        setOpening(false);
    }
  }
  function photo() {
    if (!video.current?.videoWidth) {
      setError("Camera is still preparing. Please try again in a moment.");
      return;
    }
    const c = document.createElement("canvas");
    c.width = video.current.videoWidth;
    c.height = video.current.videoHeight;
    c.getContext("2d")!.drawImage(video.current, 0, 0);
    c.toBlob(
      (b) => {
        if (b && live.current)
          stage([
            new File([b], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }),
          ]);
      },
      "image/jpeg",
      0.92,
    );
    stopCamera();
  }
  function record() {
    if (!stream) return;
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!window.MediaRecorder) {
      setError(
        "Recording is not supported in this browser. Upload an existing file instead.",
      );
      return;
    }
    try {
      const chunks: BlobPart[] = [];
      const mime = (
        mode === "Audio"
          ? ["audio/webm", "audio/mp4"]
          : ["video/webm", "video/mp4"]
      ).find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) {
        setError("No compatible recording format. Please use Upload.");
        return;
      }
      const r = new MediaRecorder(stream, { mimeType: mime });
      recorder.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        if (!live.current) return;
        const b = new Blob(chunks, { type: mime });
        stage([
          new File(
            [b],
            `${mode.toLowerCase()}-${Date.now()}.${mime.includes("mp4") ? "mp4" : "webm"}`,
            { type: mime },
          ),
        ]);
        setRecording(false);
        stopCamera();
      };
      r.onerror = () => {
        setError("Recording failed. Please try again or upload a file.");
        setRecording(false);
        stopCamera();
      };
      r.start(1000);
      setRecording(true);
    } catch {
      setError("Recording could not start. Try Upload instead.");
    }
  }
  async function commit() {
    const err = validateAssignment(
      patientId,
      encounterId,
      procedureId,
      encounters,
    );
    if (err) {
      setError(err);
      return;
    }
    if (!confirmed || !staged.length || busy) return;
    setBusy(true);
    try {
      const items: MediaAsset[] = staged.map((s) => ({
        id: s.id,
        patient: patientId,
        encounterId,
        procedureId,
        url: s.url,
        name: s.file.name,
        type: s.file.type,
        rotation: 0,
        createdAt: new Date().toISOString(),
        site,
        phase,
        source,
      }));
      await onCommit(items);
      for (const item of items) urls.current.delete(item.url);
      setStaged([]);
      notify(
        `${items.length} demo ${items.length === 1 ? "file added" : "files added"} to ${patient.name}’s gallery.`,
      );
    } catch (e) {
      setError(
        (e as Error).message ||
          "Upload failed. Your queue is intact. Please retry.",
      );
    } finally {
      if (live.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="workflow-steps" aria-label="Capture workflow">
        <span className="done">
          1 <strong>Select context</strong>
        </span>
        <span className={staged.length ? "done" : "current"}>
          2 <strong>Capture or upload</strong>
        </span>
        <span className={staged.length ? "current" : ""}>
          3 <strong>Review & assign</strong>
        </span>
      </div>
      <div className="workflow-grid">
        <section className="card padded">
          <div className="section-kicker">PATIENT CONTEXT</div>
          <h2>The right patient. Every time.</h2>
          <p className="section-description">
            Choose the encounter and procedure this media belongs to.
          </p>
          <label className="field">
            Active patient
            <select
              value={patientId}
              disabled={recording}
              onChange={(e) => onPatient(e.target.value)}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · MRN {p.mrn || p.id}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Encounter
            <select
              value={encounterId}
              onChange={(e) => {
                setEncounterId(e.target.value);
                setProcedureId("");
                setConfirmed(false);
              }}
            >
              {!available.length && (
                <option value="">
                  No encounters — create one in the patient chart
                </option>
              )}
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.reason}
                </option>
              ))}
            </select>
          </label>
          {!available.length && (
            <button className="secondary full" onClick={onCreateEncounter}>
              <PlusIcon />
              Create a patient encounter
            </button>
          )}
          <label className="field">
            Procedure (optional)
            <select
              value={procedureId}
              onChange={(e) => {
                setProcedureId(e.target.value);
                const p = encounter?.procedures.find(
                  (p) => p.id === e.target.value,
                );
                if (p) {
                  setSite(p.site);
                  setPhase(p.phase);
                }
                setConfirmed(false);
              }}
            >
              <option value="">Encounter-level media</option>
              {encounter?.procedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.type} · {p.site}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label className="field">
              Anatomical site
              <select value={site} onChange={(e) => setSite(e.target.value)}>
                {sites.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Phase
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as typeof phase)}
              >
                {["Pre", "Intra", "Post"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="context-notice">
            <Shield />
            <div>
              <strong>Synthetic workspace</strong>
              <p>
                Use fictional records and nonclinical files only. Clinical
                consent and secure storage are not connected.
              </p>
            </div>
          </div>
        </section>
        <section className="card padded">
          <div className="section-kicker">
            {staged.length ? "REVIEW QUEUE" : "CAPTURE SOURCE"}
          </div>
          <h2>
            {staged.length ? "Review & assign" : "Capture the full picture"}
          </h2>
          {staged.length > 0 && (
            <div className="assignment-summary">
              <strong>{patient.name}</strong>
              <small>
                {encounter?.reason || "Choose an encounter"} · {site}
              </small>
            </div>
          )}
          <div className="segments">
            {["Upload", "Phone", "Glasses"].map((s) => (
              <button
                disabled={recording}
                key={s}
                className={s === source ? "active" : ""}
                onClick={() => {
                  stopCamera();
                  setSource(s);
                  setError("");
                }}
              >
                {s === "Upload" ? (
                  <Upload size={15} />
                ) : s === "Phone" ? (
                  <Camera size={15} />
                ) : (
                  <Glasses size={15} />
                )}{" "}
                {s}
              </button>
            ))}
          </div>
          {source === "Glasses" ? (
            <div className="upload-zone">
              <Glasses size={48} />
              <h3>Mentra integration pending</h3>
              <p>
                No device is connected. Browser capture and upload are
                available.
              </p>
              <button className="secondary" onClick={() => setSource("Upload")}>
                Use upload instead
              </button>
            </div>
          ) : source === "Upload" ? (
            <>
              <button
                className={`upload-zone drop-zone ${dragging ? "dragging" : ""}`}
                onClick={() => input.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  stage(Array.from(e.dataTransfer.files));
                }}
              >
                <ImagePlus size={36} />
                <h3>
                  {staged.length ? "Add more files" : "Drop demo media here"}
                </h3>
                <p>or click to browse your computer</p>
                <small>
                  Photos, video, audio · 25 MB each · 10 files per batch
                </small>
              </button>
              <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav"
                multiple
                hidden
                onChange={(e) => {
                  stage(Array.from(e.target.files || []));
                  e.target.value = "";
                }}
              />
            </>
          ) : (
            <>
              <div className="capture-modes">
                {[
                  { name: "Photo", icon: Camera },
                  { name: "Video", icon: Video },
                  { name: "Audio", icon: Mic },
                ].map(({ name, icon: Icon }) => (
                  <button
                    disabled={recording}
                    aria-pressed={mode === name}
                    className={mode === name ? "active" : ""}
                    key={name}
                    onClick={() => {
                      stopCamera();
                      setMode(name);
                    }}
                  >
                    <Icon size={17} />
                    {name}
                  </button>
                ))}
              </div>
              <div className="upload-zone camera-stage">
                {stream && mode !== "Audio" ? (
                  <video ref={video} autoPlay playsInline muted />
                ) : (
                  <>
                    <span className={recording ? "recording-indicator" : ""}>
                      {mode === "Audio" ? (
                        <Mic size={40} />
                      ) : (
                        <Camera size={40} />
                      )}
                    </span>
                    <h3>
                      {recording
                        ? "Recording audio…"
                        : stream
                          ? "Microphone ready"
                          : `Ready for ${mode.toLowerCase()} capture`}
                    </h3>
                    <p>
                      {stream
                        ? "Keep this page open until recording stops."
                        : "Enable your browser camera or microphone to continue."}
                    </p>
                  </>
                )}
              </div>
              <div className="actions">
                {!stream ? (
                  <button
                    className="primary"
                    disabled={opening || !encounterId}
                    onClick={enable}
                  >
                    {opening
                      ? "Requesting permission…"
                      : mode === "Audio"
                        ? "Enable microphone"
                        : "Enable camera"}
                  </button>
                ) : (
                  <>
                    <button
                      className={`primary ${recording ? "danger" : ""}`}
                      onClick={mode === "Photo" ? photo : record}
                    >
                      {recording ? <Square size={16} /> : <Camera size={16} />}{" "}
                      {mode === "Photo"
                        ? "Take photo"
                        : recording
                          ? "Stop recording"
                          : `Record ${mode.toLowerCase()}`}
                    </button>
                    {!recording && (
                      <button className="secondary" onClick={stopCamera}>
                        Stop camera
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          {error && (
            <div className="inline-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {staged.length > 0 && (
            <>
              <div className="staged-list">
                {staged.map((item) => (
                  <div className="staged-item" key={item.id}>
                    <div className="staged-thumbnail">
                      {item.file.type.startsWith("image/") ? (
                        <img src={item.url} alt={item.file.name} />
                      ) : item.file.type.startsWith("video/") ? (
                        <Video size={23} />
                      ) : (
                        <Mic size={23} />
                      )}
                    </div>
                    <div>
                      <strong>{item.file.name}</strong>
                      <small>
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB · Pending
                        review
                      </small>
                      <details className="queue-detail">
                        <summary>Preview file</summary>
                        <div className="queue-preview">
                          {item.file.type.startsWith("image/") ? (
                            <img src={item.url} alt={item.file.name} />
                          ) : item.file.type.startsWith("video/") ? (
                            <video src={item.url} controls preload="metadata" />
                          ) : (
                            <audio src={item.url} controls preload="metadata" />
                          )}
                        </div>
                      </details>
                    </div>
                    <button
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => remove(item)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="review-context">
                Reviewing for <strong>{patient.name}</strong> · MRN{" "}
                {patient.mrn || patient.id}. Change the patient or encounter
                before confirming if this assignment is incorrect.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I reviewed these demo files and confirm the patient and
                  encounter above are correct.
                </span>
              </label>
              <div className="actions review-actions">
                <button
                  className="primary"
                  disabled={!confirmed || !encounterId || busy}
                  onClick={commit}
                >
                  <CheckCircle2 size={17} />
                  {busy
                    ? "Adding files…"
                    : `Add ${staged.length === 1 ? "file" : `${staged.length} files`} to gallery`}
                </button>
                <button
                  className="secondary"
                  onClick={() => setShowDiscard(true)}
                >
                  Discard queue
                </button>
              </div>
              {showDiscard && (
                <div className="discard-confirm" role="alert">
                  <p>
                    Remove all {staged.length} files from this review queue?
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setShowDiscard(false)}
                  >
                    Keep reviewing
                  </button>
                  <button
                    className="primary danger"
                    onClick={() => {
                      staged.forEach(remove);
                      setShowDiscard(false);
                    }}
                  >
                    Discard files
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
function Shield() {
  return <CheckCircle2 size={21} />;
}
