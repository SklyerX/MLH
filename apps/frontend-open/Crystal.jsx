import { useState, useRef, useCallback } from "react";

const ZONE_OPTIONS = [
  { id: "whole_face", label: "Whole Face", emoji: "✦" },
  { id: "forehead", label: "Forehead", emoji: "△" },
  { id: "nose", label: "Nose", emoji: "◇" },
  { id: "left_cheek", label: "Left Cheek", emoji: "◁" },
  { id: "right_cheek", label: "Right Cheek", emoji: "▷" },
  { id: "chin", label: "Chin", emoji: "▽" },
];

const SEVERITY_CONFIG = {
  severe: { color: "#ef4444", bg: "#fef2f2", label: "Severe" },
  moderate: { color: "#f97316", bg: "#fff7ed", label: "Moderate" },
  mild: { color: "#eab308", bg: "#fefce8", label: "Mild" },
  clear: { color: "#22c55e", bg: "#f0fdf4", label: "Clear" },
  unknown: { color: "#94a3b8", bg: "#f8fafc", label: "Unknown" },
};

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function SparkleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div style={{
      width: 20, height: 20,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "white",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite"
    }} />
  );
}

function ProductCard({ product, index }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      padding: "20px",
      border: "1px solid #f0f0f0",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      animation: `fadeUp 0.5s ease both`,
      animationDelay: `${index * 80}ms`,
      transition: "box-shadow 0.2s, transform 0.2s",
      cursor: "default",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.08)";
      e.currentTarget.style.transform = "translateY(-2px)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.transform = "translateY(0)";
    }}
    >
      <div style={{
        width: "100%", height: 140, borderRadius: 10,
        background: "#f8f8f8",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
          />
        ) : (
          <div style={{ fontSize: 36, opacity: 0.2 }}>✦</div>
        )}
      </div>
      <div>
        {product.brand && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#4a90e2", textTransform: "uppercase", marginBottom: 4 }}>
            {product.brand}
          </div>
        )}
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111", lineHeight: 1.4, marginBottom: 6 }}>
          {product.name || "Recommended Product"}
        </div>
        {product.reason && (
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
            {product.reason}
          </div>
        )}
      </div>
      {product.price && (
        <div style={{ marginTop: "auto", fontSize: 15, fontWeight: 700, color: "#111" }}>
          {product.price}
        </div>
      )}
    </div>
  );
}

function FindingPill({ finding, index }) {
  const sev = SEVERITY_CONFIG[finding.severity?.toLowerCase()] || SEVERITY_CONFIG.unknown;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 14px",
      borderRadius: 100,
      background: sev.bg,
      border: `1px solid ${sev.color}22`,
      animation: `fadeUp 0.4s ease both`,
      animationDelay: `${index * 50}ms`,
      fontSize: 13,
      color: "#333",
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: "50%",
        background: sev.color, flexShrink: 0
      }} />
      <span>{finding.finding}</span>
      <span style={{
        marginLeft: "auto", paddingLeft: 8,
        fontSize: 11, fontWeight: 600,
        color: sev.color, opacity: 0.85
      }}>{sev.label}</span>
    </div>
  );
}

