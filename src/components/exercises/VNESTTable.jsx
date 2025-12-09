import React, { useState, useMemo, useEffect } from "react";
import "./VNESTTable.css";

const VNESTTable = ({ exercises, onEdit, onView }) => {
  // --- ESTADO PARA FILTROS ---
  const [filterVisibilidad, setFilterVisibilidad] = useState("Todos");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterPersonalizado, setFilterPersonalizado] = useState("Todos");
  const [filterVerbo, setFilterVerbo] = useState("");
  const [filterContexto, setFilterContexto] = useState("");
  const [filterIdPaciente, setFilterIdPaciente] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // --- LIMPIAR FILTROS ---
  const clearFilters = () => {
    setFilterVisibilidad("Todos");
    setFilterEstado("Todos");
    setFilterPersonalizado("Todos");
    setFilterVerbo("");
    setFilterContexto("");
    setFilterIdPaciente("");
    setCurrentPage(1);
  };

  // --- FILTRADO Y ORDENAMIENTO ---
  const filteredExercises = useMemo(() => {
    return exercises
      .filter((e) => e.terapia === "VNEST")
      .filter((e) => {
        if (filterVisibilidad.toLowerCase() !== "todos" && e.tipo !== filterVisibilidad.toLowerCase())
          return false;
        if (filterEstado !== "Todos") {
          if (filterEstado === "Revisado" && !e.revisado) return false;
          if (filterEstado === "Por Revisar" && e.revisado) return false;
        }
        if (filterPersonalizado !== "Todos") {
          const isPersonalizado = !!e.personalizado;
          if (filterPersonalizado === "Sí" && !isPersonalizado) return false;
          if (filterPersonalizado === "No" && isPersonalizado) return false;
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
        if (
          filterIdPaciente &&
          !e.pacienteEmail?.toString().includes(filterIdPaciente)
        )
          return false;

        return true;
      })
      .sort((a, b) => {
        const dateA = a.fecha_creacion
          ? new Date(a.fecha_creacion.seconds * 1000)
          : 0;
        const dateB = b.fecha_creacion
          ? new Date(b.fecha_creacion.seconds * 1000)
          : 0;
        return dateB - dateA;
      });
  }, [
    exercises,
    filterVisibilidad,
    filterEstado,
    filterPersonalizado,
    filterVerbo,
    filterContexto,
    filterIdPaciente,
  ]);

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
  }, [
    filterVisibilidad,
    filterEstado,
    filterPersonalizado,
    filterVerbo,
    filterContexto,
    filterIdPaciente,
  ]);

  return (
    <div className="vnest-page">
    <div className="vn-table-container">
      {/* --- FILTROS --- */}
      <div className="filters-box flex-wrap align-items-center">
        {/* Contenedor de filtros */}
        
          <div className="filter-group">
            <label>Visibilidad:</label>
            <select
              value={filterVisibilidad}
              onChange={(e) => setFilterVisibilidad(e.target.value)}
            >
              <option>Todos</option>
              <option>Publico</option>
              <option>Privado</option>
            </select>
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
            <label>Personalizado:</label>
            <select
              value={filterPersonalizado}
              onChange={(e) => setFilterPersonalizado(e.target.value)}
            >
              <option>Todos</option>
              <option>Sí</option>
              <option>No</option>
            </select>
          </div>

          

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
              <th>Contexto</th>
              <th>Verbo</th>
              <th>Personalizado</th>
              <th>Asignado a</th>
              <th>Revisado</th>
              <th className="text-end">Acción</th>
            </tr>
          </thead>
          <tbody>
            {paginatedExercises.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted">
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
                  <td>{e.pacienteEmail || "—"}</td>
                  <td>
                    {e.revisado ? (
                      <span className="badge bg-success">Revisado</span>
                    ) : (
                      <span className="badge bg-warning text-dark">
                        Por Revisar
                      </span>
                    )}
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => onEdit(e)}
                    >
                      Revisar
                    </button>
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

export default VNESTTable;
