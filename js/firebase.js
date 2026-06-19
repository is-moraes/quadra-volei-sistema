// ===== FIREBASE CONFIG - Compat Mode =====
// Versão: 9.23.0 (mesma do index.html)

const firebaseConfig = {
  apiKey: "AIzaSyDY0GvcQ6kYdoGL2eWnvCFPgb4M496h_3o",
  authDomain: "quadra-volei-sistema.firebaseapp.com",
  projectId: "quadra-volei-sistema",
  storageBucket: "quadra-volei-sistema.firebasestorage.app",
  messagingSenderId: "332015795716",
  appId: "1:332015795716:web:2cc619af2d4979d9bcbf51"
};

// Inicializar Firebase (compat mode)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Expor Firestore e Auth globalmente para outros scripts compat
// (os scripts js/*.js sao carregados apos os compat bundles do index.html)
// as funcoes sao expostas no window pelo firebase compat
// Nada precisa ser exportado via ES modules - tudo via window.firebase
