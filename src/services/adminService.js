import { db, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";



// 🔹 login básico (puedes reemplazar con Firebase Auth real)
export const authAdmin = async (email, password) => {
  // temporal: valida con valores fijos o un doc de admins
  const admins = [
    { email: "rehabilitia.afasia@gmail.com", password: "admin123*" },
  ];
  return admins.some((a) => a.email === email && a.password === password);
};

// 🔹 obtener solicitudes
export const getSolicitudes = async () => {
  const q = query(collection(db, "solicitudes"), orderBy("fecha", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const approveSolicitud = async (solicitud) => {
  const aprobarTerapeuta = httpsCallable(functions, "aprobarTerapeuta");

  const passwordTemp = "rehab_" + Math.random().toString(36).slice(-6);


  await aprobarTerapeuta({
  email: solicitud.email,
  password: passwordTemp,
  nombre: solicitud.nombre,
  celular: solicitud.celular,
  profesion: solicitud.profesion,
  motivacion: solicitud.motivacion || "",
  solicitudId: solicitud.id,
});

};

// 🔹 rechazar solicitud
export const rejectSolicitud = async (solicitud) => {
  const rechazarTerapeuta = httpsCallable(functions, "rechazarTerapeuta");
  await rechazarTerapeuta({
    id: solicitud.id,
    email: solicitud.email,
    nombre: solicitud.nombre,
  });
};