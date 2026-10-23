import { chromium as playwright, expect } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "meda-browser-"));
const port = 3201;
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ["server/index.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    MEDA_DATA_DIR: dir,
    APP_ORIGIN: base,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverErrors = "";
server.stderr.on("data", (d) => {
  serverErrors += d.toString();
});
const timeout = Date.now() + 15000;
while (true) {
  try {
    const r = await fetch(base + "/api/v1/health");
    if (r.ok) break;
  } catch {}
  if (Date.now() > timeout)
    throw Error("Test server failed to start: " + serverErrors);
  await new Promise((r) => setTimeout(r, 150));
}
const browser = await playwright.launch({
  executablePath: await chromium.executablePath(),
  args: [
    ...chromium.args.filter((a) => a !== "--disable-web-security"),
    "--use-fake-device-for-media-stream",
  ],
  headless: true,
});
let checks = 0;
const password = "test-only-" + randomBytes(16).toString("hex");
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByRole("heading", { name: "Set up your practice workspace" })
    .waitFor();
  await page.screenshot({ path: "artifacts/meda-sign-in.png", fullPage: true });
  await page.getByLabel("Your full name").fill("Dr. James Lee");
  await page.getByLabel("Practice name").fill("Westside Dermatology");
  await page.getByLabel("Email", { exact: true }).fill("provider@example.test");
  await page.getByLabel(/^Password/).fill(password);
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Welcome back, Dr. James Lee" })
    .waitFor();
  checks++;
  await page.screenshot({ path: "artifacts/meda-desktop.png", fullPage: true });
  await page
    .getByRole("button", { name: /Emily Johnson.*Full body skin exam/ })
    .click();
  await page
    .getByRole("heading", { name: "Emily Johnson", exact: true })
    .waitFor();
  checks++;
  await page.getByRole("button", { name: "Encounters", exact: true }).click();
  await page
    .getByRole("button", { name: "New encounter", exact: true })
    .click();
  await page.getByLabel("Reason for visit").fill("Biopsy follow-up");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Encounter", exact: true }),
  ).toContainText("Biopsy follow-up");
  checks++;
  await page
    .getByRole("button", { name: "Add procedure", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Procedure type", exact: true })
    .selectOption("Punch biopsy");
  await page
    .getByRole("combobox", { name: "Anatomical site", exact: true })
    .selectOption("Left forearm");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".procedure-row")).toContainText("Punch biopsy");
  checks++;
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page
    .getByRole("button", { name: "Insert dermatology template" })
    .click();
  await page
    .getByLabel("Encounter note")
    .fill("Fictional follow-up note for dermatology workflow test.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Draft matches saved record", { exact: false }),
  ).toBeVisible();
  checks++;
  await page.getByLabel("Encounter note").fill("Unsaved note");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Patients", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Unsaved work" }).waitFor();
  await page.getByRole("button", { name: "Keep working" }).click();
  await expect(page.getByLabel("Encounter note")).toHaveValue("Unsaved note");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  checks++;
  await page
    .getByRole("button", { name: "Capture media", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Encounter", exact: true })
    .selectOption({ label: "Biopsy follow-up" });
  await page
    .getByRole("combobox", { name: "Procedure (optional)", exact: true })
    .selectOption({ label: "Punch biopsy · Left forearm" });
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 160;
    const x = c.getContext("2d");
    x.fillStyle = "#ede3fb";
    x.fillRect(0, 0, 240, 160);
    x.fillStyle = "#8860be";
    x.fillRect(30, 30, 100, 70);
    x.font = "16px sans-serif";
    x.fillText("SYNTHETIC DEMO", 20, 135);
    return c.toDataURL("image/png").split(",")[1];
  });
  const bytes = Buffer.from(png, "base64");
  await page.locator("input[type=file]").setInputFiles({
    name: "demo-image.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await page.getByRole("heading", { name: "Review & assign" }).waitFor();
  await expect(
    page.getByRole("button", { name: "Add file to gallery" }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /I reviewed these demo files/ })
    .check();
  await page.screenshot({ path: "artifacts/meda-capture.png", fullPage: true });
  await page.getByRole("button", { name: "Add file to gallery" }).click();
  await page
    .getByRole("button", { name: "Open demo-image.png", exact: true })
    .waitFor();
  checks++;
  await page.reload();
  await page
    .getByRole("heading", { name: "Media library", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Open demo-image.png", exact: true })
    .waitFor();
  checks++;
  await page
    .getByRole("button", { name: "Open demo-image.png", exact: true })
    .click();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await page
    .getByRole("button", { name: "Crop 10% edges", exact: true })
    .click();
  await page
    .getByLabel("Image label", { exact: true })
    .fill("Follow-up · synthetic");
  await page.getByRole("button", { name: "Apply label", exact: true }).click();
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  const bounds = await page.locator("canvas").boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width * 0.3,
    bounds.y + bounds.height * 0.3,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.6,
    bounds.y + bounds.height * 0.5,
    { steps: 10 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Undo edit" }).click();
  await page.getByRole("button", { name: "Redo edit" }).click();
  await page.screenshot({ path: "artifacts/meda-editor.png", fullPage: true });
  await page
    .getByRole("button", { name: "Create edited version", exact: true })
    .click();
  await expect(page.locator(".media-card")).toHaveCount(2);
  checks++;
  const entries = await page.evaluate(async () => {
    const r = await fetch("/api/v1/workspace");
    return (await r.json()).media;
  });
  assert.equal(entries.length, 2);
  const original = entries.find((m) => !m.parentId),
    derived = entries.find((m) => m.parentId);
  assert.equal(derived.parentId, original.id);
  const originalBytes = await page.evaluate(
    async (url) =>
      Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),
    original.url,
  );
  assert.deepEqual(Buffer.from(originalBytes), bytes);
  const editedBytes = await page.evaluate(
    async (url) =>
      Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),
    derived.url,
  );
  assert.notDeepEqual(Buffer.from(editedBytes), bytes);
  checks++;
  await page
    .getByRole("checkbox", { name: "Compare demo-image.png", exact: true })
    .check();
  await page
    .getByRole("checkbox", {
      name: "Compare Edited · demo-image.png",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Compare images", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Image comparison" }).waitFor();
  await expect(page.locator(".comparison-grid img")).toHaveCount(2);
  await page.getByRole("button", { name: "Close dialog" }).click();
  checks++;
  await page
    .getByRole("combobox", { name: "Patient", exact: true })
    .selectOption({ label: "Michael Thompson" });
  await expect(page.locator(".media-card")).toHaveCount(0);
  checks++;
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Patients", exact: true })
    .click();
  await page.getByPlaceholder("Search name or MRN").fill("10421");
  await expect(page.locator(".patient-row")).toHaveCount(1);
  await page.getByPlaceholder("Search name or MRN").fill("no match");
  await expect(page.locator(".patient-row")).toHaveCount(0);
  checks++;
  await page.getByRole("button", { name: "New patient", exact: true }).click();
  await page
    .getByLabel("Patient name", { exact: true })
    .fill("Fictional Review");
  await page.getByLabel("MRN", { exact: true }).fill("DEMO-NEW-1");
  await page.getByLabel("Age", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("heading", { name: "Fictional Review", exact: true })
    .waitFor();
  await page.reload();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Patients", exact: true })
    .click();
  await page.getByPlaceholder("Search name or MRN").fill("DEMO-NEW-1");
  await expect(page.locator(".patient-row")).toHaveCount(1);
  checks++;
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Capture", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Active patient", exact: true })
    .selectOption({ label: "Emily Johnson · MRN 10284" });
  await page.getByRole("button", { name: "Phone", exact: true }).click();
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("permission denied");
  checks++;
  await page
    .context()
    .grantPermissions(["camera", "microphone"], { origin: base });
  // Synthetic live tracks exercise the real canvas snapshot and MediaRecorder paths.
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = new MediaStream();
      if (constraints.video) {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const context = canvas.getContext("2d");
        let frame = 0;
        const draw = () => {
          context.fillStyle = "#e6d7fa";
          context.fillRect(0, 0, 320, 240);
          context.fillStyle = "#7953bd";
          context.font = "20px sans-serif";
          context.fillText("SYNTHETIC CAMERA " + frame++, 20, 120);
        };
        draw();
        const timer = setInterval(draw, 100);
        const track = canvas.captureStream(10).getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => {
          clearInterval(timer);
          stop();
        };
        stream.addTrack(track);
      }
      if (constraints.audio) {
        const context = new AudioContext();
        await context.resume();
        const oscillator = context.createOscillator();
        const destination = context.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        const track = destination.stream.getAudioTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => {
          oscillator.stop();
          void context.close();
          stop();
        };
        stream.addTrack(track);
      }
      return stream;
    };
  });
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator(".camera-stage video").evaluate((v) => v.videoWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect(page.locator(".staged-item")).toHaveCount(1);
  await page
    .getByRole("checkbox", { name: /I reviewed these demo files/ })
    .check();
  await page
    .getByRole("button", { name: "Add file to gallery", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Media library", exact: true })
    .waitFor();
  checks++;
  for (const mode of ["Video", "Audio"]) {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Capture", exact: true })
      .click();
    await page.getByRole("button", { name: "Phone", exact: true }).click();
    await page.getByRole("button", { name: mode, exact: true }).click();
    await page
      .getByRole("button", {
        name: mode === "Audio" ? "Enable microphone" : "Enable camera",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Record " + mode.toLowerCase(),
        exact: true,
      })
      .click();
    await page.waitForTimeout(1200);
    await page
      .getByRole("button", { name: "Stop recording", exact: true })
      .click();
    await expect(page.locator(".staged-item")).toHaveCount(1);
    await page
      .getByRole("checkbox", { name: /I reviewed these demo files/ })
      .check();
    await page
      .getByRole("button", { name: "Add file to gallery", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Media library", exact: true })
      .waitFor();
    checks++;
  }
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await page
      .getByRole("heading", { name: "Welcome back, Dr. James Lee" })
      .waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `dashboard overflow at ${width}`,
    );
    if (width === 390)
      await page.screenshot({
        path: "artifacts/meda-mobile.png",
        fullPage: true,
      });
    checks++;
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Patients", exact: true })
    .click();
  await page.getByPlaceholder("Search name or MRN").fill("Emily");
  await page.locator(".patient-row").click();
  await page.getByRole("button", { name: "Capture media" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "mobile-demo.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await page
    .getByRole("checkbox", { name: /I reviewed these demo files/ })
    .check();
  await page.getByRole("button", { name: "Add file to gallery" }).click();
  await page
    .getByRole("button", { name: "Open mobile-demo.png", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  checks++;
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Device", exact: true })
    .click();
  await page
    .getByText("The hardware adapter has not been connected.")
    .waitFor();
  checks++;
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Welcome back", exact: true })
    .waitFor();
  await page.getByLabel("Email", { exact: true }).fill("provider@example.test");
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("heading", { name: "Workspace settings", exact: true })
    .waitFor();
  checks++;
  assert.deepEqual(errors, []);
  console.log(
    `PASS: ${checks} browser checks. Real accounts, patient/encounter/procedure workflow, durable notes and media, original/derived byte comparison, image editor, side-by-side comparison, patient isolation, camera denial and successful photo/video/audio recording with mocked synthetic live tracks, mobile capture, sign-out/sign-in, five viewport widths. No page errors.`,
  );
} catch (error) {
  const page = browser.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({
      path: "artifacts/test-failure.png",
      fullPage: true,
    });
    console.error((await page.locator("body").innerText()).slice(0, 3500));
  }
  throw error;
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
  fs.rmSync(dir, { recursive: true, force: true });
}
