import React, { useState, useMemo } from "react";
import "./SRTable.css";

const SRTable = ({ exercises, onEdit, onView }) => { // 👈 añadimos onView
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterIdPaciente, setFilterIdPaciente] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const clearFilters = () => {
    setFilterEstado("Todos");
    setFilterIdPaciente("");
    setCurrentPage(1);
  };

  const filteredExercises = useMemo(() => {
    return exercises
      .filter((e) => e.terapia === "SR")
      .filter((e) => {
        if (filterEstado !== "Todos") {
          if (filterEstado === "Revisado" && !e.revisado) return false;
          if (filterEstado === "Por Revisar" && e.revisado) return false;
        }
        if (
          filterIdPaciente &&
          !e.pacienteEmail?.toString().includes(filterIdPaciente)
        )
          return false;
        return true;
      });
  }, [exercises, filterEstado, filterIdPaciente]);

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

          <div className="filter-group">
            <label>ID Paciente:</label>
            <input
              type="text"
              placeholder="Buscar ID paciente"
              value={filterIdPaciente}
              onChange={(e) => setFilterIdPaciente(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Revisado:</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option>Todos</option>
              <option>Revisado</option>
              <option>Por Revisar</option>
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
                <th>Asignado a</th>
                <th>Pregunta</th>
                <th>Respuesta</th>
                <th>Revisado</th>
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
                    <td>{e.pacienteEmail || "—"}</td>
                    <td>{e.pregunta || "—"}</td>
                    <td>{e.rta_correcta || "—"}</td>
                    <td>
                      {e.revisado ? (
                        <span className="badge bg-success">Revisado</span>
                      ) : (
                        <span className="badge bg-warning text-dark">
                          Por Revisar
                        </span>
                      )}
                    </td>
                    <td className="text-end d-flex justify-content-end gap-2">
                      
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => onEdit(e)}
                      >
                        Revisar
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onView(e)} // 👈 botón VER
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

export default SRTable;
