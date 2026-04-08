import React, { useEffect, useState } from "react";
import {
  getExerciseDetails,
  deleteExerciseImage,
  approveExercise,
  generateExerciseImages,
  deleteExercise,
} from "../../services/exercisesService";
import { FaTimes, FaTrash, FaCheck, FaBan, FaLock, FaChevronDown, FaChevronRight, FaImage } from "react-icons/fa";

const getImgBySlot = (imagenes, slot) => imagenes?.[slot] || null;

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

// ── Tarjeta de imagen ────────────────────────────────────────
const ImageCard = ({ img, slot, word, yaAprobado, deletingKey, onDelete, onGenerate, generatingSlot, onPreview }) => {
  if (img) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#fafafa", borderRadius: "10px", padding: "8px 12px", border: "1px solid #eee" }}>
        {/* Imagen clickeable para preview */}
        <img
          src={img.url} alt={img.word}
          onClick={() => onPreview(img)}
          style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "8px", background: "#fff", padding: "4px", cursor: "pointer" }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#333" }}>{img.word}</div>
        </div>
        {!yaAprobado && (
          <button onClick={() => onDelete(slot, img.key)} disabled={deletingKey === img.key}
            style={{ background: "rgba(220,53,69,0.85)", border: "none", borderRadius: "50%", width: "26px", height: "26px", cursor: deletingKey === img.key ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {deletingKey === img.key ? <span className="spinner-border spinner-border-sm" style={{ width: "10px", height: "10px" }} /> : <FaTrash size={9} />}
          </button>
        )}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#fafafa", borderRadius: "10px", padding: "8px 12px", border: "1px dashed #ddd" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "8px", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <FaImage size={20} color="#ccc" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#888" }}>{word}</div>
        <div style={{ fontSize: "11px", color: "#bbb" }}>Sin imagen</div>
      </div>
      {!yaAprobado && (
        <button onClick={() => onGenerate(slot, word)} disabled={generatingSlot === slot}
          style={{ background: generatingSlot === slot ? "#ccc" : "#f48a63", border: "none", borderRadius: "8px", padding: "5px 10px", color: "white", fontSize: "11px", fontWeight: 600, cursor: generatingSlot === slot ? "not-allowed" : "pointer", flexShrink: 0 }}>
          {generatingSlot === slot ? "..." : "+ Generar"}
        </button>
      )}
    </div>
  );
};

