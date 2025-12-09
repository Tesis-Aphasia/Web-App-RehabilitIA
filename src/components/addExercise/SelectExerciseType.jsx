import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../common/Navbar";
import "./SelectExerciseType.css";

const SelectExerciseType = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <Navbar active="ejercicios" />

      <main className="select-exercise-page">
        <h2 className="page-title">
          ¿Cómo deseas crear el nuevo ejercicio?
        </h2>

        <div className="options-grid">
          {/* === Opción IA === */}
          <div
            className="exercise-option option-ia"
            onClick={() => navigate("/ejercicios/nuevo/ia")}
          >
            <div className="icon-circle ia">
              <i className="bi bi-stars"></i>
            </div>
            <h5>Generar con IA (solo VNEST)</h5>
            <p>
              Crea automáticamente un ejercicio VNEST basado en un verbo, contexto o nivel.
            </p>
          </div>

          {/* === Opción Manual === */}
          <div className="exercise-option option-manual disabled">
            <div className="icon-circle manual">
              <i className="bi bi-pencil-square"></i>
            </div>
            <h5>Crear manualmente</h5>
            <p>Próximamente...</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SelectExerciseType;
