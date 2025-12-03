import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendTherapistRequest } from "../../services/therapistService";
import Footer from "../common/Footer";
import "./TerapeutaLogin.css";

const TerapeutaRegistro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    celular: "",
    profesion: "",
    motivacion: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await sendTherapistRequest(formData);
      setSuccess(true);
      setFormData({
        nombre: "",
        email: "",
        celular: "",
        profesion: "",
        motivacion: "",
      });
    } catch (err) {
      setError("No se pudo enviar la solicitud. Intenta nuevamente.", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-container">
        <div className="gradient-bg" />

        {/* CARD MÁS PEQUEÑA Y EN 2 COLUMNAS */}
        <div className="registro-card registro-card-2col fade-in">

          {/* ===========================
              COLUMNA IZQUIERDA
          ============================ */}
          <div className="login-col-left">

            {/* Logo RehabilitIA */}
            <img
              src="https://raw.githubusercontent.com/Tesis-Aphasia/Web-App-RehabilitIA/refs/heads/main/src/assets/brain_logo.png"
              alt="RehabilitIA"
              className="left-logo-rehab"
            />

            <h2 className="left-title">Rehabilit<span className="logo-accent">IA</span></h2>

            <p className="left-subtitle">
              Plataforma para apoyo terapéutico inteligente en afasia.
            </p>

            {/* Logo Uniandes */}
            <div className="left-uniandes">
              <img src="https://raw.githubusercontent.com/Tesis-Aphasia/Web-App-RehabilitIA/refs/heads/main/src/assets/logo_disc.png" alt="Uniandes" />

            </div>
          </div>

          {/* ===========================
              COLUMNA DERECHA (FORM)
          ============================ */}
          <div className="registro-col-right">
            <h1 className="fw-bold text-dark fs-3 mb-1 text-center">
              Registro de Terapeuta
            </h1>

            <p className="text-muted small text-center mb-4">
              Envía tu solicitud para unirte a <strong>RehabilitIA</strong>
            </p>

            {success ? (
              <div className="alert alert-success text-center">
                Tu solicitud ha sido enviada.
                <div className="mt-3">
                  <button
                    className="btn-login"
                    onClick={() => navigate("/terapeuta/login")}
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="registro-form">

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Nombre completo</label>
                  <input
                    type="text"
                    name="nombre"
                    className="form-control rounded-3"
                    placeholder="Tu nombre completo"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control rounded-3"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Celular</label>
                  <input
                    type="text"
                    name="celular"
                    className="form-control rounded-3"
                    placeholder="3212345678"
                    value={formData.celular}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Profesión</label>
                  <input
                    type="text"
                    name="profesion"
                    className="form-control rounded-3"
                    placeholder="Ej: Fonoaudiólogo"
                    value={formData.profesion}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">
                    ¿Por qué quieres ser parte?
                  </label>
                  <textarea
                    name="motivacion"
                    className="form-control rounded-3"
                    placeholder="Cuéntanos brevemente tu motivación."
                    rows={3}
                    value={formData.motivacion}
                    onChange={handleChange}
                    required
                  />
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <button type="submit" className="btn-login" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar solicitud"}
                </button>

                <p className="small text-muted text-center mt-3">
                  ¿Ya tienes una cuenta?{" "}
                  <a href="/" className="forgot-link fw-semibold">
                    Inicia sesión
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default TerapeutaRegistro;
