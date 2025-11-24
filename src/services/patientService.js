import {
  collection,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  arrayUnion,
  onSnapshot,
  where,
  query,
} from "firebase/firestore";
import { db } from "./firebase";



export async function getPatientById(patientId) {
  try {
    const ref = doc(db, "pacientes", patientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    throw err;
  }
}

export async function getPatientByEmail(email) {
  try {
    const pacientesRef = collection(db, "pacientes");
    const q = query(pacientesRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  } catch (err) {
    throw err;
  }
}

export async function updatePatient(patientId, data) {
  try {
    const ref = doc(db, "pacientes", patientId);
    await updateDoc(ref, data);
  } catch (err) {
    throw err;
  }
}

export async function assignPatientToTherapist(patientId, therapistId) {
  try {
    const ref = doc(db, "pacientes", patientId);
    await updateDoc(ref, { terapeuta: therapistId });
    
    const ref2 = doc(db, "terapeutas", therapistId);
    await updateDoc(ref2, { pacientes: arrayUnion(patientId) });
  } catch (err) {
    throw err;
  }
}

export async function assignExerciseToPatient(patientId, exerciseId) {
  try {
    // 1️⃣ Obtener el ejercicio base
    const exerciseRef = doc(db, "ejercicios", exerciseId);
    const exerciseSnap = await getDoc(exerciseRef);

    if (!exerciseSnap.exists()) {
      throw new Error(`No existe el ejercicio con ID ${exerciseId}`);
    }

    const exerciseData = exerciseSnap.data();
    const tipo = exerciseData.terapia;

    if (!tipo) {
      throw new Error(`El ejercicio ${exerciseId} no tiene campo 'terapia' definido`);
    }

    // 2️⃣ Buscar el contexto según el tipo
    let context = null;

    if (tipo === "VNEST") {
      const subSnap = await getDoc(doc(db, "ejercicios_VNEST", exerciseId));
      if (subSnap.exists()) context = subSnap.data().contexto;
    } else if (tipo === "SR") {
      const subSnap = await getDoc(doc(db, "ejercicios_SR", exerciseId));
      if (subSnap.exists()) context = subSnap.data().contexto;
    }

    if (!context) {
      throw new Error(`No se encontró el contexto para el ejercicio ${exerciseId} (tipo ${tipo})`);
    }

    // 3️⃣ Calcular la próxima prioridad
    const assignedCol = collection(db, "pacientes", patientId, "ejercicios_asignados");
    const assignedDocs = await getDocs(assignedCol);

    const priorities = assignedDocs.docs.map(d => d.data().prioridad || 0);
    const nextPriority = priorities.length > 0 ? Math.max(...priorities) + 1 : 1;

    // 4️⃣ Detectar si es personalizado
    const personalizado = exerciseData.personalizado || false;

    // 5️⃣ Crear el documento dentro del paciente
    const newDocRef = doc(assignedCol, exerciseId);
    await setDoc(newDocRef, {
      id_ejercicio: exerciseId,
      contexto: context,
      tipo,
      estado: "pendiente",
      prioridad: nextPriority,
      ultima_fecha_realizado: null,
      veces_realizado: 0,
      fecha_asignacion: serverTimestamp(),
      personalizado,
    });

    return { ok: true, message: `Ejercicio ${exerciseId} asignado al paciente ${patientId}` };

  } catch (error) {
    throw error;
  }
}



export function getAssignedExercises(patientId, callback) {
  const ref = collection(db, "pacientes", patientId, "ejercicios_asignados");

  const unsubscribe = onSnapshot(ref, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });

  return unsubscribe;
}
