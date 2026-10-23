import express from "express";
import multer from "multer";
import { DatabaseSync } from "node:sqlite";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const hash = (v) => createHash("sha256").update(v).digest("hex");
const now = () => new Date().toISOString();
function passwordHash(p) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64, { N: 16384 }).toString("hex")}`;
}
function passwordMatches(p, stored) {
  const [salt, key] = stored.split(":");
  return timingSafeEqual(
    scryptSync(p, salt, 64, { N: 16384 }),
    Buffer.from(key, "hex"),
  );
}
function invalid(message, status = 400, code = "VALIDATION_ERROR") {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  throw e;
}
function text(value, name, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    invalid(`Enter a valid ${name} (up to ${max} characters).`);
  return value.trim();
}
function email(value) {
  const v = text(value, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    invalid("Enter a valid email address.");
  return v;
}
function password(value) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    invalid("Use a password of 12–128 characters.");
  return value;
}
function safeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    clinicId: u.clinic_id,
  };
}
function fileType(b) {
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WAVE"
  )
    return "audio/wav";
  if (b.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))) return "webm";
  if (b.toString("ascii", 4, 8) === "ftyp") return "mp4";
  if (b.toString("ascii", 0, 4) === "OggS") return "audio/ogg";
  if (
    b.toString("ascii", 0, 3) === "ID3" ||
    (b[0] === 255 && (b[1] & 224) === 224)
  )
    return "audio/mpeg";
  return "";
}
export function createApp({
  dataDir = process.env.MEDA_DATA_DIR || path.resolve(".meda-data"),
  production = process.env.NODE_ENV === "production",
  appOrigin = process.env.APP_ORIGIN,
  setupKey = process.env.MEDA_SETUP_KEY,
} = {}) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const filesDir = path.join(dataDir, "media");
  fs.mkdirSync(filesDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(dataDir, "meda.sqlite"));
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(fs.readFileSync(path.join(here, "migrations.sql"), "utf8"));
  // Unreferenced files can remain after a process dies between filesystem and DB writes.
  const knownFiles = new Set(
    db
      .prepare("SELECT file_key FROM media")
      .all()
      .map((r) => r.file_key),
  );
  for (const f of fs.readdirSync(filesDir))
    if (!knownFiles.has(f)) fs.unlinkSync(path.join(filesDir, f));
  if (production && !appOrigin)
    throw new Error("Set APP_ORIGIN to the public HTTPS origin.");
  if (
    production &&
    !setupKey &&
    !db.prepare("SELECT id FROM users LIMIT 1").get()
  )
    throw new Error("Set MEDA_SETUP_KEY before first production startup.");
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "150kb" }));
  const attempts = new Map();
  const dummy = passwordHash(
    "a-random-unused-password-" + randomBytes(16).toString("hex"),
  );
  function audit(user, action, target) {
    db.prepare("INSERT INTO audit_events VALUES (?,?,?,?,?,?)").run(
      randomUUID(),
      user.clinic_id,
      user.id,
      action,
      target,
      now(),
    );
  }
  function transaction(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  function role(req, ...roles) {
    if (!roles.includes(req.user.role))
      invalid("Your role does not allow this action.", 403, "FORBIDDEN");
  }
  function patient(req, id) {
    const p = db
      .prepare("SELECT * FROM patients WHERE id=? AND clinic_id=?")
      .get(id, req.user.clinic_id);
    if (!p) invalid("Patient not found.", 404, "NOT_FOUND");
    return p;
  }
  function encounter(req, id) {
    const e = db
      .prepare("SELECT * FROM encounters WHERE id=? AND clinic_id=?")
      .get(id, req.user.clinic_id);
    if (!e) invalid("Encounter not found.", 404, "NOT_FOUND");
    return e;
  }
  function assigned(req, patientId, encounterId, procedureId) {
    patient(req, patientId);
    const e = encounter(req, encounterId);
    if (e.patient_id !== patientId)
      invalid(
        "Encounter does not belong to the selected patient.",
        409,
        "ASSIGNMENT_MISMATCH",
      );
    if (
      procedureId &&
      !db
        .prepare(
          "SELECT id FROM procedures WHERE id=? AND encounter_id=? AND clinic_id=?",
        )
        .get(procedureId, encounterId, req.user.clinic_id)
    )
      invalid(
        "Procedure does not belong to this encounter.",
        409,
        "ASSIGNMENT_MISMATCH",
      );
  }
  function mediaView(m) {
    return {
      id: m.id,
      patient: m.patient_id,
      encounterId: m.encounter_id,
      procedureId: m.procedure_id || "",
      url: `/api/v1/media/${m.id}/content`,
      name: m.name,
      type: m.mime,
      rotation: 0,
      createdAt: m.created_at,
      site: m.site,
      phase: m.phase,
      source: m.source,
      parentId: m.parent_id || undefined,
      manifest: m.manifest ? JSON.parse(m.manifest) : undefined,
      state: m.state,
    };
  }
  function login(res, u) {
    const token = randomBytes(32).toString("base64url"),
      csrf = randomBytes(24).toString("base64url");
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES (?,?,?,?)").run(
      hash(token),
      u.id,
      csrf,
      Date.now() + 8 * 3600000,
    );
    res.cookie("meda_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: production,
      maxAge: 8 * 3600000,
      path: "/",
    });
    return {
      user: safeUser(u),
      csrf,
      clinic: db
        .prepare("SELECT id,name FROM clinics WHERE id=?")
        .get(u.clinic_id),
    };
  }
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
      "Cache-Control": "no-store",
      ...(production
        ? {
            "Content-Security-Policy":
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
            "Strict-Transport-Security": "max-age=31536000",
          }
        : {}),
    });
    next();
  });
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.headers.origin;
      const allowed = appOrigin
        ? [appOrigin]
        : production
          ? []
          : [
              "http://localhost:5173",
              "http://127.0.0.1:5173",
              "http://localhost:3001",
              "http://127.0.0.1:3001",
            ];
      if (!origin || !allowed.includes(origin))
        return res.status(403).json({
          error: {
            code: "ORIGIN_REJECTED",
            message: "Request origin is not allowed.",
          },
        });
    }
    next();
  });
  app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/v1/auth/status", (_req, res) =>
    res.json({
      needsSetup: !db.prepare("SELECT id FROM users LIMIT 1").get(),
      setupKeyRequired: !!setupKey,
    }),
  );
  app.post("/api/v1/auth/setup", (req, res) => {
    if (db.prepare("SELECT id FROM users LIMIT 1").get())
      invalid(
        "Workspace setup is complete. Please sign in.",
        409,
        "ALREADY_CONFIGURED",
      );
    const body = req.body;
    if (
      setupKey &&
      (typeof body.setupKey !== "string" ||
        !timingSafeEqual(
          Buffer.from(hash(body.setupKey)),
          Buffer.from(hash(setupKey)),
        ))
    )
      invalid("Workspace setup key is incorrect.", 403, "SETUP_KEY_REQUIRED");
    const user = {
      id: randomUUID(),
      clinic_id: randomUUID(),
      email: email(body.email),
      name: text(body.name, "name", 100),
      role: "admin",
      password_hash: passwordHash(password(body.password)),
    };
    const clinic = text(body.clinic, "clinic name", 100);
    transaction(() => {
      db.prepare("INSERT INTO clinics VALUES (?,?,?)").run(
        user.clinic_id,
        clinic,
        now(),
      );
      db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)").run(
        user.id,
        user.clinic_id,
        user.email,
        user.name,
        user.role,
        user.password_hash,
        now(),
      );
      seed(db, user.clinic_id);
      audit(user, "workspace.created", user.clinic_id);
    });
    res.status(201).json(login(res, user));
  });
  app.post("/api/v1/auth/login", (req, res) => {
    const key = req.ip;
    const entry = attempts.get(key);
    if (entry && entry.until > Date.now() && entry.count >= 10)
      invalid(
        "Too many sign-in attempts. Try again in 15 minutes.",
        429,
        "RATE_LIMITED",
      );
    const e =
      typeof req.body.email === "string"
        ? req.body.email.toLowerCase().trim()
        : "";
    const p = typeof req.body.password === "string" ? req.body.password : "";
    if (p.length > 128)
      invalid("Email or password is incorrect.", 401, "UNAUTHORIZED");
    const u = db.prepare("SELECT * FROM users WHERE email=?").get(e);
    const matches = passwordMatches(p, u?.password_hash || dummy);
    if (!u || !matches) {
      if (attempts.size > 10000) attempts.clear();
      attempts.set(key, {
        count: entry && entry.until > Date.now() ? entry.count + 1 : 1,
        until:
          entry && entry.until > Date.now() ? entry.until : Date.now() + 900000,
      });
      invalid("Email or password is incorrect.", 401, "UNAUTHORIZED");
    }
    attempts.delete(key);
    audit(u, "session.login", u.id);
    res.json(login(res, u));
  });
  app.use("/api", (req, res, next) => {
    const cookie = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("meda_session="))
      ?.slice(13);
    const session =
      cookie &&
      db
        .prepare(
          "SELECT s.csrf,s.expires_at,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
        )
        .get(hash(cookie), Date.now());
    if (!session)
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Please sign in to continue.",
        },
      });
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers["x-csrf-token"] !== session.csrf
    )
      return res.status(403).json({
        error: {
          code: "CSRF_REJECTED",
          message: "Session verification failed. Refresh and try again.",
        },
      });
    req.user = session;
    req.sessionHash = hash(cookie);
    next();
  });
  app.get("/api/v1/auth/session", (req, res) =>
    res.json({
      user: safeUser(req.user),
      csrf: req.user.csrf,
      clinic: db
        .prepare("SELECT id,name FROM clinics WHERE id=?")
        .get(req.user.clinic_id),
    }),
  );
  app.post("/api/v1/auth/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(req.sessionHash);
    res.clearCookie("meda_session", {
      path: "/",
      sameSite: "strict",
      secure: production,
      httpOnly: true,
    });
    res.json({ ok: true });
  });
  app.get("/api/v1/workspace", (req, res) => {
    const patients = db
      .prepare(
        "SELECT * FROM patients WHERE clinic_id=? ORDER BY created_at,id",
      )
      .all(req.user.clinic_id)
      .map((p) => ({
        id: p.id,
        mrn: p.mrn,
        name: p.name,
        age: p.age,
        sex: p.sex,
        initials: p.name
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2),
        color: p.color,
        allergies: p.allergies,
        medications: p.medications,
        history: p.history,
        version: p.version,
      }));
    const encounters = db
      .prepare(
        "SELECT * FROM encounters WHERE clinic_id=? ORDER BY date DESC,rowid DESC",
      )
      .all(req.user.clinic_id)
      .map((e) => ({
        id: e.id,
        patientId: e.patient_id,
        reason: e.reason,
        date: e.date,
        status: e.status,
        note: e.note,
        version: e.version,
        procedures: db
          .prepare(
            "SELECT id,type,site,phase FROM procedures WHERE encounter_id=? AND clinic_id=?",
          )
          .all(e.id, req.user.clinic_id),
      }));
    const media = db
      .prepare(
        "SELECT * FROM media WHERE clinic_id=? ORDER BY created_at,rowid",
      )
      .all(req.user.clinic_id)
      .map(mediaView);
    res.json({ patients, encounters, media });
  });
  app.post("/api/v1/patients", (req, res) => {
    role(req, "admin", "physician", "assistant");
    const b = req.body,
      id = randomUUID(),
      name = text(b.name, "patient name", 100),
      mrn = text(b.mrn, "MRN", 40);
    if (!Number.isInteger(b.age) || b.age < 0 || b.age > 120)
      invalid("Age must be between 0 and 120.");
    if (!["Female", "Male", "Not specified"].includes(b.sex))
      invalid("Choose a valid sex.");
    if (
      db
        .prepare("SELECT id FROM patients WHERE clinic_id=? AND mrn=?")
        .get(req.user.clinic_id, mrn)
    )
      invalid("A patient with this MRN already exists.", 409, "DUPLICATE_MRN");
    db.prepare(
      "INSERT INTO patients (id,clinic_id,mrn,name,age,sex,color,created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).run(id, req.user.clinic_id, mrn, name, b.age, b.sex, "purple", now());
    audit(req.user, "patient.created", id);
    res.status(201).json({ id });
  });
  app.patch("/api/v1/patients/:id", (req, res) => {
    role(req, "admin", "physician", "assistant");
    const p = patient(req, req.params.id),
      b = req.body;
    if (b.version !== p.version)
      invalid("This chart changed. Refresh before saving.", 409, "CONFLICT");
    const values = ["allergies", "medications", "history"].map((k) =>
      typeof b[k] === "string" && b[k].length <= 5000 ? b[k] : p[k],
    );
    db.prepare(
      "UPDATE patients SET allergies=?,medications=?,history=?,version=version+1 WHERE id=? AND clinic_id=?",
    ).run(...values, p.id, req.user.clinic_id);
    audit(req.user, "patient.updated", p.id);
    res.json({ ok: true });
  });
  app.post("/api/v1/patients/:id/encounters", (req, res) => {
    role(req, "admin", "physician", "assistant");
    patient(req, req.params.id);
    const id = randomUUID(),
      reason = text(req.body.reason, "encounter reason", 200);
    db.prepare(
      "INSERT INTO encounters (id,clinic_id,patient_id,reason,date) VALUES (?,?,?,?,?)",
    ).run(id, req.user.clinic_id, req.params.id, reason, now());
    audit(req.user, "encounter.created", id);
    res.status(201).json({ id });
  });
  app.patch("/api/v1/encounters/:id", (req, res) => {
    role(req, "admin", "physician", "assistant");
    const e = encounter(req, req.params.id),
      b = req.body;
    if (e.version !== b.version)
      invalid(
        "This encounter changed. Refresh before saving.",
        409,
        "CONFLICT",
      );
    if (typeof b.note !== "string" || b.note.length > 20000)
      invalid("Use a note of up to 20,000 characters.");
    db.prepare(
      "UPDATE encounters SET note=?,version=version+1 WHERE id=? AND clinic_id=?",
    ).run(b.note, e.id, req.user.clinic_id);
    audit(req.user, "note.draft_updated", e.id);
    res.json({ ok: true });
  });
  app.post("/api/v1/encounters/:id/procedures", (req, res) => {
    role(req, "admin", "physician", "assistant");
    encounter(req, req.params.id);
    const id = randomUUID(),
      b = req.body;
    const type = text(b.type, "procedure type", 100),
      site = text(b.site, "anatomical site", 100);
    if (!["Pre", "Intra", "Post"].includes(b.phase))
      invalid("Choose Pre, Intra, or Post.");
    db.prepare("INSERT INTO procedures VALUES (?,?,?,?,?,?)").run(
      id,
      req.params.id,
      req.user.clinic_id,
      type,
      site,
      b.phase,
    );
    audit(req.user, "procedure.created", id);
    res.status(201).json({ id });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024,
      files: 1,
      fields: 16,
      fieldSize: 10000,
    },
  });
  app.post(
    "/api/v1/media/uploads",
    (req, res, next) => {
      try {
        role(req, "admin", "physician", "assistant");
        next();
      } catch (e) {
        next(e);
      }
    },
    upload.single("file"),
    (req, res) => {
      const b = req.body,
        file = req.file;
      if (!file?.size) invalid("Choose a nonempty media file.");
      const patientId = text(b.patient, "patient ID"),
        encounterId = text(b.encounterId, "encounter ID"),
        procedureId = b.procedureId || "";
      assigned(req, patientId, encounterId, procedureId);
      const actual = fileType(file.buffer),
        declared = file.mimetype.split(";")[0];
      const compatible =
        actual === declared ||
        (actual === "webm" &&
          ["video/webm", "audio/webm"].includes(declared)) ||
        (actual === "mp4" &&
          ["video/mp4", "video/quicktime", "audio/mp4"].includes(declared)) ||
        (actual === "audio/wav" && declared === "audio/x-wav");
      if (!actual || !compatible)
        invalid(
          "File content does not match a supported media format.",
          415,
          "UNSUPPORTED_FORMAT",
        );
      if (!/^[a-f0-9-]{36}$/i.test(b.id || "")) invalid("Invalid upload ID.");
      const existing = db.prepare("SELECT * FROM media WHERE id=?").get(b.id);
      const checksum = hash(file.buffer);
      if (existing) {
        if (
          existing.clinic_id !== req.user.clinic_id ||
          existing.patient_id !== patientId ||
          existing.encounter_id !== encounterId ||
          existing.sha256 !== checksum ||
          existing.procedure_id !== (procedureId || null)
        )
          invalid(
            "Upload ID conflicts with another assignment.",
            409,
            "CONFLICT",
          );
        return res.json(mediaView(existing));
      }
      const parentId = b.parentId || null;
      if (
        parentId &&
        !db
          .prepare(
            "SELECT id FROM media WHERE id=? AND clinic_id=? AND patient_id=? AND encounter_id=? AND state='committed'",
          )
          .get(parentId, req.user.clinic_id, patientId, encounterId)
      )
        invalid(
          "Original media not found in this encounter.",
          404,
          "NOT_FOUND",
        );
      if (!["Pre", "Intra", "Post"].includes(b.phase))
        invalid("Choose a valid media phase.");
      let manifest = null;
      if (b.manifest) {
        try {
          const m = JSON.parse(b.manifest);
          if (
            !parentId ||
            !Number.isInteger(m.rotation) ||
            m.rotation < 0 ||
            m.rotation >= 360 ||
            typeof m.crop !== "boolean" ||
            !Number.isInteger(m.annotations) ||
            m.annotations < 0 ||
            m.annotations > 1000
          )
            throw Error();
          manifest = JSON.stringify({
            rotation: m.rotation,
            crop: m.crop,
            annotations: m.annotations,
          });
        } catch {
          invalid("Invalid edit manifest.");
        }
      }
      const key = randomUUID() + ".bin";
      fs.writeFileSync(path.join(filesDir, key), file.buffer, {
        mode: 0o600,
        flag: "wx",
      });
      try {
        transaction(() => {
          db.prepare(
            "INSERT INTO media (id,clinic_id,patient_id,encounter_id,procedure_id,name,mime,bytes,sha256,file_key,site,phase,source,state,parent_id,manifest,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          ).run(
            b.id,
            req.user.clinic_id,
            patientId,
            encounterId,
            procedureId || null,
            text(b.displayName || file.originalname, "file name", 200),
            declared,
            file.size,
            checksum,
            key,
            text(b.site || "Not assigned", "site", 100),
            b.phase,
            text(b.source || "Upload", "capture source", 30),
            "pending_review",
            parentId,
            manifest,
            now(),
            req.user.id,
          );
          audit(req.user, "media.uploaded", b.id);
        });
      } catch (e) {
        fs.unlinkSync(path.join(filesDir, key));
        throw e;
      }
      res
        .status(201)
        .json(
          mediaView(
            db
              .prepare("SELECT * FROM media WHERE id=? AND clinic_id=?")
              .get(b.id, req.user.clinic_id),
          ),
        );
    },
  );
  app.post("/api/v1/media/review", (req, res) => {
    role(req, "admin", "physician", "assistant");
    const b = req.body;
    if (
      b.confirmed !== true ||
      !Array.isArray(b.ids) ||
      b.ids.length < 1 ||
      b.ids.length > 10 ||
      new Set(b.ids).size !== b.ids.length
    )
      invalid("Confirm the assignment of 1–10 unique media files.");
    assigned(req, b.patient, b.encounterId, b.procedureId || "");
    if (!["Pre", "Intra", "Post"].includes(b.phase))
      invalid("Choose a valid media phase.");
    const site = text(b.site, "anatomical site", 100);
    transaction(() => {
      for (const id of b.ids) {
        const m = db
          .prepare("SELECT * FROM media WHERE id=? AND clinic_id=?")
          .get(id, req.user.clinic_id);
        if (!m) invalid("Media not found.", 404, "NOT_FOUND");
        if (
          m.parent_id &&
          !db
            .prepare(
              "SELECT id FROM media WHERE id=? AND clinic_id=? AND patient_id=? AND encounter_id=?",
            )
            .get(m.parent_id, req.user.clinic_id, b.patient, b.encounterId)
        )
          invalid(
            "Edited versions must remain with the original patient and encounter.",
            409,
            "CONFLICT",
          );
        if (m.state === "committed") {
          if (
            m.patient_id !== b.patient ||
            m.encounter_id !== b.encounterId ||
            m.procedure_id !== (b.procedureId || null)
          )
            invalid("Committed media cannot be reassigned.", 409, "CONFLICT");
          continue;
        }
        db.prepare(
          "UPDATE media SET patient_id=?,encounter_id=?,procedure_id=?,site=?,phase=?,state='committed',committed_at=? WHERE id=? AND clinic_id=?",
        ).run(
          b.patient,
          b.encounterId,
          b.procedureId || null,
          site,
          b.phase,
          now(),
          id,
          req.user.clinic_id,
        );
        audit(req.user, "media.review_committed", id);
      }
    });
    res.json({ ok: true });
  });
  app.get("/api/v1/media/:id/content", (req, res) => {
    const m = db
      .prepare("SELECT * FROM media WHERE id=? AND clinic_id=?")
      .get(req.params.id, req.user.clinic_id);
    if (!m) invalid("Media not found.", 404, "NOT_FOUND");
    res.set({
      "Content-Type": m.mime,
      "Content-Disposition": `inline; filename="media.${m.mime.startsWith("image/") ? m.mime.split("/")[1] : "bin"}"`,
      "Content-Security-Policy": "default-src 'none'",
    });
    res.sendFile(path.resolve(filesDir, m.file_key), { cacheControl: false });
  });
  app.delete("/api/v1/media/:id", (req, res) => {
    role(req, "admin", "physician", "assistant");
    const m = db
      .prepare("SELECT * FROM media WHERE id=? AND clinic_id=?")
      .get(req.params.id, req.user.clinic_id);
    if (!m) invalid("Media not found.", 404, "NOT_FOUND");
    if (m.state !== "pending_review")
      invalid(
        "Committed originals cannot be deleted from this development app.",
        409,
        "CONFLICT",
      );
    db.prepare(
      "DELETE FROM media WHERE id=? AND clinic_id=? AND state='pending_review'",
    ).run(m.id, req.user.clinic_id);
    fs.unlinkSync(path.join(filesDir, m.file_key));
    audit(req.user, "media.pending_discarded", m.id);
    res.json({ ok: true });
  });
  app.get("/api/v1/team", (req, res) => {
    role(req, "admin");
    res.json({
      users: db
        .prepare("SELECT * FROM users WHERE clinic_id=? ORDER BY created_at")
        .all(req.user.clinic_id)
        .map(safeUser),
    });
  });
  app.post("/api/v1/team", (req, res) => {
    role(req, "admin");
    const b = req.body,
      u = {
        id: randomUUID(),
        clinic_id: req.user.clinic_id,
        email: email(b.email),
        name: text(b.name, "name", 100),
        role: b.role,
        password_hash: passwordHash(password(b.password)),
      };
    if (!["physician", "assistant", "auditor"].includes(u.role))
      invalid("Choose physician, assistant, or auditor.");
    if (db.prepare("SELECT id FROM users WHERE email=?").get(u.email))
      invalid(
        "This email cannot be added. Use a different address.",
        409,
        "ACCOUNT_EXISTS",
      );
    db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?)").run(
      u.id,
      u.clinic_id,
      u.email,
      u.name,
      u.role,
      u.password_hash,
      now(),
    );
    audit(req.user, "team.user_created", u.id);
    res.status(201).json({ user: safeUser(u) });
  });
  app.get("/api/v1/audit", (req, res) => {
    role(req, "admin", "auditor");
    res.json({
      events: db
        .prepare(
          "SELECT a.id,a.action,a.target_id AS targetId,a.event_time AS date,u.name AS actor FROM audit_events a JOIN users u ON a.actor_id=u.id WHERE a.clinic_id=? ORDER BY a.event_time DESC,a.rowid DESC LIMIT 100",
        )
        .all(req.user.clinic_id),
    });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "API endpoint not found." },
    }),
  );
  const dist = path.resolve("dist");
  app.use(
    express.static(dist, {
      setHeaders: (res) => res.set("Cache-Control", "no-store"),
    }),
  );
  app.get("/{*path}", (_req, res) => {
    if (fs.existsSync(path.join(dist, "index.html")))
      res.sendFile(path.join(dist, "index.html"));
    else
      res
        .status(503)
        .send("Build the frontend with npm run build, or run npm run dev.");
  });
  app.use((err, req, res, _next) => {
    if (res.headersSent) return;
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : err.status || 400;
    res.status(status).json({
      error: {
        code:
          err.code === "LIMIT_FILE_SIZE"
            ? "MEDIA_TOO_LARGE"
            : err.code || "REQUEST_FAILED",
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "Files must be smaller than 25 MB."
            : err.status
              ? err.message
              : "The request could not be completed. Please check your input and try again.",
      },
    });
  });
  return { app, db, close: () => db.close() };
}
function seed(db, clinicId) {
  const demo = [
    [
      "Emily Johnson",
      34,
      "Female",
      "purple",
      "Full body skin exam",
      "Left upper chest",
      "Draft",
    ],
    [
      "Michael Thompson",
      52,
      "Male",
      "teal",
      "Excision · Upper back",
      "Upper back",
      "Completed",
    ],
    [
      "Sarah Williams",
      28,
      "Female",
      "pink",
      "Post-op follow-up",
      "Left forearm",
      "Completed",
    ],
    [
      "David Chen",
      67,
      "Male",
      "amber",
      "Lesion monitoring",
      "Right shoulder",
      "Draft",
    ],
    [
      "Jessica Martinez",
      41,
      "Female",
      "blue",
      "Rash evaluation",
      "Right forearm",
      "Completed",
    ],
  ];
  demo.forEach(([name, age, sex, color, reason, site, status], i) => {
    const id = randomUUID(),
      enc = randomUUID();
    db.prepare(
      "INSERT INTO patients (id,clinic_id,mrn,name,age,sex,color,created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).run(
      id,
      clinicId,
      ["10284", "10367", "10421", "10458", "10502"][i],
      name,
      age,
      sex,
      color,
      now(),
    );
    db.prepare(
      "INSERT INTO encounters (id,clinic_id,patient_id,reason,date,status) VALUES (?,?,?,?,?,?)",
    ).run(enc, clinicId, id, reason, `2026-10-${22 - i}T16:00:00Z`, status);
    db.prepare("INSERT INTO procedures VALUES (?,?,?,?,?,?)").run(
      randomUUID(),
      enc,
      clinicId,
      i === 1 ? "Excision" : "Clinical photography",
      site,
      "Pre",
    );
  });
}
