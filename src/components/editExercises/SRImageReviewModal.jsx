import React, { useEffect, useState } from "react";
import {
  getExerciseDetails,
  deleteExerciseImage,
  approveExercise,
  generateExerciseImages,
  deleteExercise,
} from "../../services/exercisesService";
import { saveFeedbackAndLink, getFeedbackByExerciseId } from "../../services/feedbackService";
import { FaTimes, FaTrash, FaCheck, FaBan, FaLock, FaChevronDown, FaCheckCircle, FaImage, FaTimesCircle } from "react-icons/fa";

// ─────────────────────────────────────────────────────────────
//  Opciones de feedback
// ─────────────────────────────────────────────────────────────
const MOTIVOS_SIN_IMAGENES = [
  "No aportan al ejercicio",
  "Aumentan la carga cognitiva",
  "No son necesarias para este ejercicio",
  "Riesgo de confusión",
];

const MOTIVOS_DESCARTE_IMAGEN = [
  "Ambigua",
  "Incorrecta semánticamente",
  "Poco útil terapéuticamente",
  "Distractora",
  "Culturalmente inadecuada",
];

const MOTIVOS_RECHAZO = [
  "Pregunta mal formulada",
  "Respuesta incorrecta o ambigua",
  "No es apropiado para el paciente",
  "Contenido duplicado",
  "Error en las imágenes generadas",
  "Otro",
];

// ─────────────────────────────────────────────────────────────
//  localStorage helpers para persistir imágenes descartadas
// ─────────────────────────────────────────────────────────────
const STORAGE_PREFIX = "imgReview_deleted_";
const PENDING_FEEDBACK_PREFIX = "imgReview_pendingFeedback_";

const getStorageKey = (exerciseId) => `${STORAGE_PREFIX}${exerciseId}`;
const getPendingFeedbackKey = (exerciseId) => `${PENDING_FEEDBACK_PREFIX}${exerciseId}`;

