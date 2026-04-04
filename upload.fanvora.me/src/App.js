import "./App.css";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** i;
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[i]}`;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function UploadPage() {
  const [uploads, setUploads] = useState([]);
  const inputRef = useRef(null);

  const startUpload = useCallback((files) => {
    const fileList = Array.from(files || []);
    if (fileList.length === 0) return;

    const newItems = fileList.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      size: file.size,
      status: "queued",
      percent: 0,
      speedBps: 0,
      error: null,
    }));

    setUploads((prev) => [...newItems, ...prev]);

    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      const file = fileList[i];
      if (!file) continue;

      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: "uploading" } : u)),
      );

      const formData = new FormData();
      formData.append("file", file, file.name);

      const xhr = new XMLHttpRequest();
      const startTs = Date.now();
      let lastTs = startTs;
      let lastLoaded = 0;

      xhr.open("POST", "/api/upload");
      xhr.responseType = "json";

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const now = Date.now();
        const dtMs = Math.max(1, now - lastTs);
        const dBytes = Math.max(0, e.loaded - lastLoaded);
        const speedBps = (dBytes * 1000) / dtMs;
        const percent = Math.round((e.loaded / e.total) * 100);
        lastTs = now;
        lastLoaded = e.loaded;

        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? {
                  ...u,
                  percent,
                  speedBps,
                }
              : u,
          ),
        );
      };

      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? { ...u, status: "error", error: "Şəbəkə xətası" }
              : u,
          ),
        );
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === item.id
                ? {
                    ...u,
                    status: "done",
                    percent: 100,
                    speedBps:
                      (file.size * 1000) / Math.max(1, Date.now() - startTs),
                  }
                : u,
            ),
          );
          return;
        }
        const message =
          (xhr.response && (xhr.response.error || xhr.response.message)) ||
          `Server xətası (${xhr.status})`;
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id ? { ...u, status: "error", error: message } : u,
          ),
        );
      };

      xhr.send(formData);
    }
  }, []);

  const onPickFiles = useCallback(
    (e) => {
      startUpload(e.target.files);
      e.target.value = "";
    },
    [startUpload],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.files?.length) startUpload(e.dataTransfer.files);
    },
    [startUpload],
  );

  return (
    <div className="container">
      <h1>Upload</h1>
      <div
        className="card"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => inputRef.current?.click()}
          >
            Fayl seç
          </button>
          <div className="muted">və ya faylları bura sürüşdür</div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
      </div>

      {uploads.length > 0 && (
        <div className="card">
          <div className="table">
            <div className="thead">
              <div>Fayl</div>
              <div>Ölçü</div>
              <div>Proses</div>
            </div>
            {uploads.map((u) => (
              <div key={u.id} className="trow">
                <div className="ellipsis" title={u.name}>
                  {u.name}
                </div>
                <div>{formatBytes(u.size)}</div>
                <div>
                  {u.status === "uploading" && (
                    <div className="progressWrap">
                      <div
                        className="progressBar"
                        style={{ width: `${u.percent}%` }}
                      />
                      <div className="progressText">
                        {u.percent}% · {formatBytes(u.speedBps)}/s
                      </div>
                    </div>
                  )}
                  {u.status === "queued" && (
                    <div className="muted">növbədə</div>
                  )}
                  {u.status === "done" && <div className="ok">yükləndi</div>}
                  {u.status === "error" && (
                    <div className="err">{u.error || "xəta"}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="row">
            <Link to="/download" className="link">
              Download səhifəsinə keç
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadPage() {
  const q = useQuery();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const highlight = q.get("file");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/files");
        if (!res.ok) throw new Error(`Server xətası (${res.status})`);
        const data = await res.json();
        if (!cancelled) setFiles(Array.isArray(data.files) ? data.files : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Xəta");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="container">
      <h1>Download</h1>
      <div className="card">
        {loading && <div className="muted">Yüklənir…</div>}
        {error && <div className="err">{error}</div>}
        {!loading && !error && files.length === 0 && (
          <div className="muted">./files qovluğunda fayl yoxdur.</div>
        )}
        {!loading && !error && files.length > 0 && (
          <div className="table">
            <div className="thead">
              <div>Fayl</div>
              <div>Ölçü</div>
              <div></div>
            </div>
            {files.map((f) => {
              const url = `/api/files/${encodeURIComponent(f.name)}`;
              const isHighlighted = highlight && highlight === f.name;
              return (
                <div
                  key={f.name}
                  className={`trow ${isHighlighted ? "highlight" : ""}`}
                >
                  <div className="ellipsis" title={f.name}>
                    {f.name}
                  </div>
                  <div>{formatBytes(f.size)}</div>
                  <div className="actions">
                    <a className="btn btnSecondary" href={url}>
                      Yüklə
                    </a>
                    <button
                      type="button"
                      className="btn btnSecondary"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          new URL(url, window.location.href).toString(),
                        );
                      }}
                    >
                      Linki kopyala
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="shell">
        <div className="topbar">
          <div className="brand">upload.fanvora.me</div>
          <nav className="nav">
            <Link className="navLink" to="/upload">
              Upload
            </Link>
            <Link className="navLink" to="/download">
              Download
            </Link>
          </nav>
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
