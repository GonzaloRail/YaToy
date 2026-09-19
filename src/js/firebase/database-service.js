import { ref, serverTimestamp, set } from "firebase/database";
import { database } from "./firebase-app.js";

export function createUserProfile(userId, name) {
  return set(ref(database, `usuarios/${userId}/perfil`), {
    nombre: name,
    creadoEn: serverTimestamp(),
  });
}
