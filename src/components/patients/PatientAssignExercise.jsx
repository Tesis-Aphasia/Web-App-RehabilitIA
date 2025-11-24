import React, { useState } from "react";
import {
  getVisibleExercisesOnce,
  getExerciseDetails,
} from "../../services/exercisesService";
import { assignExerciseToPatient } from "../../services/patientService";
import VNESTExerciseModal from "../exercises/VNESTExerciseModal";
import SRExerciseModal from "../exercises/SRExerciseModal";
import "./PatientAssignExercise.css";

const PatientAssignExercise = ({ open, onClose, patientId }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showVnestViewer, setShowVnestViewer] = useState(false);
  const [showSRViewer, setShowSRViewer] = useState(false);

  if (!open) return null;
  const therapistEmail = localStorage.getItem("terapeutaEmail");

  // 🔎 Buscar ejercicios visibles y sus detalles
  const handleSearch = async () => {
    setResults([]);
    setSelectedExercise(null);
    setMessage("");

    if (!searchTerm.trim()) {
      setMessage("⚠️ Ingresa un texto o tipo de terapia para buscar.");
      return;
    }

    setLoading(true);
    try {
      const all = await getVisibleExercisesOnce(therapistEmail);
      const termLower = searchTerm.trim().toLowerCase();

      // 🔹 1️⃣ Búsqueda inicial por metadatos
      let filtered = all.filter((e) => {
        const text = `${e.id} ${e.tipo || ""} ${e.terapia || ""} ${e.pregunta || ""}`.toLowerCase();
        return text.includes(termLower);
      });

      // 🔹 2️⃣ Revisar detalles VNEST
      const vnestExercises = all.filter((e) => e.terapia === "VNEST");
      const detailedMatches = [];
      for (const ex of vnestExercises) {
        try {
          const extras = await getExerciseDetails(ex.id, "VNEST");
          const detail =
            Array.isArray(extras) && extras.length > 0 ? extras[0] : extras || {};
          const combined = `${detail.verbo || ""} ${detail.contexto || ""}`.toLowerCase();
          if (combined.includes(termLower)) {
            detailedMatches.push({ ...ex, ...detail });
          }
        } catch (err) {
        }
      }

      // 🔹 3️⃣ Revisar detalles SR
      const srExercises = all.filter((e) => e.terapia === "SR");
      for (const ex of srExercises) {
        try {
          const extras = await getExerciseDetails(ex.id, "SR");
          const detail =
            Array.isArray(extras) && extras.length > 0 ? extras[0] : extras || {};
          const combined = `${detail.pregunta || ""} ${detail.rta_correcta || ""}`.toLowerCase();
          if (combined.includes(termLower)) {
            detailedMatches.push({ ...ex, ...detail });
          }
        } catch (err) {
        }
      }

      // 🔹 4️⃣ Combinar resultados sin duplicar
      const combinedResults = [...filtered, ...detailedMatches].filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i
      );

      // 🔹 5️⃣ Enriquecer resultados
      const enrichedResults = await Promise.allSettled(
        combinedResults.map(async (e) => {
          try {
            const extras = await getExerciseDetails(e.id, e.terapia);
            const extra =
              Array.isArray(extras) && extras.length > 0 ? extras[0] : extras || {};
            return { ...e, ...extra };
          } catch (err) {
            return err;
          }
        })
      );

      const finalResults = enrichedResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      if (finalResults.length === 0) {
        setMessage("❌ No se encontraron ejercicios con ese criterio o permisos.");
      } else {
        setResults(finalResults);
      }
    } catch (err) {
      setMessage("❌ Error al buscar ejercicios.");
    } finally {
      setLoading(false);
    }
  };

  // 👁️ Ver detalles del ejercicio (abre modal)
  const handleViewDetails = async (exercise) => {
    setLoading(true);
    try {
      const extras = await getExerciseDetails(exercise.id, exercise.terapia);
      const extra =
        Array.isArray(extras) && extras.length > 0 ? extras[0] : extras || {};
      const full = { ...exercise, ...extra };
      setSelectedExercise(full);

      if (exercise.terapia === "VNEST") setShowVnestViewer(true);
      else if (exercise.terapia === "SR") setShowSRViewer(true);
    } catch (err) {
      setMessage("❌ Error al cargar detalles del ejercicio.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Asignar ejercicio
  const handleAssign = async (exercise) => {
    if (!exercise) return;
    setLoading(true);
    try {
      await assignExerciseToPatient(patientId, exercise.id);
      setMessage(`✅ Ejercicio asignado correctamente.`);
      setTimeout(() => onClose(true), 1500);
    } catch (err) {
      setMessage("❌ Error al asignar el ejercicio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assign-overlay">
      <div className="assign-modal">
        {/* HEADER */}
        <header className="assign-header">
          <h4>🧩 Asignar Ejercicio al Paciente</h4>
          <button className="close-btn" onClick={() => onClose(false)}>
            ✕
          </button>
        </header>

        <main className="assign-body">
          <p className="text-muted small mb-3">
            Busca un ejercicio por su <strong>verbo, contexto, pregunta o tipo de terapia</strong>.
          </p>

          {/* 🔍 Búsqueda */}
          <div className="search-row">
            <input
              type="text"
              className="form-control"
              placeholder="Ej: cocinar, Deportes, VNEST, Id de ejercicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {/* Mensaje */}
          {message && (
            <div
              className={`alert mt-3 ${
                message.startsWith("✅")
                  ? "alert-success"
                  : message.startsWith("⚠️")
                  ? "alert-warning"
                  : "alert-error"
              }`}
            >
              {message}
            </div>
          )}

          {/* Resultados */}
          {results.length > 0 && (
            <div className="results-list mt-3">
              {results.map((e) => (
                <div key={e.id} className="exercise-result">
                  <div>
                    <strong>{e.terapia}</strong> – {e.verbo || e.pregunta || e.contexto || "Sin descripción"}
                    <br />
                    <small className="text-muted">
                      Autor: {e.creado_por || "—"}
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleViewDetails(e)}
                    >
                      Ver detalles
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleAssign(e)}
                    >
                      Asignar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* --- Modal VNEST --- */}
      {showVnestViewer && selectedExercise && (
        <VNESTExerciseModal
          exercise={selectedExercise}
          onClose={() => {
            setShowVnestViewer(false);
            setSelectedExercise(null);
          }}
        />
      )}

      {/* --- Modal SR --- */}
      {showSRViewer && selectedExercise && (
        <SRExerciseModal
          exercise={selectedExercise}
          onClose={() => {
            setShowSRViewer(false);
            setSelectedExercise(null);
          }}
        />
      )}
    </div>
  );
};

export default PatientAssignExercise;
