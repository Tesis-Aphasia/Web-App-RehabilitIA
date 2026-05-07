import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Guarda el feedback de aprobación en `feedbacks_sr`
 * y enlaza el ID al ejercicio en `ejercicios_SR` y `ejercicios`.
 *
 * feedbackData cuando se aprueba SIN imágenes:
 * { tipo: "aprobado_sin_imagenes", motivo_sin_imagenes, pregunta, respuesta }
 *
 * feedbackData cuando se aprueba CON imágenes borradas:
 * { tipo: "aprobado_con_imagenes_descartadas", imagenes_descartadas, motivo_descarte, pregunta, respuesta }
 *
 * feedbackData cuando se aprueba sin borrar nada:
 * { tipo: "aprobado", pregunta, respuesta }
 *
 * feedbackData cuando se rechaza/descarta:
 * { tipo: "rechazado", motivo_rechazo, pregunta, respuesta }
 */
export async function saveFeedbackAndLink(exerciseId, feedbackData) {
  // 1. Crear documento en feedbacks_sr
  const docRef = await addDoc(collection(db, "feedbacks_sr"), {
    exercise_id: exerciseId,
    creado_en: serverTimestamp(),
    ...feedbackData,
  });

  // 2. Enlazar el ID del feedback al ejercicio (en ambas colecciones)
  await updateDoc(doc(db, "ejercicios_SR", exerciseId), {
    feedback: docRef.id,
  });
  await updateDoc(doc(db, "ejercicios", exerciseId), {
    feedback: docRef.id,
  });

  return docRef.id;
}

/**
 * Recupera el feedback guardado para un ejercicio dado.
 * Busca en `feedbacks_sr` por el campo `exercise_id`.
 *
 * @param {string} exerciseId
 * @returns {object|null} — datos del feedback o null si no existe
 */
export async function getFeedbackByExerciseId(exerciseId) {
  const q = query(
    collection(db, "feedbacks_sr"),
    where("exercise_id", "==", exerciseId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  // Retorna el documento más reciente si hubiera varios
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => {
    const ta = a.creado_en?.toMillis?.() ?? 0;
    const tb = b.creado_en?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return docs[0];
}