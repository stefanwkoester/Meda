import { useEffect, useRef, useState } from "react";
import {
  Images,
  Plus,
  Search,
  Video,
  Mic,
  RotateCw,
  Crop,
  Pencil,
  Type,
  Undo2,
  Redo2,
  Download,
  GitCompareArrows,
  Check,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Dialog } from "./Dialog";
import {
  formatDate,
  type Encounter,
  type MediaAsset,
} from "../domain/workspace";
type Point = { x: number; y: number };
type Stroke = Point[];
type Edit = {
  rotation: number;
  crop: boolean;
  strokes: Stroke[];
  label: string;
};
const clean: Edit = { rotation: 0, crop: false, strokes: [], label: "" };
function MediaPreview({ item }: { item: MediaAsset }) {
  return item.type.startsWith("image") ? (
    <img src={item.url} alt={item.name} />
  ) : item.type.startsWith("video") ? (
    <video src={item.url} controls preload="metadata" />
  ) : (
    <div className="audio-preview">
      <Mic size={42} />
      <audio src={item.url} controls preload="metadata" />
    </div>
  );
}
export function MediaStudio({
  people,
  selectedId,
  items,
  encounters,
  onPatient,
  onCapture,
  onVersion,
  notify,
  canWrite = true,
}: {
  people: { id: string; name: string }[];
  selectedId: string;
  items: MediaAsset[];
  encounters: Encounter[];
  onPatient: (id: string) => void;
  onCapture: () => void;
  onVersion: (m: MediaAsset) => Promise<void>;
  notify: (s: string) => void;
  canWrite?: boolean;
}) {
  const [filter, setFilter] = useState("All"),
    [search, setSearch] = useState(""),
    [encounterFilter, setEncounterFilter] = useState(""),
    [editing, setEditing] = useState<MediaAsset | null>(null),
    [compareIds, setCompareIds] = useState<string[]>([]),
    [comparing, setComparing] = useState(false);
  const patient = people.find((p) => p.id === selectedId)!;
  const patientItems = items.filter((m) => m.patient === selectedId);
  const visible = patientItems
    .filter(
      (m) =>
        (filter === "All" ||
          m.type.startsWith(
            filter === "Photos"
              ? "image"
              : filter === "Videos"
                ? "video"
                : "audio",
          )) &&
        (!encounterFilter || m.encounterId === encounterFilter) &&
        (m.name + " " + m.site).toLowerCase().includes(search.toLowerCase()),
    )
    .slice()
    .reverse();
  function changePatient(id: string) {
    onPatient(id);
    setCompareIds([]);
    setEncounterFilter("");
    setSearch("");
  }
  return (
    <section className="card padded gallery">
      <div className="card-heading">
        <div>
          <h2>{patient.name}’s media</h2>
          <p>
            {patientItems.length} {patientItems.length === 1 ? "file" : "files"}{" "}
            · Originals and separate edit versions
          </p>
        </div>
        <button className="primary" disabled={!canWrite} onClick={onCapture}>
          <Plus size={17} />
          Add media
        </button>
      </div>
      <div className="gallery-context">
        <label className="field">
          Patient
          <select
            value={selectedId}
            onChange={(e) => changePatient(e.target.value)}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Encounter
          <select
            value={encounterFilter}
            onChange={(e) => {
              setEncounterFilter(e.target.value);
              setCompareIds([]);
            }}
          >
            <option value="">All encounters</option>
            {encounters
              .filter((e) => e.patientId === selectedId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.reason}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="gallery-toolbar">
        <div className="tabs">
          {["All", "Photos", "Videos", "Audio"].map((t) => (
            <button
              aria-pressed={filter === t}
              className={filter === t ? "active" : ""}
              key={t}
              onClick={() => setFilter(t)}
            >
              {t}
              {t === "All" && (
                <span className="tab-count">{patientItems.length}</span>
              )}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search media"
            placeholder="Search file or site"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {compareIds.length > 0 && (
        <div className="compare-bar">
          <span>{compareIds.length} of 2 images selected</span>
          <button
            className="primary"
            disabled={compareIds.length !== 2}
            onClick={() => setComparing(true)}
          >
            <GitCompareArrows size={16} />
            Compare images
          </button>
          <button
            aria-label="Clear comparison selection"
            onClick={() => setCompareIds([])}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {!visible.length ? (
        <div className="empty">
          <div className="empty-icon">
            <Images size={32} />
          </div>
          <h3>
            {patientItems.length
              ? "No matching media"
              : "A place for the full picture."}
          </h3>
          <p>
            {patientItems.length
              ? "Try another filter or search term."
              : "Add demo photos, recordings, or audio to start the patient story."}
          </p>
          <button
            className="secondary"
            onClick={
              patientItems.length
                ? () => {
                    setFilter("All");
                    setSearch("");
                    setEncounterFilter("");
                  }
                : onCapture
            }
          >
            {patientItems.length ? "Clear filters" : "Add your first demo file"}
          </button>
        </div>
      ) : (
        <>
          <p className="gallery-hint">
            <GitCompareArrows size={14} />
            Select two photo checkboxes to compare. Open a photo to crop,
            rotate, draw, or label.
          </p>
          <div className="media-grid">
            {visible.map((m) => (
              <article
                className={`media-card ${compareIds.includes(m.id) ? "selected" : ""}`}
                key={m.id}
              >
                <button
                  className="media-tile"
                  onClick={() => setEditing(m)}
                  aria-label={`Open ${m.name}`}
                >
                  <div>
                    {m.type.startsWith("image") ? (
                      <img src={m.url} alt={m.name} />
                    ) : m.type.startsWith("video") ? (
                      <Video size={34} />
                    ) : (
                      <Mic size={34} />
                    )}
                    <span className="file-type">
                      {m.type.startsWith("image")
                        ? "Photo"
                        : m.type.startsWith("video")
                          ? "Video"
                          : "Audio"}
                    </span>
                  </div>
                  <strong>{m.name}</strong>
                  <small>
                    {m.site} · {m.phase}
                  </small>
                  <small>
                    {formatDate(m.createdAt)} ·{" "}
                    {m.parentId ? "Edited version" : "Original"}
                  </small>
                </button>
                {m.type.startsWith("image") && (
                  <label className="compare-select">
                    <input
                      type="checkbox"
                      aria-label={`Compare ${m.name}`}
                      checked={compareIds.includes(m.id)}
                      disabled={
                        compareIds.length === 2 && !compareIds.includes(m.id)
                      }
                      onChange={(e) =>
                        setCompareIds(
                          e.target.checked
                            ? [...compareIds, m.id]
                            : compareIds.filter((id) => id !== m.id),
                        )
                      }
                    />
                    <span>Compare</span>
                  </label>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      {editing && (
        <ImageEditor
          item={editing}
          original={
            items.find((m) => m.id === (editing.parentId || editing.id)) ||
            editing
          }
          onClose={() => setEditing(null)}
          canWrite={canWrite}
          onSave={async (m) => {
            await onVersion(m);
            setEditing(null);
            notify("Edited version created. The original file is unchanged.");
          }}
        />
      )}
      {comparing && (
        <Dialog
          wide
          title="Image comparison"
          onClose={() => setComparing(false)}
        >
          <p>Side by side · {patient.name} · No automated measurements</p>
          <div className="comparison-grid">
            {compareIds.map((id) => {
              const m = items.find((i) => i.id === id)!;
              return (
                <figure key={id}>
                  <img src={m.url} alt={m.name} />
                  <figcaption>
                    <strong>{m.name}</strong>
                    <small>
                      {formatDate(m.createdAt)} · {m.site} ·{" "}
                      {m.parentId ? "Edited version" : "Original"}
                    </small>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </Dialog>
      )}
    </section>
  );
}
function ImageEditor({
  item,
  original,
  onClose,
  onSave,
  canWrite,
}: {
  item: MediaAsset;
  original: MediaAsset;
  onClose: () => void;
  onSave: (m: MediaAsset) => Promise<void>;
  canWrite: boolean;
}) {
  const [history, setHistory] = useState<Edit[]>([clean]),
    [index, setIndex] = useState(0),
    [drawing, setDrawing] = useState(false),
    [label, setLabel] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false),
    [ready, setReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    image = useRef<HTMLImageElement | null>(null),
    activeStroke = useRef<Stroke | null>(null),
    current = history[index],
    dirty = index > 0;
  const isImage = item.type.startsWith("image");
  function change(edit: Edit) {
    setHistory([...history.slice(0, index + 1), edit]);
    setIndex(index + 1);
  }
  function paint(edit: Edit) {
    const c = canvas.current,
      img = image.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d")!;
    const side = edit.rotation % 180 !== 0;
    const scale = Math.min(
      1,
      1800 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const w = Math.round(img.naturalWidth * scale),
      h = Math.round(img.naturalHeight * scale);
    const cw = edit.crop ? Math.round(w * 0.8) : w,
      ch = edit.crop ? Math.round(h * 0.8) : h;
    c.width = side ? ch : cw;
    c.height = side ? cw : ch;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((edit.rotation * Math.PI) / 180);
    ctx.drawImage(
      img,
      edit.crop ? img.naturalWidth * 0.1 : 0,
      edit.crop ? img.naturalHeight * 0.1 : 0,
      edit.crop ? img.naturalWidth * 0.8 : img.naturalWidth,
      edit.crop ? img.naturalHeight * 0.8 : img.naturalHeight,
      -cw / 2,
      -ch / 2,
      cw,
      ch,
    );
    ctx.restore();
    ctx.strokeStyle = "#8752ea";
    ctx.lineWidth = Math.max(2, c.width * 0.005);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of edit.strokes) {
      if (!stroke.length) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * c.width, stroke[0].y * c.height);
      for (const p of stroke) ctx.lineTo(p.x * c.width, p.y * c.height);
      ctx.stroke();
    }
    if (edit.label) {
      const font = Math.max(16, Math.round(c.width * 0.035));
      ctx.font = `600 ${font}px sans-serif`;
      const text = edit.label.slice(0, 70);
      ctx.fillStyle = "#1e163dd9";
      ctx.fillRect(
        10,
        c.height - font * 2 - 10,
        Math.min(c.width - 20, ctx.measureText(text).width + 24),
        font * 2,
      );
      ctx.fillStyle = "#fff";
      ctx.fillText(text, 22, c.height - font * 0.6 - 10, c.width - 44);
    }
  }
  useEffect(() => {
    if (!isImage) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive) {
        image.current = img;
        setReady(true);
        paint(clean);
      }
    };
    img.onerror = () => {
      if (alive)
        setError(
          "This image cannot be decoded by your browser. Download the original to view it elsewhere.",
        );
    };
    img.src = item.url;
    return () => {
      alive = false;
    };
  }, [item.url]);
  useEffect(() => {
    if (ready) paint(current);
  }, [current, ready]);
  function point(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  }
  function finishStroke() {
    if (activeStroke.current && activeStroke.current.length > 1)
      change({
        ...current,
        strokes: [...current.strokes, activeStroke.current],
      });
    activeStroke.current = null;
  }
  async function save() {
    if (!canvas.current || !dirty || busy) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.current!.toBlob(
          (b) => (b ? resolve(b) : reject(Error("Could not export image"))),
          "image/png",
        ),
      );
      await onSave({
        ...item,
        id: crypto.randomUUID(),
        url: URL.createObjectURL(blob),
        name: `Edited · ${item.name.replace(/^(Edited · )+/, "").replace(/\.[^.]+$/, "")}.png`,
        type: "image/png",
        rotation: 0,
        parentId: original.id,
        createdAt: new Date().toISOString(),
        manifest: {
          rotation: current.rotation,
          crop: current.crop,
          annotations: current.strokes.length + (current.label ? 1 : 0),
        },
      });
    } catch {
      setError(
        "The edited image could not be created. Your original is unchanged.",
      );
      setBusy(false);
    }
  }
  function close() {
    if (dirty && !busy) setDiscard(true);
    else if (!busy) onClose();
  }
  return (
    <Dialog
      wide
      title={isImage ? "Photo editor" : "Media preview"}
      onClose={close}
    >
      <p className="editor-subtitle">
        {item.name} · {item.parentId ? "Edited version" : "Original"}
        <span className="subtle-pill">Original preserved</span>
      </p>
      {isImage ? (
        <>
          <div className="editor-tools">
            <button
              className="secondary"
              disabled={!ready || busy || !canWrite}
              onClick={() =>
                change({
                  ...current,
                  rotation: (current.rotation + 90) % 360,
                  strokes: [],
                })
              }
            >
              <RotateCw size={16} />
              Rotate
            </button>
            <button
              className={`secondary ${current.crop ? "tool-active" : ""}`}
              disabled={!ready || busy || !canWrite}
              aria-pressed={current.crop}
              onClick={() =>
                change({ ...current, crop: !current.crop, strokes: [] })
              }
            >
              <Crop size={16} />
              {current.crop ? "Reset crop" : "Crop 10% edges"}
            </button>
            <button
              className={`secondary ${drawing ? "tool-active" : ""}`}
              disabled={!ready || busy || !canWrite}
              aria-pressed={drawing}
              onClick={() => setDrawing(!drawing)}
            >
              <Pencil size={16} />
              Draw
            </button>
            <button
              className="secondary icon-only"
              disabled={!index || busy || !canWrite}
              aria-label="Undo edit"
              onClick={() => setIndex(index - 1)}
            >
              <Undo2 size={17} />
            </button>
            <button
              className="secondary icon-only"
              disabled={index === history.length - 1 || busy || !canWrite}
              aria-label="Redo edit"
              onClick={() => setIndex(index + 1)}
            >
              <Redo2 size={17} />
            </button>
          </div>
          <div className={`editor-canvas ${drawing ? "drawing" : ""}`}>
            <canvas
              ref={canvas}
              aria-label="Image editing canvas"
              onPointerDown={(e) => {
                if (drawing && !busy) {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  activeStroke.current = [point(e)];
                }
              }}
              onPointerMove={(e) => {
                if (activeStroke.current) {
                  activeStroke.current.push(point(e));
                  paint({
                    ...current,
                    strokes: [...current.strokes, activeStroke.current],
                  });
                }
              }}
              onPointerUp={finishStroke}
              onPointerCancel={() => {
                activeStroke.current = null;
                paint(current);
              }}
            />
          </div>
          <p className="muted">
            {drawing
              ? "Draw directly on the image. Turn Draw off to scroll on touch devices."
              : "Crop removes 10% from each edge. Rotating or cropping clears drawn marks; add annotations afterward."}{" "}
            Export resolution is limited to 1800 pixels.
          </p>
          <div className="label-control">
            <label className="field">
              Image label
              <input
                maxLength={70}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Add a short label"
              />
            </label>
            <button
              className="secondary"
              disabled={!ready || busy || !canWrite || !label.trim()}
              onClick={() => change({ ...current, label: label.trim() })}
            >
              <Type size={16} />
              Apply label
            </button>
          </div>
        </>
      ) : (
        <div className="media-preview">
          <MediaPreview item={item} />
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="editor-footer">
        <a className="secondary" href={original.url} download={original.name}>
          <Download size={16} />
          Download original
        </a>
        {item.parentId && (
          <a className="secondary" href={item.url} download={item.name}>
            <ImageIcon size={16} />
            Download version
          </a>
        )}
        {isImage && (
          <button
            className="primary"
            disabled={!ready || !dirty || busy || !canWrite}
            onClick={save}
          >
            <Check size={16} />
            {busy ? "Creating version…" : "Create edited version"}
          </button>
        )}
      </div>
      {!isImage && (
        <p className="muted">
          Video and audio playback are supported. Trimming and transcription are
          not part of this review build.
        </p>
      )}
      {discard && (
        <div className="discard-confirm" role="alert">
          <p>Discard the unsaved image edits?</p>
          <button className="secondary" onClick={() => setDiscard(false)}>
            Keep editing
          </button>
          <button className="primary danger" onClick={onClose}>
            Discard edits
          </button>
        </div>
      )}
    </Dialog>
  );
}
