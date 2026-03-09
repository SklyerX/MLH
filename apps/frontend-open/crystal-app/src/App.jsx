import { useState, useRef, useCallback } from "react";

const ZONE_OPTIONS = [
  { id: "whole_face", label: "Whole Face" },
  { id: "forehead",   label: "Forehead" },
  { id: "nose",       label: "Nose" },
  { id: "t_zone",     label: "T-Zone" },
  { id: "cheeks",     label: "Cheeks" },
  { id: "chin",       label: "Chin" },
  { id: "undereyes",  label: "Undereye" },
  { id: "lips",       label: "Lips" },
];

const SEVERITY_CONFIG = {
  severe:   { color: "#ef4444", bg: "#fef2f2", dot: "#ef4444" },
  moderate: { color: "#f97316", bg: "#fff7ed", dot: "#f97316" },
  mild:     { color: "#ca8a04", bg: "#fefce8", dot: "#eab308" },
  clear:    { color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
  unknown:  { color: "#94a3b8", bg: "#f8fafc", dot: "#94a3b8" },
};

function ChevronDown({ size = 16, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function SparkleIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function groupFindings(findings) {
  const map = {};
  for (const f of findings) {
    const key = f.issue?.split("(")[0]?.trim() || f.finding?.split("(")[0]?.trim() || "Unknown";
    if (!map[key]) map[key] = { name: key, zones: [] };
    const zone = f.zone || "unknown";
    const sev = f.severity || "unknown";
    map[key].zones.push({ zone, severity: sev });
    const order = { severe: 4, moderate: 3, mild: 2, clear: 1, unknown: 0 };
    if (!map[key].severity || (order[sev] > order[map[key].severity])) {
      map[key].severity = sev;
    }
  }
  return Object.values(map);
}

function AccordionFinding({ finding, index }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_CONFIG[finding.severity?.toLowerCase()] || SEVERITY_CONFIG.unknown;

  return (
    <div style={{
      border: `1px solid ${open ? sev.color + "33" : "#efefef"}`,
      borderRadius: 12, overflow: "hidden",
      transition: "border-color 0.2s",
      animation: "fadeUp 0.4s ease both",
      animationDelay: `${index * 60}ms`,
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: open ? sev.bg : "white",
        border: "none", padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", textAlign: "left", transition: "background 0.2s",
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: sev.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111", flex: 1, textTransform: "capitalize" }}>
          {finding.name}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: sev.color,
          background: sev.bg, padding: "3px 10px", borderRadius: 100,
          border: `1px solid ${sev.color}33`, textTransform: "capitalize", marginRight: 8,
        }}>
          {finding.severity}
        </span>
        <ChevronDown size={15} style={{
          color: "#aaa", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }} />
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px 18px", background: sev.bg, borderTop: `1px solid ${sev.color}22` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#aaa", textTransform: "uppercase", margin: "12px 0 8px" }}>
            Affected Areas
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {finding.zones.map((z, i) => {
              const zsev = SEVERITY_CONFIG[z.severity?.toLowerCase()] || SEVERITY_CONFIG.unknown;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "white", border: `1px solid ${zsev.color}33`,
                  borderRadius: 100, padding: "4px 12px", fontSize: 12,
                }}>
                  <span style={{ color: "#444", textTransform: "capitalize" }}>{z.zone.replace(/_/g, " ")}</span>
                  <span style={{ color: zsev.color, fontWeight: 700, textTransform: "capitalize" }}>· {z.severity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, reason, usage, matchedZones }) {
  const [imgError, setImgError] = useState(false);
  const p = product || {};

  return (
    <div style={{
      background: "white", borderRadius: 20,
      border: "1px solid #efefef",
      display: "flex", flexDirection: "column",
      overflow: "hidden", height: "100%",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>

      {/* Image */}
      <div style={{
        width: "100%", height: 200,
        background: "linear-gradient(135deg, #f7f7f7, #eef5ff)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", flexShrink: 0,
      }}>
        {p.image_url && !imgError ? (
          <img
            src={`https://images.weserv.nl/?url=${encodeURIComponent(p.image_url)}&w=400&fit=contain&bg=white`}
            alt={p.name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: 16 }}
          />
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, opacity: 0.15, marginBottom: 6 }}>✦</div>
            {p.brand && <div style={{ fontSize: 10, color: "#bbb", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.brand}</div>}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 16px 0 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {p.brand && (
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#4a90e2", textTransform: "uppercase" }}>
            {p.brand}
          </div>
        )}
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111", lineHeight: 1.3 }}>
          {p.name || "Recommended Product"}
        </div>

        {/* Treats + zones row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
          {reason && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#4a90e2",
              background: "#eef5ff", padding: "2px 9px", borderRadius: 100,
              textTransform: "capitalize",
            }}>✦ {reason}</span>
          )}
          {matchedZones?.map((z, i) => (
            <span key={i} style={{
              fontSize: 10, fontWeight: 600, color: "#888",
              background: "#f0f0f0", padding: "2px 9px", borderRadius: 100,
              textTransform: "capitalize",
            }}>{z.replace(/_/g, " ")}</span>
          ))}
        </div>

        {/* Usage */}
        {usage && usage.trim() && (
          <div style={{
            background: "#f0f6ff", borderRadius: 8, border: "1px solid #dbeafe",
            padding: "8px 10px", fontSize: 11, color: "#3b5ea6", lineHeight: 1.6,
          }}>
            <span style={{ fontWeight: 700 }}>How to use: </span>{usage}
          </div>
        )}

        {/* Key ingredients */}
        {p.key_ingredients?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {p.key_ingredients.slice(0, 3).map((ing, i) => (
              <span key={i} style={{
                fontSize: 10, color: "#bbb",
                background: "#f5f5f5", padding: "2px 8px", borderRadius: 100,
                textTransform: "capitalize",
              }}>{ing}</span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 16px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid #f5f5f5", marginTop: 12,
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{p.price || ""}</span>
        {p.buy_link && (
          <a href={p.buy_link} target="_blank" rel="noreferrer" style={{
            background: "#4a90e2", color: "white",
            borderRadius: 100, padding: "7px 16px",
            fontSize: 11, fontWeight: 700, textDecoration: "none",
            transition: "background 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#3a7fd5"}
          onMouseLeave={e => e.currentTarget.style.background = "#4a90e2"}>
            Shop Now →
          </a>
        )}
      </div>
    </div>
  );
}

function ProductCarousel({ recommendations, orderedFindings }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 3;
  const total = recommendations.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (!total) return null;

  const visible = recommendations.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  // Build a map of issue -> zones from findings
  const issueZoneMap = {};
  for (const f of (orderedFindings || [])) {
    const key = (f.issue || f.finding || "").split("(")[0].trim().toLowerCase();
    if (!issueZoneMap[key]) issueZoneMap[key] = new Set();
    if (f.zone) issueZoneMap[key].add(f.zone);
  }

  // For a product, find which zones are relevant based on target_issues
  function getMatchedZones(rec) {
    const p = rec.product || rec;
    const zones = new Set();
    for (const issue of (p.target_issues || [])) {
      const key = issue.toLowerCase();
      if (issueZoneMap[key]) issueZoneMap[key].forEach(z => zones.add(z));
    }
    // Also check reason
    if (rec.reason) {
      const rKey = rec.reason.toLowerCase();
      if (issueZoneMap[rKey]) issueZoneMap[rKey].forEach(z => zones.add(z));
    }
    return Array.from(zones);
  }

  return (
    <div>
      {/* Header row */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#bbb", fontWeight: 600 }}>
            {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, total)} of {total}
          </span>
          <div style={{ display: "flex", gap: 7 }}>
            {[
              { icon: <ArrowLeft />, action: () => setPage(p => Math.max(0, p - 1)), disabled: page === 0 },
              { icon: <ArrowRight />, action: () => setPage(p => Math.min(totalPages - 1, p + 1)), disabled: page === totalPages - 1 },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} disabled={btn.disabled} style={{
                width: 34, height: 34, borderRadius: "50%",
                border: "1.5px solid #e8e8e8", background: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: btn.disabled ? "not-allowed" : "pointer",
                opacity: btn.disabled ? 0.35 : 1, color: "#444",
                transition: "all 0.15s",
              }}>{btn.icon}</button>
            ))}
          </div>
        </div>
      )}

      {/* 3-column grid */}
      <div key={page} style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(visible.length, 3)}, 1fr)`,
        gap: 14,
        animation: "fadeUp 0.3s ease both",
      }}>
        {visible.map((rec, i) => (
          <ProductCard
            key={i}
            product={rec.product || rec}
            reason={rec.reason}
            usage={rec.usage}
            matchedZones={getMatchedZones(rec)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── UPLOAD PAGE ──────────────────────────────────────────────────────────────

function UploadPage({ onResults }) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedZones, setSelectedZones] = useState(["whole_face"]);
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const API_BASE = "http://127.0.0.1:5000";

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }, []);

  const toggleZone = (zoneId) => {
    if (zoneId === "whole_face") { setSelectedZones(["whole_face"]); return; }
    setSelectedZones(prev => {
      const without = prev.filter(z => z !== "whole_face");
      if (without.includes(zoneId)) {
        const next = without.filter(z => z !== zoneId);
        return next.length === 0 ? ["whole_face"] : next;
      }
      return [...without, zoneId];
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("zones", JSON.stringify(selectedZones));
      if (symptoms.trim()) formData.append("symptoms", symptoms.trim());
      const res = await fetch(`${API_BASE}/analyze`, { method: "POST", body: formData });
      const data = await res.json();
      console.log("BACKEND RESPONSE:", JSON.stringify(data, null, 2));
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      onResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(250,250,250,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #f0f0f0", padding: "0 5vw", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#4a90e2" }}><SparkleIcon size={13} /></span>
          <span style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: "#111", letterSpacing: "-0.02em" }}>Crystal</span>
        </div>
        <button onClick={() => fileInputRef.current?.click()} style={{
          background: "#4a90e2", color: "white", border: "none",
          borderRadius: 100, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Analyse My Skin</button>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 5vw" }}>
        <div style={{ width: "100%", maxWidth: 680 }}>
          <div style={{ animation: "fadeUp 0.5s ease both", marginBottom: 36 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#eef5ff", borderRadius: 100, padding: "5px 14px", marginBottom: 18,
              fontSize: 11, fontWeight: 700, color: "#4a90e2", letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
              <SparkleIcon size={9} /> AI Skin Analysis
            </div>
            <h1 style={{
              fontSize: "clamp(30px, 5vw, 54px)",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#0a0a0a", marginBottom: 14,
            }}>
              Know your skin.<br /><span style={{ color: "#4a90e2" }}>Precisely.</span>
            </h1>
            <p style={{ fontSize: 15, color: "#888", lineHeight: 1.65, maxWidth: 380 }}>
              Upload a photo and Crystal analyses your skin zone by zone — then recommends the exact products you need.
            </p>
          </div>

          <div style={{
            background: "white", borderRadius: 24, border: "1px solid #ebebeb",
            boxShadow: "0 2px 24px rgba(0,0,0,0.05)",
            animation: "fadeUp 0.6s ease both", animationDelay: "0.1s", overflow: "hidden",
          }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])} />

            {/* Drop Zone */}
            <div style={{ padding: 22, borderBottom: "1px solid #f5f5f5" }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                style={{
                  border: `1.5px dashed ${dragging ? "#4a90e2" : "#ddd"}`,
                  borderRadius: 13, cursor: "pointer",
                  background: dragging ? "#f0f6ff" : "#fafafa",
                  transition: "all 0.2s", overflow: "hidden",
                  minHeight: preview ? 220 : "auto",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: preview ? 0 : "40px 24px", gap: 10,
                }}>
                {preview ? (
                  <div style={{ position: "relative", width: "100%", height: 220 }}>
                    <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.25), transparent 50%)" }} />
                    <div style={{
                      position: "absolute", bottom: 12, left: 12,
                      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
                      borderRadius: 9, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#333",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} /> Photo ready
                    </div>
                    <div onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} style={{
                      position: "absolute", top: 10, right: 10,
                      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
                      borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: "#4a90e2", cursor: "pointer",
                    }}>Change photo</div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      width: 46, height: 46, borderRadius: 12,
                      background: "#eef5ff", color: "#4a90e2",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}><UploadIcon /></div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#222", marginBottom: 3 }}>Drop your photo here</div>
                      <div style={{ fontSize: 12, color: "#bbb" }}>or click to browse — JPG, PNG, WEBP</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Zones */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#ccc", textTransform: "uppercase", marginBottom: 10 }}>Focus Areas</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {ZONE_OPTIONS.map(z => {
                  const active = selectedZones.includes(z.id);
                  return (
                    <button key={z.id} onClick={() => toggleZone(z.id)} style={{
                      padding: "6px 15px", borderRadius: 100,
                      border: `1.5px solid ${active ? "#4a90e2" : "#e8e8e8"}`,
                      background: active ? "#eef5ff" : "white",
                      color: active ? "#4a90e2" : "#666",
                      fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                    }}>{active && "✓ "}{z.label}</button>
                  );
                })}
              </div>
            </div>

            {/* Symptoms */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f5f5f5" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#ccc", textTransform: "uppercase", marginBottom: 10 }}>
                Any concerns? <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </div>
              <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)}
                placeholder="e.g. My skin feels dry, occasional breakouts on chin..." rows={2}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1.5px solid #eee", background: "#fafafa",
                  fontSize: 13, color: "#333", lineHeight: 1.6, resize: "vertical",
                  outline: "none", fontFamily: "inherit", transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#4a90e2"}
                onBlur={e => e.target.style.borderColor = "#eee"} />
            </div>

            {/* CTA */}
            <div style={{ padding: "16px 22px" }}>
              {error && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "#fff5f5", border: "1px solid #fed7d7",
                  color: "#c53030", fontSize: 13, marginBottom: 12,
                }}>{error}</div>
              )}
              <button onClick={handleAnalyze} disabled={!selectedFile || loading} style={{
                width: "100%", padding: "14px",
                background: selectedFile && !loading ? "#4a90e2" : "#c8ddf5",
                color: "white", border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 700,
                cursor: selectedFile && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                transition: "background 0.2s",
                boxShadow: selectedFile && !loading ? "0 4px 16px rgba(74,144,226,0.3)" : "none",
              }}>
                {loading ? (
                  <>
                    <div style={{
                      width: 18, height: 18,
                      border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
                      borderRadius: "50%", animation: "spin 0.7s linear infinite",
                    }} />
                    Analysing your skin…
                  </>
                ) : <><SparkleIcon size={14} /> Analyse My Skin</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #f0f0f0", padding: "18px 5vw",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        color: "#ccc", fontSize: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SparkleIcon size={10} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500, color: "#bbb" }}>Crystal</span>
        </div>
        <span>Powered by Gemini Vision AI</span>
      </footer>
    </div>
  );
}

// ─── RESULTS PAGE ─────────────────────────────────────────────────────────────

function ResultsPage({ results, onReset }) {
  const grouped = groupFindings(results.ordered_findings || []);

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(250,250,250,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid #f0f0f0", padding: "0 5vw", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#4a90e2" }}><SparkleIcon size={13} /></span>
          <span style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: "#111", letterSpacing: "-0.02em" }}>Crystal</span>
        </div>
        <button onClick={onReset} style={{
          background: "white", color: "#4a90e2", border: "1.5px solid #4a90e2",
          borderRadius: 100, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>← New Analysis</button>
      </nav>

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "calc(100vh - 60px)",
      }}>
        {/* LEFT — Findings */}
        <div style={{
          borderRight: "1px solid #efefef",
          padding: "44px 5vw 60px",
          overflowY: "auto",
          animation: "fadeUp 0.5s ease both",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#eef5ff", borderRadius: 100, padding: "4px 12px", marginBottom: 18,
            fontSize: 10, fontWeight: 800, color: "#4a90e2", letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            <SparkleIcon size={9} /> Analysis Complete
          </div>
          <h2 style={{
            fontSize: "clamp(22px, 3vw, 34px)",
            fontFamily: "'Playfair Display', serif",
            fontWeight: 500, color: "#0a0a0a",
            letterSpacing: "-0.02em", marginBottom: 12, lineHeight: 1.2,
          }}>Your Skin Report</h2>
          <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, marginBottom: 24 }}>
            {results.summary}
          </p>
          {results.zones_analyzed?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
              <span style={{ fontSize: 11, color: "#ccc", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Zones</span>
              {results.zones_analyzed.map(z => (
                <span key={z} style={{
                  fontSize: 11, color: "#888", background: "#f0f0f0",
                  padding: "3px 10px", borderRadius: 100, textTransform: "capitalize",
                }}>{z.replace(/_/g, " ")}</span>
              ))}
            </div>
          )}
          {grouped.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#ccc", textTransform: "uppercase", marginBottom: 10 }}>
                Tap a condition to expand
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {grouped.map((f, i) => <AccordionFinding key={f.name} finding={f} index={i} />)}
              </div>
            </>
          )}
        </div>

        {/* RIGHT — Products */}
        <div style={{
          padding: "44px 5vw 60px",
          overflowY: "auto",
          animation: "fadeUp 0.5s ease both", animationDelay: "0.15s",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#f0fdf4", borderRadius: 100, padding: "4px 12px", marginBottom: 18,
            fontSize: 10, fontWeight: 800, color: "#16a34a", letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            ✦ Recommended For You
          </div>
          <h2 style={{
            fontSize: "clamp(22px, 3vw, 34px)",
            fontFamily: "'Playfair Display', serif",
            fontWeight: 500, color: "#0a0a0a",
            letterSpacing: "-0.02em", marginBottom: 12, lineHeight: 1.2,
          }}>Your Products</h2>
          <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.65, marginBottom: 24 }}>
            Curated based on your skin findings, ordered by severity.
          </p>
          {results.recommendations?.length > 0 ? (
            <ProductCarousel recommendations={results.recommendations} orderedFindings={results.ordered_findings} />
          ) : (
            <div style={{
              background: "white", borderRadius: 16, border: "1px solid #efefef",
              padding: 32, textAlign: "center", color: "#ccc", fontSize: 14,
            }}>No recommendations available.</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #f0f0f0", padding: "16px 5vw",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        color: "#ccc", fontSize: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SparkleIcon size={10} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500, color: "#bbb" }}>Crystal</span>
        </div>
        <span>Powered by Gemini Vision AI</span>
      </footer>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function CrystalApp() {
  const [results, setResults] = useState(null);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; min-height: 100vh; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {results
        ? <ResultsPage results={results} onReset={() => setResults(null)} />
        : <UploadPage onResults={setResults} />
      }
    </>
  );
}
