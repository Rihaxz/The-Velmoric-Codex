/* =========================================================
   THE VELMORIC CODEX — firebase.js
   Inisialisasi Firebase. Modul lain mengimpor dari sini,
   jadi versi SDK cukup diganti di satu tempat.

   Kunci web Firebase memang bersifat publik; keamanan data
   dijaga oleh firestore.rules. Batasi juga API key ini ke
   domain situs di Google Cloud Console -> Credentials.
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyBb4xpWkV2sSARxKGS5UuRJwu8bG-qlkig",
  authDomain: "login-5ab48.firebaseapp.com",
  projectId: "login-5ab48",
  storageBucket: "login-5ab48.firebasestorage.app",
  messagingSenderId: "770076903708",
  appId: "1:770076903708:web:d493b3660094c084f892d9"
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Cache offline: arsip tetap bisa dibaca tanpa internet setelah pernah
// dibuka. Jika IndexedDB tidak tersedia, SDK otomatis memakai memori.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit
};
