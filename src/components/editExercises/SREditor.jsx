import React, { useEffect, useState } from "react";
import {
  updateExercise,
  getExerciseDetails,
  updateExerciseSR,
} from "../../services/exercisesService";
import { FaSave, FaTimes, FaCheckCircle, FaLock } from "react-icons/fa";
import "./SREditor.css";

const SREditor = ({ open, onClose, exercise }) => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [success, setSuccess] = useState(false);
  const [yaRevisado, setYaRevisado] = useState(false); // 🔒 bloqueado si ya estaba revisado

  // 🔹 Cargar detalles SR
  useEffect(() => {
    if (!exercise) return;

    const loadDetails = async () => {
      try {
        setLoading(true);
        const data = await getExerciseDetails(exercise.id, "SR");
        const extra =
          Array.isArray(data) && data.length > 0 ? data[0] : data || {};

        const revisadoOriginal = Boolean(exercise.revisado);
        setYaRevisado(revisadoOriginal); // 🔒 guarda el estado original

        setForm({
          pregunta: extra.pregunta || "",
          rta_correcta: extra.rta_correcta || "",
          revisado: revisadoOriginal,
        });
      } catch (err) {
        setError("No se pudo cargar el ejercicio.");
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [exercise]);

  // 🔹 Guardar cambios
  const handleSave = async () => {
    if (!exercise || !form || yaRevisado) return; // 🔒 no guarda si ya estaba revisado
    setError("");
    setSaving(true);
    setSuccess(false);

    try {
      await updateExerciseSR(exercise.id, {
        pregunta: form.pregunta.trim(),
        rta_correcta: form.rta_correcta.trim(),
      });

      await updateExercise(exercise.id, {
        revisado: Boolean(form.revisado),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose(true);
      }, 1500);
    } catch (e) {
      setError(e?.message || "Error al guardar el ejercicio.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="sr-overlay" onClick={() => !saving && onClose(false)}>
      <div
        className="sr-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* === HEADER === */}
        <header className="sr-header">
          <h4>🧠 Editar Ejercicio SR</h4>
          <button
            className="sr-close-btn"
            onClick={() => !saving && onClose(false)}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </header>

        {/* === BODY === */}
        <div className="sr-body">
          {loading || !form ? (
            <div className="sr-loading">
              <div className="spinner-border" role="status"></div>
              <p className="mt-3 fw-semibold text-muted">
                Cargando datos del ejercicio...
              </p>
            </div>
          ) : (
            <>
              {/* === BANNER DE BLOQUEADO === */}
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
              <section className="sr-section">
                <div className="review-toggle-container">
                  <div className="review-info">
                    <h5 className="review-title">
                      {form.revisado ? '✅ Ejercicio Revisado' : '⏳ Pendiente de Revisión'}
                    </h5>
                    <p className="review-description">
                      {form.revisado
                        ? 'Este ejercicio ha sido revisado y está listo para usar'
                        : 'Marca este ejercicio como revisado cuando hayas verificado su contenido'
                      }
                    </p>
                  </div>
                  {/* 🔒 Toggle deshabilitado si ya estaba revisado */}
                  <button
                    className={`toggle-switch ${form.revisado ? 'active' : ''}`}
                    onClick={() => {
                      if (yaRevisado) return;
                      setForm((p) => ({ ...p, revisado: !p.revisado }));
                    }}
                    type="button"
                    aria-label="Toggle revision status"
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

              {/* Información contextual */}
              <section className="sr-section">
                <h5 className="section-title">📊 Información del Ejercicio</h5>
                <div className="sr-info-grid">
                  <div className="info-item">
                    <span className="info-label">ID:</span>
                    <span className="info-value">{exercise.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Paciente:</span>
                    <span className="info-value">{exercise.pacienteEmail || "—"}</span>
                  </div>
                </div>
              </section>

              {/* Formulario principal */}
              <section className="sr-section">
                <h5 className="section-title">📝 Contenido del Ejercicio</h5>
                <div className="sr-form">
                  <div className="form-group">
                    <label>Pregunta</label>
                    {/* 🔒 Input deshabilitado si ya estaba revisado */}
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Escribe la pregunta del ejercicio"
                      value={form.pregunta}
                      disabled={yaRevisado}
                      onChange={(e) =>
                        !yaRevisado && setForm((p) => ({ ...p, pregunta: e.target.value }))
                      }
                      style={{ cursor: yaRevisado ? 'not-allowed' : 'text' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Respuesta correcta</label>
                    {/* 🔒 Input deshabilitado si ya estaba revisado */}
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Escribe la respuesta esperada"
                      value={form.rta_correcta}
                      disabled={yaRevisado}
                      onChange={(e) =>
                        !yaRevisado && setForm((p) => ({
                          ...p,
                          rta_correcta: e.target.value,
                        }))
                      }
                      style={{ cursor: yaRevisado ? 'not-allowed' : 'text' }}
                    />
                  </div>

                  {error && <div className="alert-danger mt-2">{error}</div>}
                  {success && (
                    <div className="alert-success mt-2">
                      <FaCheckCircle className="me-2" /> Guardado correctamente
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* === FOOTER === */}
        {!loading && (
          <footer className="sr-footer">
            <button
              className="btn-light"
              onClick={() => onClose(false)}
              disabled={saving}
            >
              {yaRevisado ? 'Cerrar' : 'Cancelar'}
            </button>
            {/* 🔒 Botón guardar oculto si ya estaba revisado */}
            {!yaRevisado && (
              <button
                className="btn-primary d-flex align-items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <FaSave /> Guardar cambios
                  </>
                )}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};

export default SREditor;