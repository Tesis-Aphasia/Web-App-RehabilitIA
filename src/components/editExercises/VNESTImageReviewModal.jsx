import React, { useEffect, useState } from "react";
import {
  getExerciseDetails,
  deleteExerciseImage,
  approveExercise,
  generateExerciseImages,
  deleteExercise,
} from "../../services/exercisesService";
import {
  collection, addDoc, doc, updateDoc,
  getDocs, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  FaTimes, FaTrash, FaCheck, FaBan, FaLock,
  FaChevronDown, FaChevronRight, FaImage,
  FaCheckCircle, FaTimesCircle,
} from "react-icons/fa";

const BASE_URL = "http://localhost:8000";

// ─────────────────────────────────────────────────────────────
//  Feedback VNEST — Firestore
// ─────────────────────────────────────────────────────────────
async function saveFeedbackAndLinkVnest(exerciseId, feedbackData) {
  const docRef = await addDoc(collection(db, "feedbacks_vnest"), {
    exercise_id: exerciseId,
    creado_en: serverTimestamp(),
    ...feedbackData,
  });
  await updateDoc(doc(db, "ejercicios_VNEST", exerciseId), { feedback: docRef.id });
  await updateDoc(doc(db, "ejercicios", exerciseId),       { feedback: docRef.id });
  return docRef.id;
}

async function getFeedbackVnest(exerciseId) {
  const q    = query(collection(db, "feedbacks_vnest"), where("exercise_id", "==", exerciseId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.creado_en?.toMillis?.() ?? 0) - (a.creado_en?.toMillis?.() ?? 0));
  return docs[0];
}

// ─────────────────────────────────────────────────────────────
//  Generar imagen individual
// ─────────────────────────────────────────────────────────────
async function generateSingleImageApi(exerciseId, slot, word, tipo) {
  const res = await fetch(`${BASE_URL}/images/generate-single`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ exercise_id: exerciseId, terapia: "VNEST", slot, word, tipo }),
  });
  return res.json();
}

const inferTipo = (slot) => {
  if (slot === "verbo")          return "verbo";
  if (slot.includes("sujeto"))  return "sujeto";
  if (slot.includes("objeto"))  return "objeto";
  if (slot.includes("donde"))   return "donde";
  if (slot.includes("cuando"))  return "objeto";
  if (slot.includes("por_que")) return "sujeto";
  return "objeto";
};

// ─────────────────────────────────────────────────────────────
//  Matching semántico estricto: solo asigna imagen si hay
//  coincidencia real de palabras. Sin match → null (sin imagen).
//  Cada imagen solo se usa UNA vez (Set de usados).
// ─────────────────────────────────────────────────────────────
const matchImgsToOpciones = (imagenes, slots, opciones) => {
  const disponibles = slots
    .map(s => imagenes[s] ? { slot: s, img: imagenes[s] } : null)
    .filter(Boolean);

  const usados = new Set();

  return opciones.map((op) => {
    const opWords = op.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    const match = disponibles.find(({ slot, img }) => {
      if (usados.has(slot)) return false;
      const imgWord = img.word.toLowerCase();
      const imgWords = imgWord.split(/\s+/).filter(w => w.length > 3);
      const opContainsImg = op.toLowerCase().includes(imgWord);
      const imgWordInOp = imgWords.some(w => op.toLowerCase().includes(w));
      const opWordInImg = opWords.some(w => imgWord.includes(w));
      return opContainsImg || imgWordInOp || opWordInImg;
    });

    if (match) {
      usados.add(match.slot);
      return { op, img: match.img, slot: match.slot };
    }

    return { op, img: null, slot: null };
  });
};

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
  "Ejercicio mal formulado",
  "Pares incorrectos o ambiguos",
  "No es apropiado para el paciente",
  "Contenido duplicado",
  "Error en las imágenes generadas",
  "Otro",
];