export default function CrystalApp() {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedZones, setSelectedZones] = useState(["whole_face"]);
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  const API_BASE = "http://localhost:5000";

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResults(null);
    setError(null);
  }, []);

  const toggleZone = (zoneId) => {
    if (zoneId === "whole_face") {
      setSelectedZones(["whole_face"]);
      return;
    }
    setSelectedZones(prev => {
      const withoutWhole = prev.filter(z => z !== "whole_face");
      if (withoutWhole.includes(zoneId)) {
        const next = withoutWhole.filter(z => z !== zoneId);
        return next.length === 0 ? ["whole_face"] : next;
      }
      return [...withoutWhole, zoneId];
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("zones", JSON.stringify(selectedZones));
      if (symptoms.trim()) formData.append("symptoms", symptoms.trim());

      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResults(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      color: "#111",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .upload-zone:hover { background: #f0f6ff !important; border-color: #4a90e2 !important; }
        .upload-zone.drag-over { background: #f0f6ff !important; border-color: #4a90e2 !important; }

        .nav-cta:hover { background: #3a7fd5 !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(74,144,226,0.35) !important; }
        .analyze-btn:hover:not(:disabled) { background: #3a7fd5 !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(74,144,226,0.4) !important; }
        .analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .zone-chip:hover { border-color: #4a90e2 !important; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(250,250,250,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #f0f0f0",
        padding: "0 5vw",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SparkleIcon size={14} />
          <span style={{
            fontSize: 18, fontWeight: 600,
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "-0.02em",
          }}>Crystal</span>
        </div>
        <button
          className="nav-cta"
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: "#4a90e2", color: "white",
            border: "none", borderRadius: 100,
            padding: "8px 20px", fontSize: 13,
            fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s",
          }}>
          Analyse My Skin
        </button>
      </nav>

      {/* HERO */}
      <section style={{
        padding: "72px 5vw 48px",
        maxWidth: 1100, margin: "0 auto",
      }}>
        <div style={{ animation: "fadeUp 0.6s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#eef5ff", borderRadius: 100,
            padding: "5px 14px", marginBottom: 24,
            fontSize: 12, fontWeight: 600, color: "#4a90e2",
            letterSpacing: "0.05em", textTransform: "uppercase"
          }}>
            <SparkleIcon size={10} />
            AI Skin Analysis
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 68px)",
            fontFamily: "'Playfair Display', serif",
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#0a0a0a",
            maxWidth: 680,
            marginBottom: 20,
          }}>
            Know your skin.<br />
            <span style={{ color: "#4a90e2" }}>Precisely.</span>
          </h1>
          <p style={{
            fontSize: 17, color: "#666", lineHeight: 1.65,
            maxWidth: 440, marginBottom: 48,
            fontWeight: 400,
          }}>
            Upload a photo and Crystal analyses your skin zone by zone — then recommends the exact products you need.
          </p>
        </div>

        {/* UPLOAD CARD */}
        <div style={{
          background: "white",
          borderRadius: 24,
          border: "1px solid #ebebeb",
          overflow: "hidden",
          boxShadow: "0 2px 24px rgba(0,0,0,0.05)",
          animation: "fadeUp 0.7s ease both",
          animationDelay: "0.1s",
        }}>
          {/* Upload Area */}
          <div style={{ padding: 28, borderBottom: "1px solid #f5f5f5" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])}
            />
            <div
              className={`upload-zone${dragging ? " drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              style={{
                border: "1.5px dashed #ddd",
                borderRadius: 16,
                padding: preview ? 0 : "48px 24px",
                cursor: "pointer",
                transition: "all 0.2s",
                background: "#fafafa",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                overflow: "hidden",
                minHeight: preview ? 260 : "auto",
              }}>
              {preview ? (
                <div style={{ position: "relative", width: "100%", height: 260 }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      width: "100%", height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)",
                  }} />
                  <div style={{
                    position: "absolute", bottom: 16, left: 16,
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 10, padding: "6px 12px",
                    fontSize: 12, fontWeight: 600, color: "#333",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                    Photo ready
                  </div>
                  <div style={{
                    position: "absolute", top: 12, right: 12,
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 8, padding: "5px 10px",
                    fontSize: 11, fontWeight: 600, color: "#4a90e2",
                    cursor: "pointer",
                  }}>
                    Change photo
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: "#eef5ff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#4a90e2",
                  }}>
                    <UploadIcon />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#222", marginBottom: 4 }}>
                      Drop your photo here
                    </div>
                    <div style={{ fontSize: 13, color: "#aaa" }}>
                      or click to browse — JPG, PNG, WEBP
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Zone Selection */}
          <div style={{ padding: "20px 28px", borderBottom: "1px solid #f5f5f5" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: 12 }}>
              Focus Areas
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ZONE_OPTIONS.map(z => {
                const active = selectedZones.includes(z.id);
                return (
                  <button
                    key={z.id}
                    className="zone-chip"
                    onClick={() => toggleZone(z.id)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 100,
                      border: `1.5px solid ${active ? "#4a90e2" : "#e8e8e8"}`,
                      background: active ? "#eef5ff" : "white",
                      color: active ? "#4a90e2" : "#666",
                      fontSize: 13, fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                    {active && <CheckIcon />}
                    {z.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Symptoms */}
          <div style={{ padding: "20px 28px", borderBottom: "1px solid #f5f5f5" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: 12 }}>
              Any concerns? <span style={{ fontWeight: 400, color: "#bbb", textTransform: "none", letterSpacing: 0 }}>(optional)</span>
            </div>
            <textarea
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              placeholder="e.g. My skin feels dry in the mornings, occasional breakouts on chin..."
              rows={2}
              style={{
                width: "100%", padding: "12px 16px",
                borderRadius: 12, border: "1.5px solid #eee",
                background: "#fafafa",
                fontSize: 13, color: "#333",
                lineHeight: 1.6, resize: "vertical",
                outline: "none", fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "#4a90e2"}
              onBlur={e => e.target.style.borderColor = "#eee"}
            />
          </div>

          {/* CTA */}
          <div style={{ padding: "20px 28px" }}>
            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: "#fff5f5", border: "1px solid #fed7d7",
                color: "#c53030", fontSize: 13, marginBottom: 14,
              }}>
                {error}
              </div>
            )}
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={!selectedFile || loading}
              style={{
                width: "100%", padding: "15px",
                background: "#4a90e2", color: "white",
                border: "none", borderRadius: 14,
                fontSize: 15, fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: "0 4px 16px rgba(74,144,226,0.25)",
              }}>
              {loading ? (
                <>
                  <LoadingSpinner />
                  Analysing your skin…
                </>
              ) : (
                <>
                  <SparkleIcon size={15} />
                  Analyse My Skin
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* LOADING STATE */}
      {loading && (
        <section style={{ padding: "0 5vw 48px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            background: "white", borderRadius: 24,
            border: "1px solid #ebebeb",
            padding: 40, textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64,
              background: "linear-gradient(135deg, #eef5ff, #dbeafe)",
              borderRadius: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              color: "#4a90e2",
            }}>
              <SparkleIcon size={28} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#111", marginBottom: 8 }}>
              Analysing your skin
            </div>
            <div style={{ fontSize: 13, color: "#aaa" }}>
              Crystal is examining each zone in detail…
            </div>
            <div style={{
              marginTop: 24, height: 3, background: "#f0f0f0",
              borderRadius: 100, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: "60%",
                background: "linear-gradient(90deg, transparent, #4a90e2, transparent)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
                borderRadius: 100,
              }} />
            </div>
          </div>
        </section>
      )}

      {/* RESULTS */}
      {results && !loading && (
        <section ref={resultsRef} style={{
          padding: "0 5vw 80px",
          maxWidth: 1100, margin: "0 auto",
          display: "flex", flexDirection: "column", gap: 20,
        }}>
          {/* Summary Card */}
          <div style={{
            background: "white",
            borderRadius: 24,
            border: "1px solid #ebebeb",
            overflow: "hidden",
            animation: "fadeUp 0.5s ease both",
          }}>
            <div style={{
              padding: "20px 28px",
              borderBottom: "1px solid #f5f5f5",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: "#eef5ff",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#4a90e2",
              }}>
                <SparkleIcon size={14} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Skin Analysis</span>
              <span style={{
                marginLeft: "auto",
                fontSize: 11, fontWeight: 600, color: "#22c55e",
                background: "#f0fdf4", padding: "3px 10px", borderRadius: 100,
              }}>
                Complete
              </span>
            </div>
            <div style={{ padding: 28 }}>
              <p style={{
                fontSize: 15, color: "#444", lineHeight: 1.7,
                marginBottom: results.ordered_findings?.length ? 24 : 0,
              }}>
                {results.summary}
              </p>

              {results.ordered_findings?.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: 12 }}>
                    Findings
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {results.ordered_findings.map((f, i) => (
                      <FindingPill key={i} finding={f} index={i} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Zones analyzed */}
            {results.zones_analyzed?.length > 0 && (
              <div style={{
                padding: "14px 28px",
                borderTop: "1px solid #f5f5f5",
                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              }}>
                <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Zones analysed
                </span>
                {results.zones_analyzed.map(z => (
                  <span key={z} style={{
                    fontSize: 11, color: "#888",
                    background: "#f5f5f5", padding: "3px 10px", borderRadius: 100,
                  }}>
                    {z.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {results.recommendations?.length > 0 && (
            <div style={{
              background: "white",
              borderRadius: 24,
              border: "1px solid #ebebeb",
              overflow: "hidden",
              animation: "fadeUp 0.5s ease both",
              animationDelay: "0.15s",
            }}>
              <div style={{
                padding: "20px 28px",
                borderBottom: "1px solid #f5f5f5",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: "#eef5ff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#4a90e2", fontSize: 15,
                }}>
                  ✦
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Recommended For You</span>
                <span style={{
                  marginLeft: "auto",
                  fontSize: 11, color: "#aaa",
                }}>
                  {results.recommendations.length} products
                </span>
              </div>

              <div style={{
                padding: 28,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}>
                {results.recommendations.map((p, i) => (
                  <ProductCard key={i} product={p} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={() => {
              setResults(null);
              setSelectedFile(null);
              setPreview(null);
              setSymptoms("");
              setSelectedZones(["whole_face"]);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              alignSelf: "center",
              background: "transparent", color: "#aaa",
              border: "1.5px solid #e8e8e8", borderRadius: 100,
              padding: "10px 24px", fontSize: 13,
              cursor: "pointer", fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#4a90e2";
              e.currentTarget.style.color = "#4a90e2";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#e8e8e8";
              e.currentTarget.style.color = "#aaa";
            }}
          >
            Start a new analysis
          </button>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #f0f0f0",
        padding: "24px 5vw",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        color: "#bbb", fontSize: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SparkleIcon size={10} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500, color: "#999" }}>Crystal</span>
        </div>
        <span>Powered by Gemini Vision AI</span>
      </footer>
    </div>
  );
}
