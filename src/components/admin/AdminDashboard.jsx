import React, { useState, useEffect } from "react";
import {
  getSolicitudes,
  approveSolicitud,
  rejectSolicitud,
} from "../../services/adminService";
import "./Admin.css";

const AdminDashboard = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSolicitudes = async () => {
    setLoading(true);
    const data = await getSolicitudes();
    setSolicitudes(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSolicitudes();
  }, []);

  const handleApprove = async (solicitud) => {
    try {
      await approveSolicitud(solicitud);
      alert(`✅ Solicitud aprobada. Se ha enviado un correo a ${solicitud.email}.`);
      loadSolicitudes();
    } catch (error) {
      alert("⚠️ Error al aprobar la solicitud. Revisa la consola o Firebase Functions.");
    }
  };

const handleReject = async (solicitud) => {
  try {
    await rejectSolicitud(solicitud);
    alert(`Correo de rechazo enviado a ${solicitud.email}.`);
    loadSolicitudes();
  } catch (err) {
    alert("Error al rechazar la solicitud. Revisa Firebase Functions.");
  }
};


  const filteredSolicitudes = solicitudes.filter((s) =>
    s.email.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-left">
          <h1>Panel de Administración</h1>
          <p>Gestión de solicitudes de terapeutas</p>
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por correo..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="search-input"
        />
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando solicitudes...</p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="section-title">Pendientes</h2>
            {filteredSolicitudes.filter((s) => s.estado === "pendiente").length === 0 ? (
              <p className="empty-text">No hay solicitudes pendientes.</p>
            ) : (
              <div className="solicitudes-grid">
                {filteredSolicitudes
                  .filter((s) => s.estado === "pendiente")
                  .map((s) => (
                    <div className="solicitud-card fade-in" key={s.id}>
                      <div className="card-header">
                        <h3>{s.nombre}</h3>
                        <span className="tag pending">Pendiente</span>
                      </div>
                      <p><strong>Email:</strong> {s.email}</p>
                      <p><strong>Profesión:</strong> {s.profesion}</p>
                      <p className="motivation"><strong>Motivación:</strong> {s.motivacion}</p>
                      <div className="btn-group">
                        <button onClick={() => handleApprove(s)} className="btn btn-approve">
                          Aprobar
                        </button>
                        <button onClick={() => handleReject(s)} className="btn btn-reject">
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="section-title">Completadas</h2>
            {filteredSolicitudes.filter((s) => s.estado !== "pendiente").length === 0 ? (
              <p className="empty-text">Aún no hay solicitudes procesadas.</p>
            ) : (
              <div className="solicitudes-grid">
                {filteredSolicitudes
                  .filter((s) => s.estado !== "pendiente")
                  .map((s) => (
                    <div className="solicitud-card complete fade-in" key={s.id}>
                      <div className="card-header">
                        <h3>{s.nombre}</h3>
                        <span
                          className={`tag ${
                            s.estado === "aprobada" ? "approved" : "rejected"
                          }`}
                        >
                          {s.estado}
                        </span>
                      </div>
                      <p><strong>Email:</strong> {s.email}</p>
                      <p><strong>Profesión:</strong> {s.profesion || "—"}</p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