// ─────────────────────────────────────────────────────────────
//  localStorage helpers
// ─────────────────────────────────────────────────────────────
const S_PRE = "vnestReview_deleted_";
const P_PRE = "vnestReview_pendingFeedback_";
const loadDeletedImages    = (id) => { try { const r = localStorage.getItem(`${S_PRE}${id}`); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveDeletedImages    = (id, imgs) => { try { localStorage.setItem(`${S_PRE}${id}`, JSON.stringify(imgs)); } catch (_) {} };
const clearDeletedImages   = (id) => { try { localStorage.removeItem(`${S_PRE}${id}`); } catch (_) {} };
const savePendingFeedback  = (id, tipo) => { try { localStorage.setItem(`${P_PRE}${id}`, JSON.stringify({ tipo })); } catch (_) {} };
const clearPendingFeedback = (id) => { try { localStorage.removeItem(`${P_PRE}${id}`); } catch (_) {} };
const loadPendingFeedback  = (id) => { try { const r = localStorage.getItem(`${P_PRE}${id}`); return r ? JSON.parse(r) : null; } catch { return null; } };

// ─────────────────────────────────────────────────────────────
//  Select estilizado
// ─────────────────────────────────────────────────────────────
const StyledSelect = ({ value, onChange, options, placeholder }) => (
  <div style={{ position: "relative" }}>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", appearance: "none", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "11px 40px 11px 14px", fontSize: "14px", color: value ? "#1a1a1a" : "#9ca3af", cursor: "pointer", outline: "none" }}>
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <FaChevronDown size={11} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
  </div>
);

// ─────────────────────────────────────────────────────────────
//  Preview imagen ampliada
// ─────────────────────────────────────────────────────────────
const ImagePreview = ({ img, onClose }) => {
  if (!img) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "24px", maxWidth: "400px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }} onClick={(e) => e.stopPropagation()}>
        <img src={img.url} alt={img.word} style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "12px" }} />
        <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#333" }}>{img.word}</p>
        <button onClick={onClose} style={{ background: "#fff7f2", border: "none", borderRadius: "10px", padding: "10px 28px", color: "#f48a63", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>Cerrar</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  Panel feedback (solo lectura)
// ─────────────────────────────────────────────────────────────
const FeedbackAprobadoPanel = ({ feedback }) => {
  if (!feedback) return null;
  const { tipo, motivo_sin_imagenes, motivo_descarte, imagenes_descartadas } = feedback;

  if (tipo === "aprobado") return (
    <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #86efac", borderRadius: "14px", padding: "16px 20px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <FaCheckCircle size={15} color="#16a34a" />
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#15803d" }}>Aprobado con todas sus imágenes</span>
      </div>
      <p style={{ margin: 0, fontSize: "13px", color: "#4ade80", fontWeight: 500 }}>El ejercicio fue aprobado sin eliminar ninguna imagen de apoyo.</p>
    </div>
  );

  if (tipo === "aprobado_sin_imagenes") return (
    <div style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1px solid #fcd34d", borderRadius: "14px", padding: "16px 20px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <FaImage size={14} color="#b45309" />
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#92400e" }}>Aprobado sin imágenes de apoyo</span>
      </div>
      <div style={{ display: "flex", gap: "8px", background: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "8px 12px" }}>
        <span style={{ fontSize: "12px", color: "#78350f", fontWeight: 600 }}>Motivo:</span>
        <span style={{ fontSize: "13px", color: "#92400e" }}>{motivo_sin_imagenes || "No especificado"}</span>
      </div>
    </div>
  );

  if (tipo === "aprobado_con_imagenes_descartadas") return (
    <div style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)", border: "1px solid #fdba74", borderRadius: "14px", padding: "16px 20px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <FaTimesCircle size={14} color="#c2410c" />
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#9a3412" }}>
          Aprobado con {imagenes_descartadas?.length || 0} imagen{imagenes_descartadas?.length !== 1 ? "es" : ""} descartada{imagenes_descartadas?.length !== 1 ? "s" : ""}
        </span>
      </div>
      {imagenes_descartadas?.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 600, color: "#78350f" }}>Palabras eliminadas:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {imagenes_descartadas.map((img, i) => (
              <span key={img.key || i} style={{ background: "#fff", border: "1.5px solid #fdba74", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 700, color: "#c2410c", display: "flex", alignItems: "center", gap: "5px" }}>
                <FaTimesCircle size={9} />{img.word}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: "8px", background: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "8px 12px" }}>
        <span style={{ fontSize: "12px", color: "#78350f", fontWeight: 600 }}>Motivo:</span>
        <span style={{ fontSize: "13px", color: "#9a3412" }}>{motivo_descarte || "No especificado"}</span>
      </div>
    </div>
  );

  return null;
};

// ─────────────────────────────────────────────────────────────
//  Modales de feedback
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
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, background: "#f5f5f5", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 600, color: "#555", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => motivo && onConfirm(motivo)} disabled={!motivo || loading}
            style={{ flex: 2, background: motivo ? "#28a745" : "#d1d5db", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: motivo ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : <><FaCheck size={12} /> Confirmar y aprobar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

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
            <span key={img.key} style={{ background: "#fff7f2", border: "1px solid #f48a63", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: 600, color: "#f48a63" }}>{img.word}</span>
          ))}
        </div>
        <StyledSelect value={motivo} onChange={setMotivo} options={MOTIVOS_DESCARTE_IMAGEN} placeholder="Selecciona un motivo…" />
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, background: "#f5f5f5", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 600, color: "#555", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => motivo && onConfirm(motivo)} disabled={!motivo || loading}
            style={{ flex: 2, background: motivo ? "#28a745" : "#d1d5db", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 700, color: "#fff", cursor: motivo ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading ? <span className="spinner-border spinner-border-sm" /> : <><FaCheck size={12} /> Confirmar y aprobar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const FeedbackRechazoModal = ({ onConfirm, onCancel, loading }) => {
  const [motivo, setMotivo] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "28px", maxWidth: "440px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <h5 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Motivo de rechazo</h5>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#888" }}>¿Por qué se descarta este ejercicio?</p>
        <StyledSelect value={motivo} onChange={setMotivo} options={MOTIVOS_RECHAZO} placeholder="Selecciona un motivo…" />
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onCancel} disabled={loading} style={{ flex: 1, background: "#f5f5f5", border: "none", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 600, color: "#555", cursor: "pointer" }}>Cancelar</button>
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
//  Componentes de UI
// ─────────────────────────────────────────────────────────────
const getImgBySlot = (imagenes, slot) => imagenes?.[slot] || null;

