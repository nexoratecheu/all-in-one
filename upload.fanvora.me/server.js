const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");

const Busboy = require("busboy");
const express = require("express");
const helmet = require("helmet");

const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const filesDir = path.join(__dirname, "files");

async function ensureFilesDir() {
  await fsp.mkdir(filesDir, { recursive: true });
}

function safeFileName(inputName) {
  const raw = typeof inputName === "string" ? inputName : "file";
  const base = path.basename(raw).replace(/\0/g, "");
  const withoutSlashes = base.replace(/[\\/]/g, "_").replace(/"/g, "").trim();
  const limited = withoutSlashes.slice(0, 240);
  return limited || "file";
}

async function createWriteStreamUnique(targetDir, wantedName) {
  const baseName = safeFileName(wantedName);
  const ext = path.extname(baseName);
  const stem = ext ? baseName.slice(0, -ext.length) : baseName;

  for (let i = 0; i < 10000; i++) {
    const name = i === 0 ? `${stem}${ext}` : `${stem} (${i})${ext}`;
    const fullPath = path.join(targetDir, name);
    try {
      const stream = fs.createWriteStream(fullPath, { flags: "wx" });
      return { name, fullPath, stream };
    } catch (e) {
      if (e && e.code === "EEXIST") continue;
      throw e;
    }
  }
  throw new Error("Fayl adı üçün boş variant tapılmadı");
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/files", async (req, res) => {
  try {
    await ensureFilesDir();
    const entries = await fsp.readdir(filesDir, { withFileTypes: true });
    const files = [];
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const name = ent.name;
      const fullPath = path.join(filesDir, name);
      const st = await fsp.stat(fullPath);
      files.push({
        name,
        size: st.size,
        mtimeMs: st.mtimeMs,
      });
    }
    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Xəta" });
  }
});

app.get("/api/files/:name", async (req, res) => {
  try {
    await ensureFilesDir();
    const name = safeFileName(req.params.name);
    const fullPath = path.join(filesDir, name);

    const st = await fsp.stat(fullPath);
    if (!st.isFile()) return res.status(404).end();

    const total = st.size;
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Accept-Ranges", "bytes");

    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!m) return res.status(416).end();
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : total - 1;
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start > end ||
        start >= total
      ) {
        return res.status(416).end();
      }

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      res.setHeader("Content-Length", String(end - start + 1));
      fs.createReadStream(fullPath, {
        start,
        end,
        highWaterMark: 4 * 1024 * 1024,
      }).pipe(res);
      return;
    }

    res.setHeader("Content-Length", String(total));
    fs.createReadStream(fullPath, { highWaterMark: 4 * 1024 * 1024 }).pipe(res);
  } catch (e) {
    if (e && e.code === "ENOENT") return res.status(404).end();
    res.status(500).json({ error: e?.message || "Xəta" });
  }
});

app.post("/api/upload", async (req, res) => {
  await ensureFilesDir();

  const uploaded = [];
  const inFlight = new Set();
  const createdPaths = new Set();

  function cleanupPartial() {
    for (const p of createdPaths) {
      fsp.unlink(p).catch(() => {});
    }
  }

  req.on("aborted", () => cleanupPartial());

  let done = false;
  function finishOnce(status, payload) {
    if (done) return;
    done = true;
    res.status(status).json(payload);
  }

  try {
    const bb = Busboy({
      headers: req.headers,
      highWaterMark: 2 * 1024 * 1024,
    });

    bb.on("file", async (fieldname, file, info) => {
      const promise = (async () => {
        const wantedName = info?.filename || "file";
        const { name, fullPath, stream } = await createWriteStreamUnique(
          filesDir,
          wantedName,
        );
        createdPaths.add(fullPath);

        let size = 0;
        file.on("data", (chunk) => {
          size += chunk.length;
        });

        await new Promise((resolve, reject) => {
          const onError = (err) => reject(err);
          file.on("error", onError);
          stream.on("error", onError);
          stream.on("close", resolve);
          file.pipe(stream);
        });

        uploaded.push({ name, size });
        createdPaths.delete(fullPath);
      })().catch((e) => {
        cleanupPartial();
        throw e;
      });

      inFlight.add(promise);
      promise.finally(() => inFlight.delete(promise));
    });

    bb.on("error", (e) => {
      cleanupPartial();
      finishOnce(400, { error: e?.message || "Upload xətası" });
    });

    bb.on("finish", async () => {
      try {
        await Promise.allSettled(Array.from(inFlight));
        if (done) return;
        finishOnce(200, { ok: true, files: uploaded });
      } catch (e) {
        if (done) return;
        cleanupPartial();
        finishOnce(500, { error: e?.message || "Upload xətası" });
      }
    });

    req.pipe(bb);
  } catch (e) {
    cleanupPartial();
    finishOnce(500, { error: e?.message || "Upload xətası" });
  }
});

const buildDir = path.join(__dirname, "build");
const indexHtml = path.join(buildDir, "index.html");

app.get("/", (req, res) => {
  res.redirect(302, "/upload");
});

if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get(["/upload", "/download"], (req, res) => {
    res.sendFile(indexHtml);
  });
  app.get("*", (req, res) => {
    res.status(404).send("Not Found");
  });
} else {
  app.get("*", (req, res) => {
    res.status(200).send("Backend işləyir. Frontend üçün: npm run build");
  });
}

const port = Number(process.env.PORT || 3000);
const server = http.createServer(app);
server.requestTimeout = 0;
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`Listening on http://0.0.0.0:${port}\n`);
});
