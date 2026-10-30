// Pengganti js/firebase.js saat test di Node (tanpa jaringan/CDN).
const noop = () => {};
const fail = async () => { throw new Error("Firestore tidak tersedia di test"); };

export const auth = { currentUser: null };
export const db = {};

export const onAuthStateChanged = noop;
export const signInAnonymously = fail;
export const signInWithEmailAndPassword = fail;
export const signOut = fail;
export const collection = (...path) => path.slice(1).join("/");
export const doc = (...path) => path.slice(1).join("/");
export const getDoc = fail;
export const getDocs = fail;
export const addDoc = fail;
export const updateDoc = fail;
export const deleteDoc = fail;
export const setDoc = fail;
export const writeBatch = () => ({ set: noop, update: noop, delete: noop, commit: fail });
export const query = (...args) => args;
export const where = (...args) => args;
export const orderBy = (...args) => args;
export const limit = n => n;
