import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createApp } from "../server/app.mjs";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
test("authenticated persistent dermatology workflow and access boundaries", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "meda-api-"));
  let service = createApp({ dataDir: dir });
  let server = service.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  let base = `http://127.0.0.1:${server.address().port}/api/v1`;
  let cookie = "",
    csrf = "";
  async function request(
    route,
    {
      method = "GET",
      body,
      auth = true,
      origin = "http://localhost:5173",
      csrfToken = csrf,
    } = {},
  ) {
    const r = await fetch(base + route, {
      method,
      headers: {
        Origin: origin,
        ...(auth ? { Cookie: cookie, "X-CSRF-Token": csrfToken } : {}),
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    return { r, data };
  }
  async function signIn(email, password) {
    const { r, data } = await request("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    assert.equal(r.status, 200);
    cookie = r.headers.get("set-cookie").split(";")[0];
    csrf = data.csrf;
    return data;
  }
  try {
    await t.test(
      "first-run setup creates a real account and requires authentication",
      async () => {
        const status = await request("/auth/status");
        assert.equal(status.data.needsSetup, true);
        assert.equal(
          (await request("/workspace", { auth: false })).r.status,
          401,
        );
        const { r, data } = await request("/auth/setup", {
          method: "POST",
          auth: false,
          body: {
            email: "provider@example.test",
            password: "test-provider-password-23",
            name: "Dr. Demo Provider",
            clinic: "Demo Dermatology",
          },
        });
        assert.equal(r.status, 201);
        assert.equal(data.user.role, "admin");
        assert.match(r.headers.get("set-cookie"), /HttpOnly/);
        assert.match(r.headers.get("set-cookie"), /SameSite=Strict/);
        cookie = r.headers.get("set-cookie").split(";")[0];
        csrf = data.csrf;
        assert.equal(
          (await request("/auth/setup", { method: "POST", body: {} })).r.status,
          409,
        );
      },
    );
    let state = (await request("/workspace")).data;
    const patient = state.patients[0],
      other = state.patients[1];
    let encounterId, procedureId, mediaId;
    await t.test("CSRF and unexpected origins are rejected", async () => {
      assert.equal(
        (
          await request("/patients", {
            method: "POST",
            body: {},
            csrfToken: "",
          })
        ).r.status,
        403,
      );
      assert.equal(
        (
          await request("/patients", {
            method: "POST",
            body: {},
            origin: "https://untrusted.invalid",
          })
        ).r.status,
        403,
      );
      assert.equal(
        (
          await request("/auth/login", {
            method: "POST",
            auth: false,
            origin: "null",
            body: {},
          })
        ).r.status,
        403,
      );
    });
    await t.test(
      "patients have unique MRNs and multiple encounters are retained",
      async () => {
        assert.equal(
          (
            await request("/patients", {
              method: "POST",
              body: {
                name: "Fictional New Person",
                mrn: patient.mrn,
                age: 31,
                sex: "Female",
              },
            })
          ).r.status,
          409,
        );
        const r = await request(`/patients/${patient.id}/encounters`, {
          method: "POST",
          body: { reason: "Punch biopsy consultation" },
        });
        assert.equal(r.r.status, 201);
        encounterId = r.data.id;
        state = (await request("/workspace")).data;
        assert.equal(
          state.encounters.filter((e) => e.patientId === patient.id).length,
          2,
        );
      },
    );
    await t.test(
      "procedures and notes belong to the encounter; stale writes conflict",
      async () => {
        const p = await request(`/encounters/${encounterId}/procedures`, {
          method: "POST",
          body: { type: "Punch biopsy", site: "Left forearm", phase: "Pre" },
        });
        assert.equal(p.r.status, 201);
        procedureId = p.data.id;
        assert.equal(
          (
            await request(`/encounters/${encounterId}`, {
              method: "PATCH",
              body: { note: "Fictional draft note", version: 1 },
            })
          ).r.status,
          200,
        );
        assert.equal(
          (
            await request(`/encounters/${encounterId}`, {
              method: "PATCH",
              body: { note: "Stale edit", version: 1 },
            })
          ).r.status,
          409,
        );
      },
    );
    async function upload({
      id = randomUUID(),
      patientId = patient.id,
      encId = encounterId,
      procId = procedureId,
      data = png,
      mime = "image/png",
    } = {}) {
      const b = new FormData();
      b.append("file", new Blob([data], { type: mime }), "demo.png");
      for (const [k, v] of Object.entries({
        id,
        patient: patientId,
        encounterId: encId,
        procedureId: procId,
        phase: "Pre",
        site: "Left forearm",
        source: "Upload",
      }))
        b.append(k, v);
      return request("/media/uploads", { method: "POST", body: b });
    }
    await t.test(
      "upload checks file content and patient/encounter ownership",
      async () => {
        assert.equal(
          (await upload({ data: Buffer.from("<html>fake image</html>") })).r
            .status,
          415,
        );
        assert.equal((await upload({ patientId: other.id })).r.status, 409);
        const r = await upload();
        assert.equal(r.r.status, 201);
        assert.equal(r.data.state, "pending_review");
        mediaId = r.data.id;
        assert.equal((await upload({ id: mediaId })).r.status, 200);
        assert.equal(
          (
            await upload({
              id: mediaId,
              patientId: other.id,
              encId: state.encounters.find((e) => e.patientId === other.id).id,
              procId: "",
            })
          ).r.status,
          409,
        );
      },
    );
    await t.test(
      "review requires confirmation, commits atomically, and blocks post-commit reassignment",
      async () => {
        const body = {
          ids: [mediaId],
          patient: patient.id,
          encounterId,
          procedureId,
          site: "Left forearm",
          phase: "Pre",
        };
        assert.equal(
          (await request("/media/review", { method: "POST", body })).r.status,
          400,
        );
        assert.equal(
          (
            await request("/media/review", {
              method: "POST",
              body: { ...body, confirmed: true },
            })
          ).r.status,
          200,
        );
        assert.equal(
          (
            await request("/media/review", {
              method: "POST",
              body: {
                ...body,
                confirmed: true,
                patient: other.id,
                encounterId: state.encounters.find(
                  (e) => e.patientId === other.id,
                ).id,
                procedureId: "",
              },
            })
          ).r.status,
          409,
        );
        assert.equal(
          (await request(`/media/${mediaId}`, { method: "DELETE" })).r.status,
          409,
        );
      },
    );
    await t.test(
      "media bytes are private, immutable, and never cached",
      async () => {
        const r = await fetch(base + `/media/${mediaId}/content`, {
          headers: { Cookie: cookie },
        });
        assert.equal(r.status, 200);
        assert.equal(r.headers.get("cache-control"), "no-store");
        assert.deepEqual(Buffer.from(await r.arrayBuffer()), png);
        assert.equal(
          (await fetch(base + `/media/${mediaId}/content`)).status,
          401,
        );
      },
    );
    await t.test("cross-clinic reads and writes are denied", async () => {
      const clinicId = randomUUID(),
        patientId = randomUUID(),
        otherEncounter = randomUUID();
      service.db
        .prepare("INSERT INTO clinics VALUES (?,?,?)")
        .run(clinicId, "Other clinic", new Date().toISOString());
      service.db
        .prepare(
          "INSERT INTO patients (id,clinic_id,mrn,name,age,sex,color,created_at) VALUES (?,?,?,?,?,?,?,?)",
        )
        .run(
          patientId,
          clinicId,
          "OTHER-1",
          "Other Fictional Person",
          30,
          "Female",
          "purple",
          new Date().toISOString(),
        );
      service.db
        .prepare(
          "INSERT INTO encounters (id,clinic_id,patient_id,reason,date) VALUES (?,?,?,?,?)",
        )
        .run(
          otherEncounter,
          clinicId,
          patientId,
          "Other clinic visit",
          new Date().toISOString(),
        );
      assert.equal(
        (
          await request(`/patients/${patientId}/encounters`, {
            method: "POST",
            body: { reason: "Unauthorized" },
          })
        ).r.status,
        404,
      );
      assert.equal(
        (
          await request(`/encounters/${otherEncounter}`, {
            method: "PATCH",
            body: { note: "Bad", version: 1 },
          })
        ).r.status,
        404,
      );
      assert.equal(
        (await request("/workspace")).data.patients.some(
          (p) => p.id === patientId,
        ),
        false,
      );
    });
    await t.test(
      "read-only accounts cannot write or manage users",
      async () => {
        assert.equal(
          (
            await request("/team", {
              method: "POST",
              body: {
                name: "Demo Auditor",
                email: "auditor@example.test",
                password: "test-auditor-password-23",
                role: "auditor",
              },
            })
          ).r.status,
          201,
        );
        await signIn("auditor@example.test", "test-auditor-password-23");
        assert.equal((await request("/workspace")).r.status, 200);
        assert.equal(
          (
            await request("/patients", {
              method: "POST",
              body: { name: "No", mrn: "NO", age: 30, sex: "Male" },
            })
          ).r.status,
          403,
        );
        assert.equal((await request("/team")).r.status, 403);
        assert.equal((await upload()).r.status, 403);
        await signIn("provider@example.test", "test-provider-password-23");
      },
    );
    await t.test(
      "records and sessions survive an actual server/database restart",
      async () => {
        await new Promise((resolve) => server.close(resolve));
        service.close();
        service = createApp({ dataDir: dir });
        server = service.app.listen(0, "127.0.0.1");
        await once(server, "listening");
        base = `http://127.0.0.1:${server.address().port}/api/v1`;
        const r = await request("/workspace");
        assert.equal(r.r.status, 200);
        assert.equal(
          r.data.encounters.find((e) => e.id === encounterId).note,
          "Fictional draft note",
        );
        assert.equal(
          r.data.media.find((m) => m.id === mediaId).state,
          "committed",
        );
        const content = await fetch(base + `/media/${mediaId}/content`, {
          headers: { Cookie: cookie },
        });
        assert.deepEqual(Buffer.from(await content.arrayBuffer()), png);
      },
    );
    await t.test("logout revokes the server session", async () => {
      assert.equal(
        (await request("/auth/logout", { method: "POST" })).r.status,
        200,
      );
      assert.equal((await request("/workspace")).r.status, 401);
      assert.equal(
        (
          await request("/auth/login", {
            method: "POST",
            auth: false,
            body: { email: "provider@example.test", password: "incorrect" },
          })
        ).r.status,
        401,
      );
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    service.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("hosted first-run setup is protected by a private bootstrap key", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "meda-bootstrap-"));
  const key = randomUUID() + randomUUID();
  const service = createApp({
    dataDir: dir,
    production: true,
    appOrigin: "https://demo.example.test",
    setupKey: key,
  });
  const server = service.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/api/v1`;
  try {
    const status = await fetch(url + "/auth/status");
    assert.equal((await status.json()).setupKeyRequired, true);
    const body = {
      name: "Demo Owner",
      clinic: "Demo Practice",
      email: "owner@example.test",
      password: "test-hosted-password-23",
    };
    const options = (b) => ({
      method: "POST",
      headers: {
        Origin: "https://demo.example.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(b),
    });
    assert.equal((await fetch(url + "/auth/setup", options(body))).status, 403);
    const result = await fetch(
      url + "/auth/setup",
      options({ ...body, setupKey: key }),
    );
    assert.equal(result.status, 201);
    assert.match(result.headers.get("set-cookie"), /Secure/);
    assert.match(
      result.headers.get("content-security-policy"),
      /script-src 'self'/,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    service.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