// ── Sección plegable ─────────────────────────────────────────
const Collapsible = ({ title, defaultOpen = false, children, accent = "#f48a63" }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "6px" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "6px 0", fontSize: "13px", fontWeight: 600, color: accent, textAlign: "left" }}>
        {open ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
        {title}
      </button>
      {open && (
        <div style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── MODAL PRINCIPAL ──────────────────────────────────────────
const VNESTImageReviewModal = ({ open, onClose, exercise }) => {
  const [imagenes, setImagenes] = useState({});
  const [pares, setPares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aprobado, setAprobado] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingSlot, setGeneratingSlot] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewImg, setPreviewImg] = useState(null); // para el preview de imagen

  const yaAprobado = Boolean(aprobado);

  useEffect(() => {
    if (!exercise || !open) return;
    const load = async () => {
      try {
        setLoading(true); setError(""); setSuccess("");
        const data = await getExerciseDetails(exercise.id, "VNEST");
        const extra = Array.isArray(data) ? data[0] : data || {};
        setImagenes(extra.imagenes || {});
        setAprobado(extra.aprobado || false);
        setPares(extra.pares || []);
      } catch { setError("No se pudieron cargar las imágenes."); }
      finally { setLoading(false); }
    };
    load();
  }, [exercise, open]);

  const handleDeleteImage = async (slot, key) => {
    if (yaAprobado) return;
    setDeletingKey(key);
    try {
      await deleteExerciseImage(key, exercise.id, "VNEST");
      setImagenes((prev) => { const u = { ...prev }; delete u[slot]; return u; });
    } catch { setError("No se pudo borrar la imagen. Verifica que el servidor esté activo."); }
    finally { setDeletingKey(null); }
  };

  const handleGenerateAll = async () => {
    if (yaAprobado) return;
    setGenerating(true); setError(""); setSuccess("");
    try {
      const result = await generateExerciseImages(exercise.id, "VNEST");
      if (result.ok) {
        setImagenes(result.imagenes || {});
        setSuccess(`✅ ${result.con_imagen} imágenes generadas`);
        setTimeout(() => setSuccess(""), 4000);
      } else { setError(result.error || "Error al generar imágenes."); }
    } catch { setError("Error de conexión. Verifica que el servidor esté activo."); }
    finally { setGenerating(false); }
  };

  const handleGenerateSingle = async (slot, word) => {
    alert(`Generación individual próximamente: "${word}"`);
  };

  const handleApprove = async () => {
    if (yaAprobado) return;
    setApproving(true); setError("");
    try {
      await approveExercise(exercise.id, "VNEST");
      setSuccess("✅ Ejercicio aprobado correctamente");
      setTimeout(() => onClose(true), 1500);
    } catch { setError("No se pudo aprobar el ejercicio."); setApproving(false); }
  };

  const handleDiscard = async () => {
    if (yaAprobado) return;
    if (!window.confirm("¿Seguro que quieres eliminar este ejercicio? Esta acción no se puede deshacer.")) return;
    setDeleting(true); setError("");
    try {
      await deleteExercise(exercise.id, "VNEST");
      onClose(true);
    } catch { setError("No se pudo eliminar el ejercicio. Verifica que el servidor esté activo."); setDeleting(false); }
  };

  if (!open) return null;

  const totalImagenes = Object.keys(imagenes).length;
  const hayImagenes = totalImagenes > 0;
  const verboImg = getImgBySlot(imagenes, "verbo");

  const cardProps = {
    yaAprobado, deletingKey,
    onDelete: handleDeleteImage,
    onGenerate: handleGenerateSingle,
    generatingSlot,
    onPreview: setPreviewImg,
  };

  return (
    <>
      {/* Preview ampliado */}
      <ImagePreview img={previewImg} onClose={() => setPreviewImg(null)} />

      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        onClick={() => !approving && !deleting && onClose(false)}>
        <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "740px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}
          onClick={(e) => e.stopPropagation()}>

          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px 16px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", borderRadius: "20px 20px 0 0", zIndex: 1 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>Revisión de imágenes · VNeST</h4>
              <span style={{ fontSize: "12px", color: "#aaa", fontFamily: "monospace" }}>{exercise?.id}</span>
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
                <p style={{ margin: 0, fontSize: "12px", color: "#888", marginTop: "2px" }}>{yaAprobado ? "Este ejercicio está disponible para los pacientes" : "Genera las imágenes y aprueba el ejercicio cuando esté listo"}</p>
              </div>
              <div style={{ width: "52px", height: "28px", background: yaAprobado ? "#22c55e" : "#d1d5db", borderRadius: "999px", position: "relative", cursor: "not-allowed", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: "22px", height: "22px", background: "#fff", borderRadius: "50%", position: "absolute", top: "3px", left: yaAprobado ? "27px" : "3px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

            <div style={{ background: "#fff7f2", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", fontSize: "14px", color: "#444", borderLeft: "4px solid #f48a63" }}>
              <strong>Verbo:</strong> {exercise?.verbo || "—"} &nbsp;·&nbsp; <strong>Contexto:</strong> {exercise?.contexto || "—"}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div className="spinner-border text-warning" role="status" />
                <p style={{ marginTop: "12px", color: "#aaa", fontSize: "14px" }}>Cargando imágenes...</p>
              </div>
            ) : (
              <>
                {/* Botón generar — solo si no hay imágenes */}
                {!yaAprobado && !hayImagenes && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
                    <button onClick={handleGenerateAll} disabled={generating}
                      style={{ background: generating ? "#ccc" : "#f48a63", border: "none", color: "white", borderRadius: "8px", padding: "7px 16px", fontSize: "13px", fontWeight: 600, cursor: generating ? "not-allowed" : "pointer" }}>
                      {generating ? <><span className="spinner-border spinner-border-sm me-1" />Generando...</> : "Generar imágenes"}
                    </button>
                  </div>
                )}

                {!hayImagenes && !generating && (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#999", marginBottom: "16px" }}>
                    <FaImage size={32} color="#ddd" />
                    <p style={{ marginTop: "8px", fontSize: "14px" }}>No hay imágenes generadas. Usa "Generar imágenes" para generarlas.</p>
                  </div>
                )}

                {/* VERBO PRINCIPAL */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>🎯 Verbo principal</div>
                  <ImageCard img={verboImg} slot="verbo" word={exercise?.verbo || ""} {...cardProps} />
                </div>

                {/* PARES */}
                {pares.length > 0 && (
                  <>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>🔗 Pares</div>
                    {pares.map((par, i) => {
                      const exp = par.expansiones || {};
                      return (
                        <div key={i} style={{ border: "1px solid #f0f0f0", borderRadius: "12px", padding: "12px 16px", marginBottom: "10px", background: "#fdfcfc" }}>
                          <Collapsible title={`Par ${i + 1}: ${par.sujeto} → ${par.objeto}`} defaultOpen={i === 0}>

                            <div>
                              <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>Sujeto</div>
                              <ImageCard img={getImgBySlot(imagenes, `pares_${i}_sujeto`)} slot={`pares_${i}_sujeto`} word={par.sujeto} {...cardProps} />
                            </div>

                            <div>
                              <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>Objeto</div>
                              <ImageCard img={getImgBySlot(imagenes, `pares_${i}_objeto`)} slot={`pares_${i}_objeto`} word={par.objeto} {...cardProps} />
                            </div>

                            {exp.donde && (
                              <Collapsible title={`📍 Dónde — correcta: "${exp.donde.opcion_correcta}"`} accent="#888">
                                <div>
                                  <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, marginBottom: "4px" }}>✅ Correcta</div>
                                  <ImageCard img={getImgBySlot(imagenes, `pares_${i}_donde_correcta`)} slot={`pares_${i}_donde_correcta`} word={exp.donde.opcion_correcta} {...cardProps} />
                                </div>
                                {exp.donde.opciones?.filter(op => op !== exp.donde.opcion_correcta).map((op, j) => (
                                  <div key={j}>
                                    <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, marginBottom: "4px" }}>Incorrecta {j + 1}</div>
                                    <ImageCard img={getImgBySlot(imagenes, `pares_${i}_donde_incorrecta_${j + 1}`)} slot={`pares_${i}_donde_incorrecta_${j + 1}`} word={op} {...cardProps} />
                                  </div>
                                ))}
                              </Collapsible>
                            )}

                            {exp.cuando && (
                              <Collapsible title={`⏰ Cuándo — correcta: "${exp.cuando.opcion_correcta}"`} accent="#888">
                                <div>
                                  <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, marginBottom: "4px" }}>✅ Correcta</div>
                                  <ImageCard img={getImgBySlot(imagenes, `pares_${i}_cuando_correcta`)} slot={`pares_${i}_cuando_correcta`} word={exp.cuando.opcion_correcta} {...cardProps} />
                                </div>
                                <div style={{ marginTop: "4px" }}>
                                  <div style={{ fontSize: "11px", color: "#ccc", marginBottom: "2px" }}>Otras opciones:</div>
                                  {exp.cuando.opciones?.filter(op => op !== exp.cuando.opcion_correcta).map((op, j) => (
                                    <div key={j}>
                                      <ImageCard img={getImgBySlot(imagenes, `pares_${i}_cuando_incorrecta_${j + 1}`)} slot={`pares_${i}_cuando_incorrecta_${j + 1}`} word={op} {...cardProps} />
                                    </div>
                                  ))}
                                </div>
                              </Collapsible>
                            )}

                            {exp.por_que && (
                              <Collapsible title={`💡 Por qué — correcta: "${exp.por_que.opcion_correcta}"`} accent="#888">
                                <div>
                                  <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, marginBottom: "4px" }}>✅ Correcta</div>
                                  <ImageCard img={getImgBySlot(imagenes, `pares_${i}_por_que_correcta`)} slot={`pares_${i}_por_que_correcta`} word={exp.por_que.opcion_correcta} {...cardProps} />
                                </div>
                                <div style={{ marginTop: "4px" }}>
                                  <div style={{ fontSize: "11px", color: "#ccc", marginBottom: "2px" }}>Otras opciones:</div>
                                  {exp.por_que.opciones?.filter(op => op !== exp.por_que.opcion_correcta).map((op, j) => (
                                    <div key={j}>
                                      <ImageCard img={getImgBySlot(imagenes, `pares_${i}_por_que_incorrecta_${j + 1}`)} slot={`pares_${i}_por_que_incorrecta_${j + 1}`} word={op} {...cardProps} />
                                    </div>
                                  ))}
                                </div>
                              </Collapsible>
                            )}

                          </Collapsible>
                        </div>
                      );
                    })}
                  </>
                )}

                {error && <div className="alert alert-danger mt-3" style={{ borderRadius: "10px", fontSize: "14px" }}>{error}</div>}
                {success && <div className="alert alert-success mt-3" style={{ borderRadius: "10px", fontSize: "14px" }}>{success}</div>}
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

export default VNESTImageReviewModal;