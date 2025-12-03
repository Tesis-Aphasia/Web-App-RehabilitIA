import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { authAdmin } from "./adminService";


/**
 * 🔹 Login unificado: intenta como admin primero, luego como terapeuta
 */

export async function loginUnified(email, password) {
  // 1) Revisar si es admin
  const esAdmin = await authAdmin(email, password);
  if (esAdmin) {
    return { tipo: "admin" };
  }

  // 2) Si no es admin, intentar login como terapeuta
  const result = await loginTherapist(email, password);

  if (result.success) {
    return { tipo: "terapeuta", user: result.user, data: result.data };
  }

  // 3) Si falla: no existe
  return { tipo: "ninguno" };
}


/**
 * 🔹 Login de terapeuta (autenticación Firebase + datos en Firestore)
 */
  export async function loginTherapist(email, password) {
    try {
      // 1️⃣ Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2️⃣ Obtener datos del terapeuta usando UID
      const ref = doc(db, "terapeutas", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
            return { success: true, user, data: null };
      }

      // 3️⃣ Retornar datos combinados
      return { success: true, user, data: { id: snap.id, ...snap.data() } };
    } catch (err) {
        return { success: false, error: err.message };
    }
  }

/**
 * 🔹 Obtener información del terapeuta por UID
 */
export async function getTherapistData(therapistId) {
  try {
    const ref = doc(db, "terapeutas", therapistId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    return null;
  }
}

/**
 * 🔹 Obtener pacientes asignados a un terapeuta
 */
export function getPatientsByTherapist(therapistId, callback) {
  const ref = collection(db, "pacientes");
  const q = query(ref, where("terapeuta", "==", therapistId)); // 👈 ahora UID

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    const patients = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const ejerciciosRef = collection(db, "pacientes", docSnap.id, "ejercicios_asignados");
        const ejerciciosSnap = await getDocs(ejerciciosRef);
        const cantidadEjercicios = ejerciciosSnap.size;

        return {
          id: docSnap.id,
          ...data,
          cantidadEjercicios,
        };
      })
    );

    callback(patients);
  });

  return unsubscribe;
}

/**
 * 🔹 Suscribe al conteo de ejercicios no revisados (global)
 */
export function subscribePendingExercises(callback) {
  const ejerciciosRef = collection(db, "ejercicios");
  const q = query(ejerciciosRef, where("revisado", "==", false));
  const unsubscribe = onSnapshot(q, (snap) => {
    callback(snap.size);
  });
  return unsubscribe;
}

/**
 * 🔹 Suscribe al conteo de ejercicios visibles y no revisados del terapeuta
 */
export async function subscribePendingVisibleExercises(therapistId, callback) {
  // 1️⃣ Obtener IDs (UIDs) de los pacientes del terapeuta
  const pacientesRef = collection(db, "pacientes");
  const pacientesQuery = query(pacientesRef, where("terapeuta", "==", therapistId));
  const pacientesSnap = await getDocs(pacientesQuery);
  const patientIds = pacientesSnap.docs.map((doc) => doc.id);

  // 2️⃣ Suscribirse a todos los ejercicios pendientes
  const ejerciciosRef = collection(db, "ejercicios");
  const q = query(ejerciciosRef, where("revisado", "==", false));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // 3️⃣ Filtrar por visibilidad (usando UID)
    const visibleCount = snapshot.docs.filter((doc) => {
      const e = doc.data();
      const isPublic = e.tipo === "publico";
      const isPrivateOwn = e.tipo === "privado" && e.creado_por === therapistId;
      const isPrivatePatient =
        e.tipo === "privado" && (patientIds.includes(e.creado_por) || patientIds.includes(e.id_paciente));
      return isPublic || isPrivateOwn || isPrivatePatient;
    }).length;

    callback(visibleCount);
  });

  return unsubscribe;
}

/**
 * 🔹 Suscribe al conteo de pacientes asignados (desde el documento del terapeuta)
 */
export function subscribeAssignedPatients(therapistId, callback) {
  const ref = doc(db, "terapeutas", therapistId); // 👈 UID
  const unsubscribe = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const numPacientes = data.pacientes ? data.pacientes.length : 0;
      callback(numPacientes);
    } else {
      callback(0);
    }
  });
  return unsubscribe;
}

/**
 * 🔹 Obtener el perfil completo del terapeuta (por UID)
 */
export async function getTherapistProfile(therapistId) {
  try {
    const ref = doc(db, "terapeutas", therapistId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    return null;
  } catch (err) {
    throw err;
  }
}

/**
 * 🔹 Enviar solicitud de registro de terapeuta
 */
export const sendTherapistRequest = async (data) => {
  const solicitudesRef = collection(db, "solicitudes");
  await addDoc(solicitudesRef, {
    ...data,
    estado: "pendiente",
    fecha: serverTimestamp(),
  });
};

/**
 * 🔹 Restablecer contraseña (correo real del terapeuta)
 */
export async function resetTherapistPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: "https://afasia.virtual.uniandes.edu.co/web",
      handleCodeInApp: true,
    });
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
