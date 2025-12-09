import React, { useState, useMemo, useEffect } from "react";
import "./PacienteVNEST.css";

const PacienteVnest = ({ exercises, onView }) => {
  // --- ESTADO PARA FILTROS ---
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterVerbo, setFilterVerbo] = useState("");
  const [filterContexto, setFilterContexto] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // --- LIMPIAR FILTROS ---
  const clearFilters = () => {
    setFilterEstado("Todos");
    setFilterVerbo("");
    setFilterContexto("");
    setCurrentPage(1);
  };

  // --- FILTRADO Y ORDENAMIENTO ---
  const filteredExercises = useMemo(() => {
    return exercises
      .filter((e) => e.terapia === "VNEST")
      .filter((e) => {
        if (filterEstado !== "Todos") {
          if (
            filterEstado.toLowerCase() !== e.estado?.toLowerCase()
          )
            return false;
        }
        if (
          filterVerbo &&
          !e.verbo?.toLowerCase().includes(filterVerbo.toLowerCase())
        )
          return false;
        if (
          filterContexto &&
          !e.contexto?.toLowerCase().includes(filterContexto.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.fecha_asignacion
          ? new Date(a.fecha_asignacion.seconds * 1000)
          : 0;
        const dateB = b.fecha_asignacion
          ? new Date(b.fecha_asignacion.seconds * 1000)
          : 0;
        return dateB - dateA;
      });
  }, [exercises, filterEstado, filterVerbo, filterContexto]);

  // --- PAGINACIÓN ---
  const totalPages = Math.ceil(filteredExercises.length / pageSize);
  const paginatedExercises = filteredExercises.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // --- REINICIAR PÁGINA CUANDO CAMBIAN LOS FILTROS ---
  useEffect(() => {
    setCurrentPage(1);
  }, [filterEstado, filterVerbo, filterContexto]);

  return (
    <div className="vnest-page">
      <div className="vn-table-container">
        {/* --- FILTROS --- */}
        <div className="filters-box flex-wrap align-items-center">
          <div className="filter-group">
            <label>Estado:</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option>Todos</option>
              <option>Pendiente</option>
              <option>Completado</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Verbo:</label>
            <input
              type="text"
              placeholder="Buscar verbo"
              value={filterVerbo}
              onChange={(e) => setFilterVerbo(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Contexto:</label>
            <select
              value={filterContexto}
              onChange={(e) => setFilterContexto(e.target.value)}
            >
              <option>Todos</option>
              <option>Educación</option>
              <option>Actividades domésticas</option>
              <option>Trabajo</option>
              <option>Deportes</option>
              <option>Hacer mercado</option>
              <option>Ir de compras</option>
              <option>Ir a un restaurante</option>
              <option>Festividades</option>
              <option>Reunión social</option>
              <option>Viajes</option>
              <option>Servicios de transporte</option>
              <option>Contexto libre</option>
              <option>Cita médica</option>
            </select>
          </div>


          <button
            className="btn btn-outline-danger mt-2 mt-md-0"
            onClick={clearFilters}
            style={{ whiteSpace: "nowrap", minWidth: "110px" }}
          >
            Limpiar ✖
          </button>
        </div>

        {/* --- TABLA --- */}
        <div className="table-responsive">
          <table className="table align-middle mb-0 table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Contexto</th>
                <th>Verbo</th>
                <th>Personalizado</th>
                <th>Nivel</th>
                <th>Estado</th>
                <th>Fecha Asignado</th>
                <th>Fecha Realizado</th>
                <th className="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExercises.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No hay ejercicios con esos filtros.
                  </td>
                </tr>
              ) : (
                paginatedExercises.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.contexto || "—"}</td>
                    <td>{e.verbo || "—"}</td>
                    <td>{e.personalizado ? "Sí" : "No"}</td>
                    <td>{e.nivel || "—"}</td>
                    <td>
                      <span
                        className={`badge ${
                          e.estado?.toLowerCase() === "completado"
                            ? "bg-success"
                            : e.estado?.toLowerCase() === "en progreso"
                            ? "bg-warning text-dark"
                            : "bg-secondary"
                        }`}
                      >
                        {e.estado || "Pendiente"}
                      </span>
                    </td>
                    <td>
                      {e.fecha_asignacion
                        ? new Date(e.fecha_asignacion.seconds * 1000).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      {e.ultima_fecha_realizado
                        ? new Date(e.ultima_fecha_realizado.seconds * 1000).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onView(e)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINACIÓN --- */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="btn-group">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ◀
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PacienteVnest;
