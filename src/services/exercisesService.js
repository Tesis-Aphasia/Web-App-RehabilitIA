import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
    getDoc,
  query,
  orderBy,
  updateDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * 🔹 Trae solo la información general de los ejercicios
 *    (sin detalles VNEST o SR)
 */
export function getAllExercises(callback) {
  const q = query(collection(db, "ejercicios"), orderBy("id"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
  return unsubscribe;
}

export async function getVisibleExercisesOnce(therapistId) {
  try {
    // 1️⃣ Obtener IDs (emails o algo identificador) de los pacientes del terapeuta
    const pacientesRef = collection(db, "pacientes");
    const pacientesQuery = query(pacientesRef, where("terapeuta", "==", therapistId));
    const pacientesSnap = await getDocs(pacientesQuery);
    const patientIds = pacientesSnap.docs.map((doc) => doc.id);

    // 2️⃣ Obtener todos los ejercicios
    const ejerciciosRef = collection(db, "ejercicios");
    const ejerciciosSnap = await getDocs(ejerciciosRef);
    const allExercises = ejerciciosSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 3️⃣ Filtrar según visibilidad
    const visibleExercises = allExercises.filter((e) => {
      if (e.tipo === "publico") return true;
      if (e.tipo === "privado" && e.creado_por === therapistId && !patientIds.includes(e.id_paciente)) return true;
      return false;
    });

    return visibleExercises;
  } catch (err) {
    return [];
  }
}

export async function getVisibleExercises(therapistId, callback) {
  try {
    // 1️⃣ Obtener IDs (emails o algo identificador) de los pacientes del terapeuta
    const pacientesRef = collection(db, "pacientes");
    const pacientesQuery = query(pacientesRef, where("terapeuta", "==", therapistId));
    const pacientesSnap = await getDocs(pacientesQuery);
    const patientIds = pacientesSnap.docs.map((doc) => doc.id); // puedes usar .email si ese es el campo correcto


    // 2️⃣ Suscribirse a todos los ejercicios
    const ejerciciosRef = collection(db, "ejercicios");
    const unsubscribe = onSnapshot(ejerciciosRef, (snapshot) => {
      const allExercises = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 3️⃣ Filtrar según visibilidad
      const visibleExercises = allExercises.filter((e) => {
        if (e.tipo === "publico") return true;
        if (e.tipo === "privado" && e.creado_por === therapistId) return true;
        if (e.tipo === "privado" && patientIds.includes(e.creado_por)) return true;
        if (e.tipo === "privado" && patientIds.includes(e.id_paciente)) return true;
        return false;
      });

      callback(visibleExercises);
    });

    return unsubscribe;
  } catch (err) {
    return () => {}; // fallback vacío
  }
}


export async function getExerciseDetails(id, terapia) {
  try {
    // Determinar la colección según la terapia
    const colName = terapia === "VNEST" ? "ejercicios_VNEST" : "ejercicios_SR";
    const ref = doc(db, colName, id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      return data;
    } else {
      return null;
    }
  } catch (err) {
    throw err;
  }
}


export async function getExerciseById(id) {
  try {
    const ref = doc(db, "ejercicios", id);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    return null;
  } catch (err) {
    throw err;
  }
}



/**
 * 🔹 Actualizar los campos generales del ejercicio
 */
export async function updateExercise(id, data) {
  try {
    const ref = doc(db, "ejercicios", id);
    await updateDoc(ref, data);
  } catch (err) {
    throw err;
  }
}

/** 🔹 Actualizar los campos específicos del ejercicio SR */
export async function updateExerciseSR(id, data) {
  try {
    const ref = doc(db, "ejercicios_SR", id);
    await updateDoc(ref, data);
  } catch (err) {
    throw err;
  } 
}

/**
 * 🔹 Generar un ejercicio usando IA
 */
export async function generateExercise(payload) {
  try {
    const res = await fetch("https://afasia.virtual.uniandes.edu.co/api/context/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    throw err;
  }
}

// exercisesService.js

export async function personalizeExercise(userId, exerciseId, profile, creado_por) {
  try {
    const response = await fetch("https://afasia.virtual.uniandes.edu.co/api/personalize-exercise/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        exercise_id: exerciseId,
        profile: profile,
        creado_por: creado_por
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "Error al personalizar el ejercicio");
    }

    return data;
  } catch (err) {
    throw err;
  }
}


export async function generateExerciseImages(exerciseId, terapia) {
  // Lanza el job
  const res = await fetch("https://afasia.virtual.uniandes.edu.co/api/images/generate-async", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exercise_id: exerciseId, terapia }),
  });
  const { job_id } = await res.json();

  // Polling cada 5 segundos hasta 20 minutos
  const maxAttempts = 240;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://afasia.virtual.uniandes.edu.co/api/images/status/${job_id}`
    );
    const status = await statusRes.json();
    if (status.status === "done") return status.result;
    if (status.status === "error") throw new Error(status.error);
  }
  throw new Error("Timeout esperando imágenes");
}

// Reemplaza la deleteExercise existente con esta versión que llama al backend:
export async function deleteExerciseWithImages(exerciseId, terapia) {
  try {
    const res = await fetch(
      `https://afasia.virtual.uniandes.edu.co/api/exercises/${exerciseId}/delete?terapia=${terapia}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    throw err;
  }
}


export async function deleteExerciseImage(imageKey, exerciseId, terapia) {
  const res = await fetch(
    `https://afasia.virtual.uniandes.edu.co/api/images/${imageKey}/delete?exercise_id=${exerciseId}&terapia=${terapia}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function approveExercise(exerciseId, terapia) {
  try {
    const ref = doc(db, "ejercicios", exerciseId);
    await updateDoc(ref, { aprobado: true });
    const col = terapia === "VNEST" ? "ejercicios_VNEST" : "ejercicios_SR";
    const ref2 = doc(db, col, exerciseId);
    await updateDoc(ref2, { aprobado: true });
    return { ok: true };
  } catch (err) {
    throw err;
  }
}

export async function regenerateExerciseImages(exerciseId, terapia) {
  const res = await fetch("https://afasia.virtual.uniandes.edu.co/api/images/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exercise_id: exerciseId, terapia }),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return await res.json();
}

export async function deleteExercise(exerciseId, terapia) {
  return deleteExerciseWithImages(exerciseId, terapia);
}