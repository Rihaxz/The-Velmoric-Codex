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
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBb4xpWkV2sSARxKGS5UuRJwu8bG-qlkig",
  authDomain: "login-5ab48.firebaseapp.com",
  projectId: "login-5ab48",
  storageBucket: "login-5ab48.firebasestorage.app",
  messagingSenderId: "770076903708",
  appId: "1:770076903708:web:d493b3660094c084f892d9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch
};
