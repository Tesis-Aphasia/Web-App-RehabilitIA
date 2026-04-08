import React, { useEffect, useState } from "react";
import {
  getExerciseDetails,
  deleteExerciseImage,
  approveExercise,
  generateExerciseImages,
  deleteExercise,
} from "../../services/exercisesService";
import { FaTimes, FaTrash, FaCheck, FaBan, FaLock } from "react-icons/fa";

const slotToLabel = (slot) => {
  if (slot === "pregunta_verbo") return "Verbo de la pregunta";
  if (slot.endsWith("_rta")) return "Respuesta";
  return slot;
};

// ── Preview modal de imagen ampliada ────────────────────────
const ImagePreview = ({ img, onClose }) => {
  if (!img) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
      onClick={onClose}
    >
      <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", maxWidth: "400px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}
        onClick={(e) => e.stopPropagation()}>
        <img src={img.url} alt={img.word} style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "12px" }} />
        <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#333" }}>{img.word}</p>
        <button onClick={onClose} style={{ background: "#fff7f2", border: "none", borderRadius: "10px", padding: "10px 28px", color: "#f48a63", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

const ImageReviewModal = ({ open, onClose, exercise, terapia }) => {
  const [imagenes, setImagenes] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState(null);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewImg, setPreviewImg] = useState(null);

  const yaAprobado = Boolean(exercise?.aprobado);

  useEffect(() => {
    if (!exercise || !open) return;
    const load = async () => {
      try {
        setLoading(true); setError(""); setSuccess("");
        const data = await getExerciseDetails(exercise.id, terapia);
        const extra = Array.isArray(data) ? data[0] : data || {};
        setImagenes(extra.imagenes || {});
      } catch { setError("No se pudieron cargar las imágenes."); }
      finally { setLoading(false); }
    };
    load();
  }, [exercise, open, terapia]);

  const handleDeleteImage = async (slot, key) => {
    if (yaAprobado) return;
    setDeletingKey(key);
    setError("");
    try {
      await deleteExerciseImage(key, exercise.id, terapia);
      setImagenes((prev) => { const u = { ...prev }; delete u[slot]; return u; });
    } catch { setError("No se pudo borrar la imagen. Verifica que el servidor esté activo."); }
    finally { setDeletingKey(null); }
  };

  const handleGenerate = async () => {
    if (yaAprobado) return;
    setGenerating(true); setError(""); setSuccess("");
    try {
      const result = await generateExerciseImages(exercise.id, terapia);
      if (result.ok) {
        setImagenes(result.imagenes || {});
        setSuccess(`✅ ${result.con_imagen} imágenes generadas`);
        setTimeout(() => setSuccess(""), 4000);
      } else { setError(result.error || "Error al generar imágenes."); }
    } catch { setError("Error de conexión. Verifica que el servidor esté activo."); }
    finally { setGenerating(false); }
  };

  const handleApprove = async () => {
    if (yaAprobado) return;
    setApproving(true); setError("");
    try {
      await approveExercise(exercise.id, terapia);
      setSuccess("✅ Ejercicio aprobado correctamente");
      setTimeout(() => onClose(true), 1500);
    } catch { setError("No se pudo aprobar el ejercicio."); setApproving(false); }
  };

  const handleDiscard = async () => {
    if (yaAprobado) return;
    if (!window.confirm("¿Seguro que quieres eliminar este ejercicio? Esta acción no se puede deshacer.")) return;
    setDeleting(true); setError("");
    try {
      await deleteExercise(exercise.id, terapia);
      onClose(true);
    } catch { setError("No se pudo eliminar el ejercicio. Verifica que el servidor esté activo."); setDeleting(false); }
  };

  if (!open) return null;

  const totalImagenes = Object.keys(imagenes).length;
  const hayImagenes = totalImagenes > 0;

  return (
    <>
      <ImagePreview img={previewImg} onClose={() => setPreviewImg(null)} />

      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        onClick={() => !approving && !deleting && onClose(false)}>
        <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "720px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}
          onClick={(e) => e.stopPropagation()}>

          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px 16px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", borderRadius: "20px 20px 0 0", zIndex: 1 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>Revisión de imágenes</h4>
              <span style={{ fontSize: "12px", color: "#aaa", fontFamily: "monospace" }}>{exercise?.id} · {terapia}</span>
            </div>
            <button onClick={() => onClose(false)} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
              <FaTimes size={14} />
            </button>
          </div>

          {/* BODY */}
          <div style={{ padding: "20px 28px", flex: 1 }}>

            {yaAprobado && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#166534" }}>
                <FaLock size={14} /> Este ejercicio ya fue aprobado y no puede modificarse.
              </div>
            )}

            <div style={{ background: yaAprobado ? "#f0fdf4" : "#fafafa", border: `1px solid ${yaAprobado ? "#86efac" : "#e5e7eb"}`, borderRadius: "12px", padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "#333" }}>{yaAprobado ? "✅ Ejercicio aprobado" : "⏳ Pendiente de aprobación"}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#888", marginTop: "2px" }}>{yaAprobado ? "Este ejercicio ya fue aprobado y está disponible para los pacientes" : "Genera las imágenes y aprueba el ejercicio cuando esté listo"}</p>
              </div>
              <div style={{ width: "52px", height: "28px", background: yaAprobado ? "#22c55e" : "#d1d5db", borderRadius: "999px", position: "relative", cursor: "not-allowed", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: "22px", height: "22px", background: "#fff", borderRadius: "50%", position: "absolute", top: "3px", left: yaAprobado ? "27px" : "3px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

            <div style={{ background: "#fff7f2", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", fontSize: "14px", color: "#444", borderLeft: "4px solid #f48a63" }}>
              <strong>Pregunta:</strong> {exercise?.pregunta || "—"}<br />
              <strong>Respuesta:</strong> {exercise?.rta_correcta || "—"}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div className="spinner-border text-warning" role="status" />
                <p style={{ marginTop: "12px", color: "#aaa", fontSize: "14px" }}>Cargando imágenes...</p>
              </div>
            ) : (
              <>
                {!hayImagenes ? (
                  <div style={{ textAlign: "center", padding: "36px 0", color: "#999" }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>🖼️</div>
                    <p style={{ marginBottom: "16px", fontSize: "15px" }}>No hay imágenes generadas para este ejercicio.</p>
                    {!yaAprobado && (
                      <button onClick={handleGenerate} disabled={generating}
                        style={{ background: "#f48a63", color: "white", border: "none", borderRadius: "10px", padding: "11px 24px", cursor: generating ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px", opacity: generating ? 0.7 : 1 }}>
                        {generating ? <><span className="spinner-border spinner-border-sm me-2" />Generando...</> : "Generar imágenes"}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: "14px" }}>
                      <span style={{ fontSize: "13px", color: "#888" }}>{totalImagenes} imagen{totalImagenes !== 1 ? "es" : ""} generada{totalImagenes !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                      {Object.entries(imagenes).map(([slot, img]) => (
                        <div key={slot} style={{ border: "1px solid #eee", borderRadius: "12px", overflow: "hidden", position: "relative", background: "#fafafa", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                          {/* Imagen clickeable para preview */}
                          <img
                            src={img.url} alt={img.word}
                            onClick={() => setPreviewImg(img)}
                            style={{ width: "100%", height: "120px", objectFit: "contain", padding: "10px", display: "block", cursor: "pointer" }}
                          />
                          <div style={{ padding: "8px", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#333", textAlign: "center", marginBottom: "3px" }}>{img.word}</div>
                            <div style={{ fontSize: "11px", color: "#888", textAlign: "center", fontWeight: 500 }}>{slotToLabel(slot)}</div>
                          </div>
                          {!yaAprobado && (
                            <button onClick={() => handleDeleteImage(slot, img.key)} disabled={deletingKey === img.key} title="Borrar imagen"
                              style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(220,53,69,0.85)", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: deletingKey === img.key ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                              {deletingKey === img.key ? <span className="spinner-border spinner-border-sm" style={{ width: "10px", height: "10px" }} /> : <FaTrash size={9} />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {error && <div className="alert alert-danger" style={{ borderRadius: "10px", fontSize: "14px" }}>{error}</div>}
                {success && <div className="alert alert-success" style={{ borderRadius: "10px", fontSize: "14px" }}>{success}</div>}
              </>
            )}
          </div>

          {/* FOOTER */}
          {!loading && !yaAprobado && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px 22px", borderTop: "1px solid #f0f0f0", gap: "12px", flexWrap: "wrap" }}>
              <button onClick={handleDiscard} disabled={deleting || approving}
                style={{ background: "#fff", border: "1.5px solid #dc3545", color: "#dc3545", borderRadius: "10px", padding: "10px 20px", cursor: deleting || approving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", opacity: deleting || approving ? 0.6 : 1 }}>
                <FaBan size={13} /> {deleting ? "Eliminando..." : "Descartar ejercicio"}
              </button>
              <button onClick={handleApprove} disabled={approving || deleting || !hayImagenes}
                title={!hayImagenes ? "Genera imágenes antes de aprobar" : ""}
                style={{ background: hayImagenes ? "#28a745" : "#ccc", border: "none", color: "white", borderRadius: "10px", padding: "10px 24px", cursor: approving || deleting || !hayImagenes ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", opacity: approving ? 0.7 : 1 }}>
                <FaCheck size={13} /> {approving ? "Aprobando..." : "Aprobar ejercicio"}
              </button>
            </div>
          )}
          {!loading && yaAprobado && (
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 28px 22px", borderTop: "1px solid #f0f0f0" }}>
              <button onClick={() => onClose(false)} style={{ background: "#f5f5f5", border: "none", borderRadius: "10px", padding: "10px 24px", cursor: "pointer", fontWeight: 600, fontSize: "14px", color: "#555" }}>Cerrar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ImageReviewModal;