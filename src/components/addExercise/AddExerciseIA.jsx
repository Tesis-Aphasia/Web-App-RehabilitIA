import React, { useState, useEffect } from "react";
import { generateExercise } from "../../services/exercisesService";
import { getAllContexts } from "../../services/contextService";
import Navbar from "../common/Navbar";
import "./AddExerciseIA.css";

const AddExerciseIA = () => {
  const [context, setContext] = useState("");
  const [nivel, setNivel] = useState("fácil");
  const [visibilidad, setVisibilidad] = useState("publico");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [allContexts, setAllContexts] = useState([]);

  useEffect(() => {
    const fetchContexts = async () => {
      try {
        const data = await getAllContexts();
        setAllContexts(data);
      } catch (err) {
        alert("Error al cargar los contextos desde la base de datos.");
      }
    };
    fetchContexts();
  }, []);

  const handleGenerate = async () => {
    if (!context.trim()) {
      alert("Por favor selecciona un contexto.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await generateExercise({
        context,
        nivel,
        creado_por: localStorage.getItem("terapeutaUID") || "desconocido",
        tipo: visibilidad,
      });
      setResult(data);
    } catch (err) {
      alert("Ocurrió un error al generar el ejercicio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar active="nuevo-ejercicio" />

      <main className="add-exercise-page">
        <h2 className="page-title">✨ Crear nuevo ejercicio con IA</h2>
        <p className="page-subtitle">
          Completa los campos para generar automáticamente un ejercicio VNeST adaptado.
        </p>

        <div className="form-card">
          <div className="form-group">
            <label>Contexto</label>
            <select value={context} onChange={(e) => setContext(e.target.value)}>
              <option value="">Selecciona un contexto...</option>
              {allContexts.map((c) => (
                <option key={c.id} value={c.contexto}>
                  {c.contexto}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nivel</label>
              <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
                <option value="fácil">Fácil</option>
                <option value="medio">Medio</option>
                <option value="difícil">Difícil</option>
              </select>
            </div>

            <div className="form-group">
              <label>Visibilidad</label>
              <select
                value={visibilidad}
                onChange={(e) => setVisibilidad(e.target.value)}
              >
                <option value="publico">Público</option>
                <option value="privado">Privado</option>
              </select>
            </div>
          </div>

          <button
            className={`btn-generate ${loading ? "loading" : ""}`}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generando..." : "Generar ejercicio"}
          </button>
        </div>

        {result && (
          <div className="result-card fade-in">
            <h3>✅ Ejercicio generado correctamente</h3>
            <p>
              <strong>Verbo:</strong> {result.verbo}
            </p>
            <p>
              <strong>Nivel:</strong> {result.nivel}
            </p>
            <p>
              <strong>Contexto:</strong> {result.context_hint}
            </p>

            <h4>Oraciones</h4>
            <ul>
              {result.oraciones?.map((o, i) => (
                <li key={i}>{o.oracion}</li>
              ))}
            </ul>

            <h4>Pares</h4>
            <ul>
              {result.pares?.map((p, i) => (
                <li key={i}>
                  <strong>{p.sujeto}</strong> – {p.objeto}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
};

export default AddExerciseIA;
