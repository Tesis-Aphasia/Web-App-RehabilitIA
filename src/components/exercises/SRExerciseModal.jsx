
import { getPatientById } from "../../services/patientService";
import { getTherapistData } from "../../services/therapistService";
import React, { useEffect, useState } from "react";
import {
  FaQuestionCircle,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine,
  FaRedoAlt,
  FaUserClock,
} from "react-icons/fa";
import "./SRExerciseModal.css";

const SRExerciseModal = ({ exercise, onClose }) => {
  const [patientName, setPatientName] = useState("—");
  const [therapistName, setTherapistName] = useState("—");

   useEffect(() => {
    const fetchPatientData = async () => {
      if (!exercise?.id_paciente) return;
      try {
        const patient = await getPatientById(exercise.id_paciente);
        if (patient) {
          setPatientName(patient.nombre || patient.email || "Sin nombre");
        }
      } catch (err) {
      }
    };

    fetchPatientData();
  }, [exercise?.id_paciente]);

  // get info therapist from exercise.creado_por
    useEffect(() => {
      const fetchTherapistData = async () => {
        if (!exercise?.creado_por) return;
        try {
          const therapist = await getTherapistData(exercise.creado_por);
          if (therapist) {
            setTherapistName(therapist.nombre || therapist.email || "Sin nombre");
          }
        } catch (err) {
          }
      };
      fetchTherapistData();
    }, [exercise?.creado_por]);

  const formatTime = (ms) => {
    if (!ms) return "—";
    const date = new Date(ms);
    return date.toLocaleString();
  };

  return (
    <div className="sr-modal-backdrop" onClick={onClose}>
      <div className="sr-modal" onClick={(e) => e.stopPropagation()}>
        {/* === HEADER === */}
        <header className="sr-modal-header">
          <h4>
            Ejercicio SR: <span>{exercise?.id_ejercicio_general || "—"}</span>
          </h4>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </header>

        {!exercise ? (
          <div className="sr-loading text-center p-5">
            <div className="spinner-border text-warning" role="status"></div>
            <p className="mt-3 fw-semibold text-muted">Cargando ejercicio...</p>
          </div>
        ) : (
          <>
            {/* === PREGUNTA PRINCIPAL === */}
            <section className="sr-info">
              <p>
                <FaQuestionCircle className="icon" />{" "}
                <strong>Pregunta:</strong> {exercise.pregunta || "—"}
              </p>
              <p>
                <FaCheckCircle className="icon" />{" "}
                <strong>Respuesta correcta:</strong>{" "}
                {exercise.rta_correcta || "—"}
              </p>
            </section>

            {/* === ESTADO Y PROGRESO === */}
            <section className="sr-progress">
              <h5>Progreso de aprendizaje</h5>
              <div className="sr-grid">
                <div className="sr-stat">
                  <FaChartLine className="icon" />
                  <div>
                    <p className="label">Estado</p>
                    <p className="value">{exercise.status || "—"}</p>
                  </div>
                </div>

                <div className="sr-stat">
                  <FaRedoAlt className="icon" />
                  <div>
                    <p className="label">Racha de aciertos</p>
                    <p className="value">{exercise.success_streak ?? 0}</p>
                  </div>
                </div>

                <div className="sr-stat">
                  <FaTimesCircle className="icon error" />
                  <div>
                    <p className="label">Lapses (fallos)</p>
                    <p className="value">{exercise.lapses ?? 0}</p>
                  </div>
                </div>

                <div className="sr-stat">
                  <FaClock className="icon" />
                  <div>
                    <p className="label">Intervalo actual</p>
                    <p className="value">
                      {exercise.interval_index != null
                        ? `${exercise.intervals_sec?.[exercise.interval_index]} seg`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="sr-stat">
                  <FaUserClock className="icon" />
                  <div>
                    <p className="label">Próximo recordatorio</p>
                    <p className="value">{formatTime(exercise.next_due)}</p>
                  </div>
                </div>

                <div className="sr-stat">
                  {exercise.last_answer_correct ? (
                    <FaCheckCircle className="icon success" />
                  ) : (
                    <FaTimesCircle className="icon error" />
                  )}
                  <div>
                    <p className="label">Última respuesta</p>
                    <p className="value">
                      {exercise.last_answer_correct ? "Correcta" : "Incorrecta"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* === METADATOS === */}
            <section className="sr-meta">
              <p>
                <strong>ID general:</strong>{" "}
                {exercise.id_ejercicio_general || "—"}
              </p>
              <p>
                <strong>Creado por:</strong> {therapistName}
              </p>
              <p>
                <strong>Paciente:</strong> {patientName}
              </p>
              <p>
                <strong>Tipo:</strong> {exercise.tipo || "—"}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default SRExerciseModal;
