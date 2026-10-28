// A round on a clip: starts one, logs drops / catches / misses / falls with
// their times and the tower's lean, screenshots every `every` ms.
//   PLAYWRIGHT_FROM=<folder with @playwright/test> node audit/play.cjs <out-dir> <clip.y4m> <seconds> [every-ms] [query] [skip-seconds]
// skip-seconds: start the screenshots that long into the round.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require(
  require.resolve("@playwright/test", {
    paths: [process.env.PLAYWRIGHT_FROM || __dirname],
  }),
);
const [out, clip, seconds, every = "1500", query = "", skip = "0"] =
  process.argv.slice(2);
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
      permissions: ["camera"],
    })
  ).newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/__harness|XNNPACK/.test(m.text()))
      errors.push(m.text().slice(0, 200));
  });
  await page.goto(`${BASE}/?input=webcam${query}`);
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.experience === "ready" && window.__tower,
    null,
    { timeout: 120000 },
  );
  await page.waitForTimeout(3000);
  await page.mouse.click(270, 480);
  await page.waitForTimeout(Number(skip) * 1000);
  const files = [];
  const t0 = Date.now();
  let k = 0;
  while (Date.now() - t0 < Number(seconds) * 1000) {
    const f = path.join(out, `${k}.png`);
    await page.screenshot({ path: f });
    files.push(f);
    k += 1;
    await page.waitForTimeout(Number(every));
  }
  const info = await page.evaluate(() => ({
    events: window.__tower.events,
    state: window.__tower.get(),
  }));
  console.log(info.events.join("\n"));
  console.log(
    "state",
    JSON.stringify({
      phase: info.state.phase,
      score: info.state.score,
      best: info.state.best,
      stack: info.state.stack,
    }),
  );
  if (errors.length) console.log("errors", JSON.stringify(errors.slice(0, 5)));
  await browser.close();
  const W = 216;
  const H = 384;
  const cols = Math.min(8, files.length);
  const layout = files
    .map((_, i) => `${(i % cols) * W}_${Math.floor(i / cols) * H}`)
    .join("|");
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    ...files.flatMap((f) => ["-i", f]),
    "-filter_complex",
    `${files.map((_, i) => `[${i}]scale=${W}:${H}[v${i}]`).join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=black`,
    path.join(out, "sheet.png"),
  ]);
  console.log("sheet", path.join(out, "sheet.png"));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
