// Importa os módulos necessários do Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

// Configuração do projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDY0GvcQ6kYdoGL2eWnvCFPgb4M496h_3o",
  authDomain: "quadra-volei-sistema.firebaseapp.com",
  projectId: "quadra-volei-sistema",
  storageBucket: "quadra-volei-sistema.firebasestorage.app",
  messagingSenderId: "332015795716",
  appId: "1:332015795716:web:2cc619af2d4979d9bcbf51"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias para uso nos outros módulos
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
