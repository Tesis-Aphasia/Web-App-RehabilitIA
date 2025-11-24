import React, { useState } from "react";
import { getPatientById } from "../../services/patientService";
import { personalizeExercise } from "../../services/exercisesService";
import "./PacientePersonalizar.css";

const PacientePersonalizar = ({ open, onClose, pacienteId }) => {
  const [baseExerciseId, setBaseExerciseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) return null;

  const handlePersonalizeExercise = async () => {
    if (!baseExerciseId.trim()) {
      setMessage("⚠️ Ingresa el ID base del ejercicio para personalizar.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const patientData = await getPatientById(pacienteId);
      if (!patientData)
        throw new Error("No se encontró el perfil del paciente.");

      const terapeutaEmail = localStorage.getItem("terapeutaEmail");
      const result = await personalizeExercise(
        pacienteId,
        baseExerciseId,
        patientData,
        terapeutaEmail
      );

      if (result.ok || result.id) {
        setMessage("✅ Ejercicio personalizado correctamente.");
        setBaseExerciseId("");
        setTimeout(() => onClose(true), 1500);
      } else {
        setMessage(`❌ Error: ${result.error || "No se pudo personalizar"}`);
      }
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="personalizar-overlay">
      <div className="personalizar-modal">
        <header className="personalizar-header">
          <h4>✨ Crear Ejercicio Personalizado</h4>
          <button className="close-btn" onClick={() => onClose(false)}>
            ✕
          </button>
        </header>

        <main className="personalizar-body">
          <p className="small text-muted mb-3">
            Ingresa el <strong>ID base</strong> de un ejercicio para generar una versión adaptada al paciente.
            Recuerda que para la personalización se usan los datos del perfil del paciente.
          </p>

          <label>ID del ejercicio base</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ej: ejercicio_base_123"
            value={baseExerciseId}
            onChange={(e) => setBaseExerciseId(e.target.value)}
            disabled={loading}
          />

          {message && (
            <div
              className={`alert mt-3 ${
                message.startsWith("✅") ? "alert-success" : "alert-error"
              }`}
            >
              {message}
            </div>
          )}
        </main>

        <footer className="personalizar-footer">
          <button
            className="btn-cancel"
            onClick={() => onClose(false)}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handlePersonalizeExercise}
            disabled={loading}
          >
            {loading ? "Creando..." : "Personalizar"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PacientePersonalizar;