const ImageCard = ({ img, slot, word, yaAprobado, deletingKey, onDelete, onGenerate, generatingSlot, onPreview }) => {
  if (img) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#fafafa", borderRadius: "10px", padding: "8px 12px", border: "1px solid #eee" }}>
        <img src={img.url} alt={img.word} onClick={() => onPreview(img)}
          style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "8px", background: "#fff", padding: "4px", cursor: "pointer" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#333" }}>
            {word || img.word}
          </div>
          {word && word !== img.word && (
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>
              imagen: {img.word}
            </div>
          )}
        </div>
        {!yaAprobado && (
          <button onClick={() => onDelete(slot, img)} disabled={deletingKey === img.key}
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
      {!yaAprobado && slot && (
        <button onClick={() => onGenerate(slot, word)} disabled={generatingSlot === slot}
          style={{ background: generatingSlot === slot ? "#ccc" : "#f48a63", border: "none", borderRadius: "8px", padding: "5px 10px", color: "white", fontSize: "11px", fontWeight: 600, cursor: generatingSlot === slot ? "not-allowed" : "pointer", flexShrink: 0 }}>
          {generatingSlot === slot ? "..." : "+ Generar"}
        </button>
      )}
    </div>
  );
};

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

// ─────────────────────────────────────────────────────────────
//  Helper: renderiza incorrectas de cuando/por_que
//  FIX: slots ahora empiezan en _1 (no en sin-número/_2)
//       slotParaGenerar usa siempre _${j+1}
// ─────────────────────────────────────────────────────────────
const IncorrectasSection = ({ imagenes, parIdx, pregunta, opciones, opcionCorrecta, cardProps }) => {
  const incorrectas = opciones?.filter(op => op !== opcionCorrecta) || [];

  // ✅ FIX: antes generaba _incorrecta (sin número) y luego _2, _3...
  //         En Firestore los slots son _incorrecta_1, _incorrecta_2, etc.
  const slots = Array.from({ length: 6 }, (_, k) =>
    `pares_${parIdx}_${pregunta}_incorrecta_${k + 1}`
  );

  const asignadas = matchImgsToOpciones(imagenes, slots, incorrectas);

  return (
    <div style={{ marginTop: "4px" }}>
      <div style={{ fontSize: "11px", color: "#ccc", marginBottom: "2px" }}>Otras opciones:</div>
      {asignadas.map(({ op, img, slot }, j) => {
        // ✅ FIX: siempre _${j+1}, nunca el caso especial sin número
        const slotParaGenerar = slot || `pares_${parIdx}_${pregunta}_incorrecta_${j + 1}`;
        return (
          <div key={j}>
            <ImageCard
              img={img}
              slot={slotParaGenerar}
              word={op}
              {...cardProps}
            />
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  MODAL PRINCIPAL
// ─────────────────────────────────────────────────────────────
const VNESTImageReviewModal = ({ open, onClose, exercise }) => {
  const [imagenes, setImagenes]             = useState({});
  const [pares, setPares]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [aprobado, setAprobado]             = useState(false);
  const [deletingKey, setDeletingKey]       = useState(null);
  const [approving, setApproving]           = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [generating, setGenerating]         = useState(false);
  const [generatingSlot, setGeneratingSlot] = useState(null);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const [previewImg, setPreviewImg]         = useState(null);
  const [feedbackGuardado, setFeedbackGuardado]               = useState(null);
  const [loadingFeedback, setLoadingFeedback]                 = useState(false);
  const [showFeedbackSinImagenes, setShowFeedbackSinImagenes] = useState(false);
  const [showFeedbackDescarte, setShowFeedbackDescarte]       = useState(false);
  const [showFeedbackRechazo, setShowFeedbackRechazo]         = useState(false);
  const [deletedImages, setDeletedImages]                     = useState([]);

  const yaAprobado = Boolean(aprobado);

  useEffect(() => {
    if (!exercise || !open) return;

    setApproving(false); setDeleting(false); setGenerating(false);
    setDeletingKey(null); setError(""); setSuccess(""); setPreviewImg(null);
    setShowFeedbackSinImagenes(false); setShowFeedbackDescarte(false);
    setShowFeedbackRechazo(false); setFeedbackGuardado(null);
    setDeletedImages(loadDeletedImages(exercise.id));

    const pending = loadPendingFeedback(exercise.id);
    if (pending?.tipo === "sin_imagenes") setShowFeedbackSinImagenes(true);
    else if (pending?.tipo === "descarte") setShowFeedbackDescarte(true);
    else if (pending?.tipo === "rechazo")  setShowFeedbackRechazo(true);

    const load = async () => {
      try {
        setLoading(true);
        const data  = await getExerciseDetails(exercise.id, "VNEST");
        const extra = Array.isArray(data) ? data[0] : data || {};
        setImagenes(extra.imagenes || {});
        setAprobado(extra.aprobado || false);
        setPares(extra.pares || []);

        if (extra.aprobado) {
          setLoadingFeedback(true);
          getFeedbackVnest(exercise.id)
            .then((fb) => setFeedbackGuardado(fb || null))
            .catch(() => setFeedbackGuardado(null))
            .finally(() => setLoadingFeedback(false));
        }
      } catch {
        setError("No se pudieron cargar las imágenes.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [exercise?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteImage = async (slot, img) => {
    if (yaAprobado) return;
    setDeletingKey(img.key); setError("");
    try {
      await deleteExerciseImage(img.key, exercise.id, "VNEST");
      const updated = [...deletedImages, { key: img.key, word: img.word }];
      setDeletedImages(updated);
      saveDeletedImages(exercise.id, updated);
      setImagenes((prev) => { const u = { ...prev }; delete u[slot]; return u; });
    } catch {
      setError("No se pudo borrar la imagen. Verifica que el servidor esté activo.");
    } finally {
      setDeletingKey(null);
    }
  };

  const handleGenerateAll = async () => {
    if (yaAprobado) return;
    setGenerating(true); setError(""); setSuccess("");
    try {
      const result = await generateExerciseImages(exercise.id, "VNEST");
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

  const handleGenerateSingle = async (slot, word) => {
    setGeneratingSlot(slot); setError("");
    try {
      const result = await generateSingleImageApi(exercise.id, slot, word, inferTipo(slot));
      if (result.ok) {
        setImagenes((prev) => ({ ...prev, [slot]: result.imagen }));
        setSuccess(`✅ Imagen generada: "${word}"`);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || `No se pudo generar la imagen de "${word}".`);
      }
    } catch {
      setError("Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setGeneratingSlot(null);
    }
  };

  const handleApproveClick = () => {
    if (!Object.keys(imagenes).length) {
      savePendingFeedback(exercise.id, "sin_imagenes");
      setShowFeedbackSinImagenes(true);
    } else if (deletedImages.length > 0) {
      savePendingFeedback(exercise.id, "descarte");
      setShowFeedbackDescarte(true);
    } else {
      executeApprove({ tipo: "aprobado" });
    }
  };

  const executeApprove = async (feedbackData) => {
    setApproving(true); setError("");
    try {
      await saveFeedbackAndLinkVnest(exercise.id, {
        ...feedbackData,
        verbo:    exercise.verbo    || "",
        contexto: exercise.contexto || "",
      });
      await approveExercise(exercise.id, "VNEST");
      clearDeletedImages(exercise.id);
      clearPendingFeedback(exercise.id);
      setSuccess("✅ Ejercicio aprobado correctamente");
      setTimeout(() => onClose(true), 1500);
    } catch (err) {
      console.error("executeApprove:", err);
      setError("No se pudo aprobar el ejercicio. Verifica tu conexión e inténtalo de nuevo.");
      setApproving(false);
    }
  };

  const onConfirmSinImagenes = (motivo) => {
    clearPendingFeedback(exercise.id); setShowFeedbackSinImagenes(false);
    executeApprove({ tipo: "aprobado_sin_imagenes", motivo_sin_imagenes: motivo });
  };
  const onConfirmDescarte = (motivo) => {
    clearPendingFeedback(exercise.id); setShowFeedbackDescarte(false);
    executeApprove({ tipo: "aprobado_con_imagenes_descartadas", imagenes_descartadas: deletedImages, motivo_descarte: motivo });
  };

  const handleDiscardClick = () => {
    savePendingFeedback(exercise.id, "rechazo");
    setShowFeedbackRechazo(true);
  };
  const onConfirmRechazo = async (motivo) => {
    clearPendingFeedback(exercise.id); setShowFeedbackRechazo(false);
    setDeleting(true); setError("");
    try {
      await saveFeedbackAndLinkVnest(exercise.id, {
        tipo: "rechazado", motivo_rechazo: motivo,
        verbo: exercise.verbo || "", contexto: exercise.contexto || "",
      });
      await deleteExercise(exercise.id, "VNEST");
      clearDeletedImages(exercise.id);
      onClose(true);
    } catch (err) {
      console.error("onConfirmRechazo:", err);
      setError("No se pudo descartar el ejercicio. Verifica tu conexión e inténtalo de nuevo.");
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (approving || deleting) return;
    if (showFeedbackSinImagenes || showFeedbackDescarte || showFeedbackRechazo) return;
    onClose(false);
  };

  if (!open) return null;

  const totalImagenes = Object.keys(imagenes).length;
  const hayImagenes   = totalImagenes > 0;
  const verboImg      = getImgBySlot(imagenes, "verbo");
  const cardProps     = { yaAprobado, deletingKey, onDelete: handleDeleteImage, onGenerate: handleGenerateSingle, generatingSlot, onPreview: setPreviewImg };

  return (
    <>
      <ImagePreview img={previewImg} onClose={() => setPreviewImg(null)} />

      {showFeedbackSinImagenes && <FeedbackSinImagenesModal onConfirm={onConfirmSinImagenes} onCancel={() => setShowFeedbackSinImagenes(false)} loading={approving} />}
      {showFeedbackDescarte    && <FeedbackImagenesDescartadasModal imagenesDescartadas={deletedImages} onConfirm={onConfirmDescarte} onCancel={() => setShowFeedbackDescarte(false)} loading={approving} />}
      {showFeedbackRechazo     && <FeedbackRechazoModal onConfirm={onConfirmRechazo} onCancel={() => { clearPendingFeedback(exercise.id); setShowFeedbackRechazo(false); }} loading={deleting} />}

      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={handleClose}>
        <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "740px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>

          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px 16px", borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, background: "#fff", borderRadius: "20px 20px 0 0", zIndex: 1 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>Revisión de imágenes · VNeST</h4>
              <span style={{ fontSize: "12px", color: "#aaa", fontFamily: "monospace" }}>{exercise?.id}</span>
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
                <p style={{ margin: 0, fontSize: "12px", color: "#888", marginTop: "2px" }}>{yaAprobado ? "Este ejercicio está disponible para los pacientes" : "Genera las imágenes y aprueba el ejercicio cuando esté listo"}</p>
              </div>
              <div style={{ width: "52px", height: "28px", background: yaAprobado ? "#22c55e" : "#d1d5db", borderRadius: "999px", position: "relative", cursor: "not-allowed", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: "22px", height: "22px", background: "#fff", borderRadius: "50%", position: "absolute", top: "3px", left: yaAprobado ? "27px" : "3px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

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
              <strong>Verbo:</strong> {exercise?.verbo || "—"} &nbsp;·&nbsp; <strong>Contexto:</strong> {exercise?.contexto || "—"}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div className="spinner-border text-warning" role="status" />
                <p style={{ marginTop: "12px", color: "#aaa", fontSize: "14px" }}>Cargando imágenes...</p>
              </div>
            ) : (
              <>
                {!hayImagenes && (
                  <div style={{ textAlign: "center", padding: "36px 0", color: "#999", marginBottom: "8px" }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px" }}>🖼️</div>
                    <p style={{ marginBottom: "16px", fontSize: "15px" }}>No hay imágenes generadas para este ejercicio.</p>
                    {!yaAprobado && (
                      <button onClick={handleGenerateAll} disabled={generating}
                        style={{ background: generating ? "#ccc" : "#f48a63", color: "white", border: "none", borderRadius: "10px", padding: "11px 24px", cursor: generating ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "14px", opacity: generating ? 0.7 : 1 }}>
                        {generating ? <><span className="spinner-border spinner-border-sm me-2" />Generando...</> : "Generar imágenes"}
                      </button>
                    )}
                  </div>
                )}

                {hayImagenes && (
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

                    {/* VERBO */}
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

                                {/* DÓNDE */}
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

                                {/* CUÁNDO */}
                                {exp.cuando && (
                                  <Collapsible title={`⏰ Cuándo — correcta: "${exp.cuando.opcion_correcta}"`} accent="#888">
                                    <div>
                                      <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, marginBottom: "4px" }}>✅ Correcta</div>
                                      <ImageCard img={getImgBySlot(imagenes, `pares_${i}_cuando_correcta`)} slot={`pares_${i}_cuando_correcta`} word={exp.cuando.opcion_correcta} {...cardProps} />
                                    </div>
                                    <IncorrectasSection
                                      imagenes={imagenes}
                                      parIdx={i}
                                      pregunta="cuando"
                                      opciones={exp.cuando.opciones}
                                      opcionCorrecta={exp.cuando.opcion_correcta}
                                      cardProps={cardProps}
                                    />
                                  </Collapsible>
                                )}

                                {/* POR QUÉ */}
                                {exp.por_que && (
                                  <Collapsible title={`💡 Por qué — correcta: "${exp.por_que.opcion_correcta}"`} accent="#888">
                                    <div>
                                      <div style={{ fontSize: "11px", color: "#aaa", fontWeight: 600, marginBottom: "4px" }}>✅ Correcta</div>
                                      <ImageCard img={getImgBySlot(imagenes, `pares_${i}_por_que_correcta`)} slot={`pares_${i}_por_que_correcta`} word={exp.por_que.opcion_correcta} {...cardProps} />
                                    </div>
                                    <IncorrectasSection
                                      imagenes={imagenes}
                                      parIdx={i}
                                      pregunta="por_que"
                                      opciones={exp.por_que.opciones}
                                      opcionCorrecta={exp.por_que.opcion_correcta}
                                      cardProps={cardProps}
                                    />
                                  </Collapsible>
                                )}

                              </Collapsible>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                )}

                {error   && <div className="alert alert-danger mt-3"  style={{ borderRadius: "10px", fontSize: "14px" }}>{error}</div>}
                {success && <div className="alert alert-success mt-3" style={{ borderRadius: "10px", fontSize: "14px" }}>{success}</div>}
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

export default VNESTImageReviewModal;