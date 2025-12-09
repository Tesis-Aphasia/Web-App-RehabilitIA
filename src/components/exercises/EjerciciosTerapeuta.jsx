import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../common/Navbar";
import {
  getVisibleExercises,
  getExerciseDetails,
} from "../../services/exercisesService";
import { getPatientById } from "../../services/patientService";
import VNESTTable from "./VNESTTable";
import SRETable from "./SRTable";
import ExerciseEditor from "../editExercises/VNESTEditor";
import SREditor from "../editExercises/SREditor";
import VNESTExerciseModal from "./VNESTExerciseModal";
import SRExerciseModal from "./SRExerciseModal";
import { auth } from "../../services/firebase";

import "./EjerciciosTerapeuta.css";

const EjerciciosTerapeuta = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showVnestEditor, setShowVnestEditor] = useState(false);
  const [showSREditor, setShowSREditor] = useState(false);
  const [showVnestViewer, setShowVnestViewer] = useState(false);
  const [showSRViewer, setShowSRViewer] = useState(false);
  const [activeTerapia, setActiveTerapia] = useState("VNEST");
  const [loadingModal, setLoadingModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [therapistId, setTherapistId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) return navigate("/");

      setTherapistId(user.uid);

      // 🔹 Obtener ejercicios visibles para este terapeuta
      const unsubscribeExercises = await getVisibleExercises(
        user.uid, // ✅ ahora pasamos el UID
        async (visibleExercises) => {
          setExercises(visibleExercises);

          const detailedResults = await Promise.allSettled(
            visibleExercises.map(async (e) => {
              try {
                const extras = await getExerciseDetails(e.id, e.terapia);
                const extra =
                  Array.isArray(extras) && extras.length > 0
                    ? extras[0]
                    : extras || {};

                let patientEmail = null;
                let patientName = null;

                if (e.id_paciente) {
                  const patient = await getPatientById(e.id_paciente);
                  if (patient) {
                    patientEmail = patient.email || null;
                    patientName = patient.nombre || null;
                  }
                }

                if (e.terapia === "VNEST") {
                  return {
                    ...e,
                    contexto: extra.contexto ?? e.contexto,
                    verbo: extra.verbo ?? e.verbo,
                    nivel: extra.nivel ?? e.nivel,
                    pacienteEmail: patientEmail,
                    pacienteNombre: patientName,
                  };
                } else if (e.terapia === "SR") {
                  return {
                    ...e,
                    pregunta: extra.pregunta ?? e.pregunta,
                    rta_correcta: extra.rta_correcta ?? e.rta_correcta,
                    pacienteEmail: patientEmail,
                    pacienteNombre: patientName,
                  };
                }

                return { ...e, ...extra };
              } catch (err) {
                return e;
              }
            })
          );

          const fulfilled = detailedResults
            .filter((r) => r.status === "fulfilled")
            .map((r) => r.value);

          setExercises(fulfilled);
        }
      );

      // Cleanup
      return () => unsubscribeExercises && unsubscribeExercises();
    });

    return () => unsubscribeAuth();
  }, [navigate, refreshKey]);

  const handleEdit = async (exercise) => {
    try {
      setLoadingModal(true);
      setSelectedExercise(null);

      const extras = await getExerciseDetails(exercise.id, exercise.terapia);
      const extra =
        Array.isArray(extras) && extras.length > 0 ? extras[0] : extras || {};

      setSelectedExercise({ ...exercise, ...extra });

      if (exercise.terapia === "SR") setShowSREditor(true);
      else setShowVnestEditor(true);
    } catch (err) {
    } finally {
      setLoadingModal(false);
    }
  };

  const handleViewExercise = async (exercise) => {
    try {
      setLoadingModal(true);
      setSelectedExercise(null);

      const extras = await getExerciseDetails(exercise.id, exercise.terapia);
      const extra =
        Array.isArray(extras) && extras.length > 0 ? extras[0] : extras || {};

      setSelectedExercise({ ...exercise, ...extra });

      if (exercise.terapia === "VNEST") setShowVnestViewer(true);
      else if (exercise.terapia === "SR") setShowSRViewer(true);
    } catch (err) {
    } finally {
      setLoadingModal(false);
    }
  };

  const handleCloseEditor = async (updated) => {
    setShowVnestEditor(false);
    setShowSREditor(false);
    setSelectedExercise(null);
    if (updated) {
      setRefreshKey((prev) => prev + 1);
    }
  };

  const handleGenerateNew = () => navigate("/ejercicios/nuevo");

  return (
    <div className="page-container">
      <Navbar active="ejercicios" />
      <main className="container py-5 mt-5">
        <div className="mb-4">
          <h2 className="fw-bold text-dark mb-0">Gestión de Ejercicios</h2>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="terapia-tabs">
            {["VNEST", "SR"].map((terapia) => (
              <button
                key={terapia}
                className={`tab-btn ${
                  activeTerapia === terapia ? "active-tab" : ""
                }`}
                onClick={() => setActiveTerapia(terapia)}
              >
                {terapia}
              </button>
            ))}
          </div>

          {activeTerapia === "VNEST" && (
            <button
              onClick={handleGenerateNew}
              className="btn btn-primary fw-semibold d-flex align-items-center"
              disabled={!therapistId}
            >
              <i className="bi bi-plus-lg"></i> Nuevo ejercicio VNEST
            </button>
          )}
        </div>

        {activeTerapia === "VNEST" ? (
          <VNESTTable
            exercises={exercises}
            onEdit={handleEdit}
            onView={handleViewExercise}
          />
        ) : (
          <SRETable
            exercises={exercises}
            onEdit={handleEdit}
            onView={handleViewExercise}
          />
        )}
      </main>

      {showVnestEditor && selectedExercise && (
        <ExerciseEditor
          open={showVnestEditor}
          onClose={handleCloseEditor}
          exercise={selectedExercise}
        />
      )}
      {showSREditor && selectedExercise && (
        <SREditor
          open={showSREditor}
          onClose={handleCloseEditor}
          exercise={selectedExercise}
        />
      )}

      {showVnestViewer && selectedExercise && (
        <VNESTExerciseModal
          exercise={selectedExercise}
          onClose={() => {
            setShowVnestViewer(false);
            setSelectedExercise(null);
          }}
        />
      )}

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

export default EjerciciosTerapeuta;
