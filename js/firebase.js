// ===== FIREBASE CONFIG - Modular Mode =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDY0GvcQ6kYdoGL2eWnvCFPgb4M496h_3o",
  authDomain: "quadra-volei-sistema.firebaseapp.com",
  projectId: "quadra-volei-sistema",
  storageBucket: "quadra-volei-sistema.firebasestorage.app",
  messagingSenderId: "332015795716",
  appId: "1:332015795716:web:2cc619af2d4979d9bcbf51"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
// Exportar helpers do Firestore
export { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp };
