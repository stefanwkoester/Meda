import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEncounter,
  validateAssignment,
  validateFile,
  seedEncounters,
} from "../src/domain/workspace.ts";
test("patient → encounter → procedure assignment cannot cross patient or encounter", () => {
  const e = seedEncounters();
  assert.equal(
    validateAssignment("10284", e[0].id, e[0].procedures[0].id, e),
    "",
  );
  assert.match(
    validateAssignment("10367", e[0].id, "", e),
    /belonging to this patient/,
  );
  assert.match(
    validateAssignment("10284", e[0].id, e[1].procedures[0].id, e),
    /belonging to this encounter/,
  );
});
test("new encounters preserve existing visits and validate required context", () => {
  const old = seedEncounters();
  const fresh = createEncounter("10284", "  Follow-up  ", "new-enc");
  assert.equal(fresh.reason, "Follow-up");
  assert.equal(fresh.patientId, "10284");
  assert.equal(fresh.status, "Draft");
  assert.equal(old[0].reason, "Full body skin exam");
  assert.throws(() => createEncounter("10284", " ", "x"));
  assert.throws(() => createEncounter("", "Visit", "x"));
});
test("uploads reject executable SVG, empty files and oversized files", () => {
  assert.match(
    validateFile({ type: "image/svg+xml", size: 100 }),
    /Unsupported/,
  );
  assert.match(validateFile({ type: "image/png", size: 0 }), /empty/);
  assert.match(
    validateFile({ type: "image/jpeg", size: 26 * 1024 * 1024 }),
    /25 MB/,
  );
  assert.equal(validateFile({ type: "video/webm;codecs=vp8", size: 200 }), "");
});
