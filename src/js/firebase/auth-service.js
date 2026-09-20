import {
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase-app.js";
import { createUserProfile } from "./database-service.js";

export async function registerUser({ name, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await createUserProfile(credential.user.uid, name);
  return credential.user;
}

export async function loginUser({ email, password, remember }) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export function logoutUser() {
  return signOut(auth);
}

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getAuthErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "Ya existe una cuenta con este correo.",
    "auth/invalid-email": "Ingresa un correo electrónico válido.",
    "auth/invalid-credential": "El correo o la contraseña son incorrectos.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/network-request-failed": "No hay conexión. Revisa tu red e inténtalo nuevamente.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento antes de volver a intentarlo.",
    "auth/missing-email": "Ingresa tu correo para recuperar la contraseña.",
  };
  return messages[error.code] ?? "No fue posible completar la operación. Inténtalo nuevamente.";
}
