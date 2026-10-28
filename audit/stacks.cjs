// Stack look: one tower per shot on one clip, one row (or a grid of `cols`).
//   PLAYWRIGHT_FROM=<folder with @playwright/test> node audit/stacks.cjs <out-dir> <clip.y4m> <x,y,w,h> <cols> <stack> …
// A stack is piece indices (or piece:look) joined by dots, bottom first: 0.1:2.2
// (- = just the cushion).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require(
  require.resolve("@playwright/test", {
    paths: [process.env.PLAYWRIGHT_FROM || __dirname],
  }),
);
const [out, clip, box, cols, ...stacks] = process.argv.slice(2);
const [x, y, width, height] = box.split(",").map(Number);
const BASE = `http://localhost:${process.env.PORT || 5194}`;
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    args: [
      "--use-angle=metal",
      "--enable-gpu",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${clip}`,
    ],
  });
  const page = await (
    await browser.newContext({
      viewport: { width: 540, height: 960 },
      deviceScaleFactor: Number(process.env.DPR || 1),
      permissions: ["camera"],
    })
  ).newPage();
  await page.goto(`${BASE}/?input=webcam${process.env.Q || ""}`);
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.experience === "ready" && window.__tower,
    null,
    { timeout: 120000 },
  );
  const files = [];
  for (const [k, s] of stacks.entries()) {
    await page.evaluate(
      (list) => window.__tower.actions.build(list),
      s === "-" ? [] : s.split("."),
    );
    await page.waitForTimeout(k === 0 ? 5000 : 1800);
    const f = path.join(out, `${k}.png`);
    await page.screenshot({ path: f, clip: { x, y, width, height } });
    files.push(f);
  }
  await browser.close();
  const n = files.length;
  const c = Math.min(Number(cols), n);
  const rows = Math.ceil(n / c);
  const layout = files
    .map((_, k) => `${(k % c) * width}_${Math.floor(k / c) * height}`)
    .join("|");
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    ...files.flatMap((f) => ["-i", f]),
    "-filter_complex",
    n === 1
      ? "null"
      : `${files.map((_, k) => `[${k}]`).join("")}xstack=inputs=${n}:layout=${layout}:fill=black`,
    path.join(out, "sheet.png"),
  ]);
  console.log("sheet", path.join(out, "sheet.png"), `${c}x${rows}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
