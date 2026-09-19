import { get, limitToLast, onValue, orderByChild, push, query, ref, remove, serverTimestamp, set } from "firebase/database";
import { database } from "../firebase/firebase-app.js";

const HISTORY_LIMIT = 10;

export function subscribeToFavorites(userId, callback) {
  return onValue(ref(database, `usuarios/${userId}/favoritos`), (snapshot) => callback(snapshot.val() ?? {}));
}

export function setFavorite(userId, category, itemId, isFavorite) {
  const favoriteRef = ref(database, `usuarios/${userId}/favoritos/${category}/${itemId}`);
  return isFavorite ? set(favoriteRef, true) : remove(favoriteRef);
}

export function subscribeToHistory(userId, callback) {
  const historyQuery = query(ref(database, `usuarios/${userId}/historial`), orderByChild("buscadoEn"), limitToLast(HISTORY_LIMIT));
  return onValue(historyQuery, (snapshot) => {
    const entries = [];
    snapshot.forEach((child) => entries.push({ id: child.key, ...child.val() }));
    callback(entries.reverse());
  });
}

export async function recordSearch(userId, search) {
  await push(ref(database, `usuarios/${userId}/historial`), { ...search, buscadoEn: serverTimestamp() });
  const extraEntries = await get(query(
    ref(database, `usuarios/${userId}/historial`),
    orderByChild("buscadoEn"),
    limitToLast(HISTORY_LIMIT + 1),
  ));
  if (extraEntries.size <= HISTORY_LIMIT) return;

  let oldestId = null;
  extraEntries.forEach((child) => {
    if (!oldestId) oldestId = child.key;
  });
  if (oldestId) await remove(ref(database, `usuarios/${userId}/historial/${oldestId}`));
}

export function clearHistory(userId) {
  return remove(ref(database, `usuarios/${userId}/historial`));
}