const loadDeletedImages = (exerciseId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(exerciseId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveDeletedImages = (exerciseId, images) => {
  try { localStorage.setItem(getStorageKey(exerciseId), JSON.stringify(images)); } catch (_) { }
};

const clearDeletedImages = (exerciseId) => {
  try { localStorage.removeItem(getStorageKey(exerciseId)); } catch (_) { }
};

const savePendingFeedback = (exerciseId, tipo) => {
  try { localStorage.setItem(getPendingFeedbackKey(exerciseId), JSON.stringify({ tipo })); } catch (_) { }
};

const clearPendingFeedback = (exerciseId) => {
  try { localStorage.removeItem(getPendingFeedbackKey(exerciseId)); } catch (_) { }
};

const loadPendingFeedback = (exerciseId) => {
  try {
    const raw = localStorage.getItem(getPendingFeedbackKey(exerciseId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

// ─────────────────────────────────────────────────────────────
//  Componente: Select estilizado
// ─────────────────────────────────────────────────────────────
const StyledSelect = ({ value, onChange, options, placeholder }) => (
  <div style={{ position: "relative" }}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        appearance: "none",
        background: "#fff",
        border: "1.5px solid #e5e7eb",
        borderRadius: "10px",
        padding: "11px 40px 11px 14px",
        fontSize: "14px",
        color: value ? "#1a1a1a" : "#9ca3af",
        cursor: "pointer",
        outline: "none",
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
    <FaChevronDown
      size={11}
      style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────
//  Preview modal de imagen ampliada
// ─────────────────────────────────────────────────────────────
const ImagePreview = ({ img, onClose }) => {
  if (!img) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "20px", padding: "24px", maxWidth: "400px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={img.url} alt={img.word} style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "12px" }} />
        <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#333" }}>{img.word}</p>
        <button onClick={onClose} style={{ background: "#fff7f2", border: "none", borderRadius: "10px", padding: "10px 28px", color: "#f48a63", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Componente: Panel de feedback del ejercicio aprobado
// ─────────────────────────────────────────────────────────────
const FeedbackAprobadoPanel = ({ feedback }) => {
  if (!feedback) return null;

  const { tipo, motivo_sin_imagenes, motivo_descarte, imagenes_descartadas } = feedback;

  // Aprobado normalmente con imágenes, sin descarte
  if (tipo === "aprobado") {
    return (
      <div style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        border: "1px solid #86efac",
        borderRadius: "14px",
        padding: "16px 20px",
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <FaCheckCircle size={15} color="#16a34a" />
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#15803d" }}>Aprobado con todas sus imágenes</span>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "#4ade80", fontWeight: 500 }}>
          El ejercicio fue aprobado sin eliminar ninguna imagen de apoyo.
        </p>
      </div>
    );
  }

  // Aprobado sin imágenes
  if (tipo === "aprobado_sin_imagenes") {
    return (
      <div style={{
        background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
        border: "1px solid #fcd34d",
        borderRadius: "14px",
        padding: "16px 20px",
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <FaImage size={14} color="#b45309" />
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#92400e" }}>Aprobado sin imágenes de apoyo</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", background: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "8px 12px" }}>
          <span style={{ fontSize: "12px", color: "#78350f", fontWeight: 600, whiteSpace: "nowrap" }}>Motivo:</span>
          <span style={{ fontSize: "13px", color: "#92400e" }}>{motivo_sin_imagenes || "No especificado"}</span>
        </div>
      </div>
    );
  }

  // Aprobado con imágenes descartadas
  if (tipo === "aprobado_con_imagenes_descartadas") {
    return (
      <div style={{
        background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
        border: "1px solid #fdba74",
        borderRadius: "14px",
        padding: "16px 20px",
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <FaTimesCircle size={14} color="#c2410c" />
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#9a3412" }}>
            Aprobado con {imagenes_descartadas?.length || 0} imagen{imagenes_descartadas?.length !== 1 ? "es" : ""} descartada{imagenes_descartadas?.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Imágenes descartadas */}
        {imagenes_descartadas?.length > 0 && (
          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 600, color: "#78350f" }}>Palabras eliminadas:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {imagenes_descartadas.map((img, i) => (
                <span key={img.key || i} style={{
                  background: "#fff",
                  border: "1.5px solid #fdba74",
                  borderRadius: "20px",
                  padding: "3px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#c2410c",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}>
                  <FaTimesCircle size={9} />
                  {img.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Motivo del descarte */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", background: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "8px 12px" }}>
          <span style={{ fontSize: "12px", color: "#78350f", fontWeight: 600, whiteSpace: "nowrap" }}>Motivo:</span>
          <span style={{ fontSize: "13px", color: "#9a3412" }}>{motivo_descarte || "No especificado"}</span>
        </div>
      </div>
    );
  }

  return null;
};

// ─────────────────────────────────────────────────────────────
//  Modal: aprobar SIN imágenes
// ─────────────────────────────────────────────────────────────
const FeedbackSinImagenesModal = ({ onConfirm, onCancel, loading }) => {
  const [motivo, setMotivo] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "440px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <h5 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Ejercicio aprobado sin imágenes</h5>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#888" }}>¿Por qué se aprueba sin imágenes de apoyo?</p>
        <StyledSelect value={motivo} onChange={setMotivo} options={MOTIVOS_SIN_IMAGENES} placeholder="Selecciona un motivo…" />
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex: 1, background: "#f5f5f5", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 600, color: "#555", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={() => motivo && onConfirm(motivo)} disabled={!motivo || loading}
            style={{ flex: 2, background: motivo ? "#28a745" : "#d1d5db", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: motivo ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : <><FaCheck size={12} /> Confirmar y aprobar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Modal: imágenes descartadas
// ─────────────────────────────────────────────────────────────
const FeedbackImagenesDescartadasModal = ({ imagenesDescartadas, onConfirm, onCancel, loading }) => {
  const [motivo, setMotivo] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "460px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <h5 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Imágenes descartadas</h5>
        <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#888" }}>
          Descartaste {imagenesDescartadas.length} imagen{imagenesDescartadas.length > 1 ? "es" : ""}. ¿Cuál fue el motivo general?
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {imagenesDescartadas.map((img) => (
            <span key={img.key} style={{ background: "#fff7f2", border: "1px solid #f48a63", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#f48a63" }}>
              {img.word}
            </span>
          ))}
        </div>
        <StyledSelect value={motivo} onChange={setMotivo} options={MOTIVOS_DESCARTE_IMAGEN} placeholder="Selecciona un motivo…" />
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex: 1, background: "#f5f5f5", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 600, color: "#555", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={() => motivo && onConfirm(motivo)} disabled={!motivo || loading}
            style={{ flex: 2, background: motivo ? "#28a745" : "#d1d5db", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: motivo ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : <><FaCheck size={12} /> Confirmar y aprobar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Modal: motivo de rechazo
// ─────────────────────────────────────────────────────────────
const FeedbackRechazoModal = ({ onConfirm, onCancel, loading }) => {
  const [motivo, setMotivo] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "440px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <h5 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Motivo de rechazo</h5>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#888" }}>¿Por qué se descarta este ejercicio?</p>
        <StyledSelect value={motivo} onChange={setMotivo} options={MOTIVOS_RECHAZO} placeholder="Selecciona un motivo…" />
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex: 1, background: "#f5f5f5", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 600, color: "#555", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={() => motivo && onConfirm(motivo)} disabled={!motivo || loading}
            style={{ flex: 2, background: motivo ? "#dc3545" : "#d1d5db", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: motivo ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : <><FaBan size={12} /> Confirmar y descartar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  helpers
// ─────────────────────────────────────────────────────────────
const slotToLabel = (slot) => {
  if (slot === "pregunta_verbo") return "Verbo de la pregunta";
  if (slot.endsWith("_rta")) return "Respuesta";
  return slot;
};

// ─────────────────────────────────────────────────────────────
//  MODAL PRINCIPAL
// ─────────────────────────────────────────────────────────────
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

  // Feedback guardado en Firebase (solo lectura, para ejercicios aprobados)
  const [feedbackGuardado, setFeedbackGuardado] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Feedback modals
  const [showFeedbackSinImagenes, setShowFeedbackSinImagenes] = useState(false);
  const [showFeedbackDescarte, setShowFeedbackDescarte] = useState(false);
  const [showFeedbackRechazo, setShowFeedbackRechazo] = useState(false);

  // Imágenes descartadas persistidas en localStorage
  const [deletedImages, setDeletedImages] = useState([]);

  const yaAprobado = Boolean(exercise?.aprobado);

  // ── Reset completo al abrir ───────────────────────────────
  useEffect(() => {
    if (!exercise || !open) return;

    setApproving(false);
    setDeleting(false);
    setGenerating(false);
    setDeletingKey(null);
    setError("");
    setSuccess("");
    setPreviewImg(null);
    setShowFeedbackSinImagenes(false);
    setShowFeedbackDescarte(false);
    setShowFeedbackRechazo(false);
    setFeedbackGuardado(null);

    // Cargar imágenes descartadas persistidas
    const persisted = loadDeletedImages(exercise.id);
    setDeletedImages(persisted);

    // Si había un feedback pendiente (cerró sin completar), reabrirlo
    const pending = loadPendingFeedback(exercise.id);
    if (pending) {
      if (pending.tipo === "sin_imagenes") setShowFeedbackSinImagenes(true);
      else if (pending.tipo === "descarte") setShowFeedbackDescarte(true);
      else if (pending.tipo === "rechazo") setShowFeedbackRechazo(true);
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await getExerciseDetails(exercise.id, terapia);
        const extra = Array.isArray(data) ? data[0] : data || {};
        setImagenes(extra.imagenes || {});
      } catch {
        setError("No se pudieron cargar las imágenes.");
      } finally {
        setLoading(false);
      }
    };
    load();

    // Si ya está aprobado, cargar el feedback guardado en Firebase
    if (yaAprobado) {
      const loadFeedback = async () => {
        try {
          setLoadingFeedback(true);
          const fb = await getFeedbackByExerciseId(exercise.id);
          setFeedbackGuardado(fb || null);
        } catch {
          // Si falla, simplemente no se muestra el panel de feedback
          setFeedbackGuardado(null);
        } finally {
          setLoadingFeedback(false);
        }
      };
      loadFeedback();
    }
  }, [exercise?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Borrar imagen ─────────────────────────────────────────
  const handleDeleteImage = async (slot, img) => {
    if (yaAprobado) return;
    setDeletingKey(img.key);
    setError("");
    try {
      await deleteExerciseImage(img.key, exercise.id, terapia);
      const updated = [...deletedImages, { key: img.key, word: img.word }];
      setDeletedImages(updated);
      saveDeletedImages(exercise.id, updated);
      setImagenes((prev) => {
        const u = { ...prev };
        delete u[slot];
        return u;
      });
    } catch {
      setError("No se pudo borrar la imagen. Verifica que el servidor esté activo.");
    } finally {
      setDeletingKey(null);
    }
  };

  // ── Generar imágenes ──────────────────────────────────────
  const handleGenerate = async () => {
    if (yaAprobado) return;
    setGenerating(true); setError(""); setSuccess("");
    try {
      const result = await generateExerciseImages(exercise.id, terapia);
      if (result.ok) {
        setImagenes(result.imagenes || {});
        setDeletedImages([]);
        clearDeletedImages(exercise.id);
        clearPendingFeedback(exercise.id);
        setSuccess(`✅ ${result.con_imagen} imágenes generadas`);
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(result.error || "Error al generar imágenes.");
      }
    } catch {
      setError("Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Aprobar: decide qué flujo mostrar ────────────────────
  const handleApproveClick = () => {
    const hayImagenesActuales = Object.keys(imagenes).length > 0;
    const hayImagenesBorradas = deletedImages.length > 0;

    if (!hayImagenesActuales) {
      savePendingFeedback(exercise.id, "sin_imagenes");
      setShowFeedbackSinImagenes(true);
    } else if (hayImagenesBorradas) {
      savePendingFeedback(exercise.id, "descarte");
      setShowFeedbackDescarte(true);
    } else {
      executeApprove({ tipo: "aprobado" });
    }
  };

  // ── Ejecutar aprobación ───────────────────────────────────
  const executeApprove = async (feedbackData) => {
    setApproving(true); setError("");
    try {
      await saveFeedbackAndLink(exercise.id, {
        ...feedbackData,
        pregunta: exercise.pregunta || "",
        respuesta: exercise.rta_correcta || "",
      });
      await approveExercise(exercise.id, terapia);
      clearDeletedImages(exercise.id);
      clearPendingFeedback(exercise.id);
      setSuccess("✅ Ejercicio aprobado correctamente");
      setTimeout(() => onClose(true), 1500);
    } catch (err) {
      console.error("Error en executeApprove:", err);
      setError("No se pudo aprobar el ejercicio. Verifica tu conexión e inténtalo de nuevo.");
      setApproving(false);
    }
  };

  // ── Confirmaciones de feedback de aprobación ─────────────
  const onConfirmSinImagenes = (motivo) => {
    clearPendingFeedback(exercise.id);
    setShowFeedbackSinImagenes(false);
    executeApprove({ tipo: "aprobado_sin_imagenes", motivo_sin_imagenes: motivo });
  };

  const onConfirmDescarte = (motivo) => {
    clearPendingFeedback(exercise.id);
    setShowFeedbackDescarte(false);
    executeApprove({
      tipo: "aprobado_con_imagenes_descartadas",
      imagenes_descartadas: deletedImages,
      motivo_descarte: motivo,
    });
  };

  const onCancelFeedbackSinImagenes = () => setShowFeedbackSinImagenes(false);
  const onCancelFeedbackDescarte = () => setShowFeedbackDescarte(false);

  // ── Descartar ejercicio ───────────────────────────────────
  const handleDiscardClick = () => {
    savePendingFeedback(exercise.id, "rechazo");
    setShowFeedbackRechazo(true);
  };

  const onConfirmRechazo = async (motivo) => {
    clearPendingFeedback(exercise.id);
    setShowFeedbackRechazo(false);
    setDeleting(true); setError("");
    try {
      await saveFeedbackAndLink(exercise.id, {
        tipo: "rechazado",
        motivo_rechazo: motivo,
        pregunta: exercise.pregunta || "",
        respuesta: exercise.rta_correcta || "",
      });
      await deleteExercise(exercise.id, terapia);
      clearDeletedImages(exercise.id);
      onClose(true);
    } catch (err) {
      console.error("Error en onConfirmRechazo:", err);
      setError("No se pudo descartar el ejercicio. Verifica tu conexión e inténtalo de nuevo.");
      setDeleting(false);
    }
  };

  const onCancelFeedbackRechazo = () => {
    clearPendingFeedback(exercise.id);
    setShowFeedbackRechazo(false);
  };

  // ── Cerrar ────────────────────────────────────────────────
  const handleClose = () => {
    if (approving || deleting) return;
    if (showFeedbackSinImagenes || showFeedbackDescarte || showFeedbackRechazo) return;
    onClose(false);
  };

  if (!open) return null;

  const totalImagenes = Object.keys(imagenes).length;
  const hayImagenes = totalImagenes > 0;

  return (
    <>
      <ImagePreview img={previewImg} onClose={() => setPreviewImg(null)} />

      {showFeedbackSinImagenes && (
        <FeedbackSinImagenesModal
          onConfirm={onConfirmSinImagenes}
          onCancel={onCancelFeedbackSinImagenes}
          loading={approving}
        />
      )}
      {showFeedbackDescarte && (
        <FeedbackImagenesDescartadasModal
          imagenesDescartadas={deletedImages}
          onConfirm={onConfirmDescarte}
          onCancel={onCancelFeedbackDescarte}
          loading={approving}
        />
      )}
      {showFeedbackRechazo && (
        <FeedbackRechazoModal
          onConfirm={onConfirmRechazo}
          onCancel={onCancelFeedbackRechazo}
          loading={deleting}
        />
      )}

      {/* Modal principal */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        onClick={handleClose}
      >
        <div
          style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "720px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px 16px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", borderRadius: "20px 20px 0 0", zIndex: 1 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>Revisión de imágenes</h4>
              <span style={{ fontSize: "12px", color: "#aaa", fontFamily: "monospace" }}>{exercise?.id} · {terapia}</span>
            </div>
            <button onClick={handleClose} style={{ background: "#f5f5f5", border: "none", borderRadius: "50%", width: "34px", height: "34px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
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

            {/* ── Panel de feedback (solo si ya aprobado) ─────────── */}
            {yaAprobado && (
              loadingFeedback ? (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="spinner-border spinner-border-sm text-secondary" />
                  <span style={{ fontSize: "13px", color: "#888" }}>Cargando detalles del feedback…</span>
                </div>
              ) : feedbackGuardado ? (
                <FeedbackAprobadoPanel feedback={feedbackGuardado} />
              ) : (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "12px 16px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "13px", color: "#aaa" }}>No hay información de feedback registrada para este ejercicio.</span>
                </div>
              )
            )}

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
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "14px" }}>
                      <span style={{ fontSize: "13px", color: "#888" }}>
                        {totalImagenes} imagen{totalImagenes !== 1 ? "es" : ""} generada{totalImagenes !== 1 ? "s" : ""}
                        {deletedImages.length > 0 && (
                          <span style={{ marginLeft: "8px", background: "#fff7f2", border: "1px solid #f48a63", borderRadius: "20px", padding: "2px 10px", fontSize: "11px", color: "#f48a63", fontWeight: 600 }}>
                            {deletedImages.length} descartada{deletedImages.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                      {Object.entries(imagenes).map(([slot, img]) => (
                        <div key={slot} style={{ border: "1px solid #eee", borderRadius: "12px", overflow: "hidden", position: "relative", background: "#fafafa", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                          <img src={img.url} alt={img.word} onClick={() => setPreviewImg(img)}
                            style={{ width: "100%", height: "120px", objectFit: "contain", padding: "10px", display: "block", cursor: "pointer" }} />
                          <div style={{ padding: "8px", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#333", textAlign: "center", marginBottom: "3px" }}>{img.word}</div>
                            <div style={{ fontSize: "11px", color: "#888", textAlign: "center", fontWeight: 500 }}>{slotToLabel(slot)}</div>
                          </div>
                          {!yaAprobado && (
                            <button onClick={() => handleDeleteImage(slot, img)} disabled={deletingKey === img.key} title="Borrar imagen"
                              style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(220,53,69,0.85)", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: deletingKey === img.key ? "not-allowed" : "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                              {deletingKey === img.key
                                ? <span className="spinner-border spinner-border-sm" style={{ width: "10px", height: "10px" }} />
                                : <FaTrash size={9} />}
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
              <button onClick={handleDiscardClick} disabled={deleting || approving}
                style={{ background: "#fff", border: "1.5px solid #dc3545", color: "#dc3545", borderRadius: "10px", padding: "10px 20px", cursor: deleting || approving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", opacity: deleting || approving ? 0.6 : 1 }}>
                <FaBan size={13} /> {deleting ? "Eliminando..." : "Descartar ejercicio"}
              </button>
              <button onClick={handleApproveClick} disabled={approving || deleting}
                style={{ background: "#28a745", border: "none", color: "white", borderRadius: "10px", padding: "10px 24px", cursor: approving || deleting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", opacity: approving ? 0.7 : 1 }}>
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