import express from "express";
import fs from "fs-extra";
import path from "path";
import os from "os";
import crypto from "crypto";
import { execFile } from "child_process";
import archiver from "archiver";

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const TEMPLATE = path.join(ROOT, "android-template");

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(ROOT, "public")));

function safeName(name) {
  return (name || "My App")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40) || "My App";
}

function javaEscape(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function replaceText(file, replacements) {
  let s = fs.readFileSync(file, "utf8");
  for (const [a,b] of replacements) s = s.split(a).join(b);
  fs.writeFileSync(file, s);
}

function run(cmd, args, cwd, timeout=180000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {cwd, timeout, maxBuffer: 10*1024*1024}, (err, stdout, stderr) => {
      if (err) {
        reject(new Error((stderr || stdout || err.message).slice(-12000)));
      } else resolve(stdout);
    });
  });
}

app.post("/api/build", async (req, res) => {
  const html = req.body?.html;
  const appName = safeName(req.body?.appName);
  if (!html || typeof html !== "string") {
    return res.status(400).json({error:"HTML code is required."});
  }

  const id = crypto.randomBytes(8).toString("hex");
  const work = path.join(os.tmpdir(), `apk-${id}`);
  try {
    await fs.copy(TEMPLATE, work);
    const assetDir = path.join(work, "app/src/main/assets");
    await fs.ensureDir(assetDir);
    await fs.writeFile(path.join(assetDir, "index.html"), html, "utf8");

    const manifest = path.join(work, "app/src/main/AndroidManifest.xml");
    replaceText(manifest, [["__APP_NAME__", javaEscape(appName)]]);

    // Build using the Gradle executable supplied by the Docker image/host.
    await run(process.env.GRADLE_BIN || "gradle", ["--no-daemon", "assembleDebug"], work, 240000);

    const apk = path.join(work, "app/build/outputs/apk/debug/app-debug.apk");
    if (!await fs.pathExists(apk)) throw new Error("APK was not produced.");

    res.download(apk, `${appName.replace(/[^a-zA-Z0-9_-]/g,"_")}.apk`, async () => {
      await fs.remove(work).catch(()=>{});
    });
  } catch (e) {
    await fs.remove(work).catch(()=>{});
    res.status(500).json({
      error: "APK build failed",
      details: String(e.message || e)
    });
  }
});

app.get("/health", (_,res)=>res.json({ok:true}));

app.listen(PORT, ()=>console.log(`APK Builder running on port ${PORT}`));
