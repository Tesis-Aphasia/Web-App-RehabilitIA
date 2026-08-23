import React, { useEffect, useState } from "react";
import {
  getExerciseDetails,
  updateExercise,
} from "../../services/exercisesService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { FaSave, FaTimes, FaCheckCircle, FaLock } from "react-icons/fa";
import "./VNESTEditor.css";

const NIVELES = ["fácil", "medio", "difícil"];

const VNESTEditor = ({ open, onClose, exercise }) => {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [yaRevisado, setYaRevisado] = useState(false); // 🔒 bloqueado si ya estaba revisado

  useEffect(() => {
    if (!exercise) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getExerciseDetails(exercise.id, "VNEST");
        const extra =
          Array.isArray(data) && data.length > 0 ? data[0] : data || {};

        const revisadoOriginal = Boolean(exercise.revisado);
        setYaRevisado(revisadoOriginal); // 🔒 guarda estado original

        setForm({
          verbo: extra.verbo || "",
          nivel: extra.nivel || "fácil",
          contexto: extra.contexto || "",
          revisado: revisadoOriginal,
          pares: extra.pares || [],
          oraciones: extra.oraciones || [],
        });
      } catch (err) {
        setError("No se pudo cargar el ejercicio.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [exercise]);

  const handleParChange = (idx, key, value) => {
    if (yaRevisado) return;
    setForm((prev) => {
      const pares = [...prev.pares];
      pares[idx][key] = value;
      return { ...prev, pares };
    });
  };

  const handleExpChange = (idx, grupo, i, val) => {
    if (yaRevisado) return;
    setForm((prev) => {
      const pares = [...prev.pares];
      pares[idx].expansiones[grupo].opciones[i] = val;
      return { ...prev, pares };
    });
  };

  const handleOracionChange = (idx, key, val) => {
    if (yaRevisado) return;
    setForm((prev) => {
      const oraciones = [...prev.oraciones];
      oraciones[idx][key] = val;
      return { ...prev, oraciones };
    });
  };

  const handleSave = async () => {
    if (!exercise || !form || yaRevisado) return; // 🔒 no guarda si ya estaba revisado
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const ref = doc(db, "ejercicios_VNEST", exercise.id);
      await updateDoc(ref, {
        verbo: form.verbo.trim(),
        nivel: form.nivel,
        contexto: form.contexto.trim(),
        pares: form.pares,
        oraciones: form.oraciones,
      });

      await updateExercise(exercise.id, { revisado: form.revisado });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose(true);
      }, 1500);
    } catch (err) {
      setError("No se pudo guardar el ejercicio.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="vnest-overlay" onClick={() => !saving && onClose(false)}>
      <div className="vnest-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="vnest-header">
          <h4>✏️ Editar Ejercicio VNeST</h4>
          <button className="vnest-close-btn" onClick={() => onClose(false)}>
            <FaTimes />
          </button>
        </header>

        {loading || !form ? (
          <div className="vnest-loading">
            <div className="spinner-border" role="status"></div>
            <p className="mt-3 fw-semibold text-muted">Cargando datos del ejercicio...</p>
          </div>
        ) : (
          <>
            <div className="vnest-body">

              {/* 🔒 BANNER BLOQUEADO */}
              {yaRevisado && (
                <div style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                  color: "#166534",
                }}>
                  <FaLock size={14} />
                  Este ejercicio ya fue revisado y no puede modificarse.
                </div>
              )}

              {/* === ESTADO DE REVISIÓN === */}
              <section className="vnest-section">
                <div className="review-toggle-container">
                  <div className="review-info">
                    <h5 className="review-title">
                      {form.revisado ? '✅ Ejercicio Revisado' : '⏳ Pendiente de Revisión'}
                    </h5>
                    <p className="review-description">
                      {form.revisado
                        ? 'Este ejercicio ha sido revisado y está listo para usar'
                        : 'Marca este ejercicio como revisado cuando hayas verificado su contenido'}
                    </p>
                  </div>
                  {/* 🔒 Toggle deshabilitado si ya estaba revisado */}
                  <button
                    className={`toggle-switch ${form.revisado ? 'active' : ''}`}
                    onClick={() => {
                      if (yaRevisado) return;
                      setForm({ ...form, revisado: !form.revisado });
                    }}
                    type="button"
                    disabled={yaRevisado}
                    style={{
                      opacity: yaRevisado ? 0.6 : 1,
                      cursor: yaRevisado ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      {form.revisado ? 'Revisado' : 'Pendiente'}
                    </span>
                  </button>
                </div>
              </section>

              {/* === CAMPOS PRINCIPALES === */}
              <section className="vnest-section main-fields">
                <h5 className="section-title">📝 Información Básica</h5>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label>Verbo</label>
                    <input
                      className="form-control"
                      value={form.verbo}
                      disabled={yaRevisado}
                      style={{ cursor: yaRevisado ? 'not-allowed' : 'text' }}
                      onChange={(e) =>
                        !yaRevisado && setForm({ ...form, verbo: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <label>Nivel</label>
                    <select
                      className="form-select"
                      value={form.nivel}
                      disabled={yaRevisado}
                      style={{ cursor: yaRevisado ? 'not-allowed' : 'pointer' }}
                      onChange={(e) =>
                        !yaRevisado && setForm({ ...form, nivel: e.target.value })
                      }
                    >
                      {NIVELES.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label>Contexto</label>
                    <input
                      className="form-control"
                      value={form.contexto}
                      disabled={yaRevisado}
                      style={{ cursor: yaRevisado ? 'not-allowed' : 'text' }}
                      onChange={(e) =>
                        !yaRevisado && setForm({ ...form, contexto: e.target.value })
                      }
                    />
                  </div>
                </div>
              </section>

              {/* === BLOQUE DE PARES === */}
              <section className="vnest-section mt-4">
                <h5 className="section-title">🔗 Pares Sujeto - Objeto</h5>
                {form.pares.map((p, idx) => (
                  <div key={idx} className="pair-card">
                    <div className="pair-header">
                      <strong>Par {idx + 1}</strong>
                    </div>
                    <div className="row g-3 mb-2">
                      <div className="col-md-6">
                        <label>Sujeto</label>
                        <input
                          className="form-control"
                          value={p.sujeto}
                          disabled={yaRevisado}
                          style={{ cursor: yaRevisado ? 'not-allowed' : 'text' }}
                          onChange={(e) => handleParChange(idx, "sujeto", e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label>Objeto</label>
                        <input
                          className="form-control"
                          value={p.objeto}
                          disabled={yaRevisado}
                          style={{ cursor: yaRevisado ? 'not-allowed' : 'text' }}
                          onChange={(e) => handleParChange(idx, "objeto", e.target.value)}
                        />
                      </div>
                    </div>

                    {["donde", "por_que", "cuando"].map((k) => (
                      <div key={k} className="expansion-block">
                        <label>{k.replace("_", " ").toUpperCase()}</label>
                        {p.expansiones?.[k]?.opciones?.map((opt, i) => (
                          <input
                            key={i}
                            className="form-control mb-1"
                            value={opt}
                            disabled={yaRevisado}
                            style={{ cursor: yaRevisado ? 'not-allowed' : 'text' }}
                            onChange={(e) => handleExpChange(idx, k, i, e.target.value)}
                          />
                        ))}
                        <small className="text-muted">
                          Correcta: <strong>{p.expansiones?.[k]?.opcion_correcta}</strong>
                        </small>
                      </div>
                    ))}
                  </div>
                ))}
              </section>

              {/* === BLOQUE DE ORACIONES === */}
              <section className="vnest-section mt-4">
                <h5 className="section-title">📄 Oraciones</h5>
                <div className="sentences-grid">
                  {form.oraciones.map((o, i) => (
                    <div key={i} className={`sentence-card ${o.correcta ? 'correct' : 'incorrect'}`}>
                      <div className="sentence-header">
                        <span className="sentence-number">#{i + 1}</span>
                        <button
                          type="button"
                          className={`correctness-badge ${o.correcta ? 'correct' : 'incorrect'}`}
                          disabled={yaRevisado}
                          style={{ cursor: yaRevisado ? 'not-allowed' : 'pointer', opacity: yaRevisado ? 0.6 : 1 }}
                          onClick={() => handleOracionChange(i, "correcta", !o.correcta)}
                        >
                          {o.correcta ? '✓ Correcta' : '✗ Incorrecta'}
                        </button>
                      </div>
                      <input
                        className="sentence-input"
                        value={o.oracion}
                        placeholder="Escribe la oración aquí..."
                        disabled={yaRevisado}
                        style={{ cursor: yaRevisado ? 'not-allowed' : 'text' }}
                        onChange={(e) => handleOracionChange(i, "oracion", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {error && <div className="alert alert-danger mt-3">{error}</div>}
              {success && (
                <div className="alert alert-success mt-3 d-flex align-items-center gap-2">
                  <FaCheckCircle /> Cambios guardados correctamente
                </div>
              )}
            </div>

            <footer className="vnest-footer">
              <button
                className="btn btn-light"
                onClick={() => onClose(false)}
                disabled={saving}
              >
                {yaRevisado ? 'Cerrar' : 'Cancelar'}
              </button>
              {/* 🔒 Botón guardar oculto si ya estaba revisado */}
              {!yaRevisado && (
                <button
                  className="btn btn-primary d-flex align-items-center gap-2"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      Guardando...
                    </>
                  ) : (
                    <><FaSave /> Guardar cambios</>
                  )}
                </button>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default VNESTEditor;