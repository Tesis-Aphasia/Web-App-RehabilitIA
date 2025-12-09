import React, { useState, useMemo } from "react";
import "./PacienteSR.css";

const PacienteSR = ({ exercises, onView }) => {
  // --- ESTADO PARA FILTROS ---
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterPregunta, setFilterPregunta] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;


    // --- LIMPIAR FILTROS ---
    const clearFilters = () => {
      setFilterEstado("Todos");
      setFilterPregunta("");
      setCurrentPage(1);
    };
  // --- FILTRADO ---
  const filteredExercises = useMemo(() => {
    return exercises
      .filter((e) => e.terapia === "SR")
      .filter((e) => {
        if (filterEstado !== "Todos") {
          if (filterEstado === "Completado" && e.estado !== "completado") return false;
          if (filterEstado === "Pendiente" && e.estado === "completado") return false;
        }
        if (filterPregunta && !e.pregunta?.toLowerCase().includes(filterPregunta.toLowerCase()))
          return false;
        return true;
      });
      }, [exercises, filterEstado, filterPregunta]);

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

  return (
    <div className="sr-page">
    <div className="sr-table-container">
      {/* --- FILTROS --- */}
      <div className="filters-box flex-wrap align-items-center">
        {/* Contenedor de filtros */}
      

          <div className="filter-group">
            <label>Estado:</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option>Todos</option>
              <option>Completado</option>
              <option>Pendiente</option>
            </select>
          </div>


          {/* Filtro por pregunta */}
          <div className="filter-group">
            <label>Pregunta:</label>
            <input
              type="text"
              placeholder="Buscar pregunta"
              value={filterPregunta}
              onChange={(e) => setFilterPregunta(e.target.value)}
            />
          </div>

        {/* Botón limpiar */}
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
              <th>Pregunta</th>
              <th>Respuesta</th>
              <th>Estado</th>
              
              <th className="text-end">Acción</th>
            </tr>
          </thead>
          <tbody>
            {paginatedExercises.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted">
                  No hay ejercicios con esos filtros.
                </td>
              </tr>
            ) : (
              paginatedExercises.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>{e.pregunta || "—"}</td>
                  <td>{e.rta_correcta || "—"}</td>
                  <td>
                    {e.estado === "completado" ? (
                      <span className="badge bg-success">Completado</span>
                    ) : (
                      <span className="badge bg-secondary">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-primary"
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

export default PacienteSR;
