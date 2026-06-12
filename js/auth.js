import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Utilitários de UI ──────────────────────────────────────────────
function showMsg(el, text, type = 'error') {
  if (!el) return;
  el.textContent = text;
  el.className = `msg ${type} show`;
}

function hideMsg(el) {
  if (!el) return;
  el.className = 'msg';
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>Aguarde...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.original || 'Enviar';
  }
}

// ── Guarda de Rota ────────────────────────────────────────────────
export function requireAuth(redirectTo = '/index.html') {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        window.location.href = redirectTo;
      } else {
        resolve(user);
      }
    });
  });
}

export function redirectIfLogged(redirectTo = '/dashboard.html') {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) {
        window.location.href = redirectTo;
      } else {
        resolve(null);
      }
    });
  });
}

// ── Cadastro ──────────────────────────────────────────────────────
export async function cadastrar(nome, email, senha, perfil = 'cliente') {
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  const uid = cred.user.uid;
  await setDoc(doc(db, 'usuarios', uid), {
    uid,
    nome,
    email,
    perfil,
    ativo: true,
    criadoEm: serverTimestamp()
  });
  return cred.user;
}

// ── Login ─────────────────────────────────────────────────────────
export async function login(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

// ── Logout ────────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
  window.location.href = '/index.html';
}

// ── Busca perfil do usuário no Firestore ──────────────────────────
export async function getPerfil(uid) {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data() : null;
}

// ── Observador global (para popular navbar, etc.) ─────────────────
export function observarAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Formulário de Login (index.html) ─────────────────────────────
const formLogin = document.getElementById('form-login');
if (formLogin) {
  redirectIfLogged('/dashboard.html');

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg-login');
    const btn = formLogin.querySelector('button[type=submit]');
    const email = formLogin.email.value.trim();
    const senha = formLogin.senha.value;

    hideMsg(msg);
    setLoading(btn, true);

    try {
      await login(email, senha);
      window.location.href = '/dashboard.html';
    } catch (err) {
      const erros = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.'
      };
      showMsg(msg, erros[err.code] || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── Formulário de Cadastro (cadastro.html) ────────────────────────
const formCadastro = document.getElementById('form-cadastro');
if (formCadastro) {
  redirectIfLogged('/dashboard.html');

  formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg-cadastro');
    const btn = formCadastro.querySelector('button[type=submit]');
    const nome  = formCadastro.nome.value.trim();
    const email = formCadastro.email.value.trim();
    const senha = formCadastro.senha.value;
    const confirma = formCadastro.confirma.value;

    hideMsg(msg);

    if (senha !== confirma) {
      showMsg(msg, 'As senhas não coincidem.');
      return;
    }
    if (senha.length < 6) {
      showMsg(msg, 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(btn, true);
    try {
      await cadastrar(nome, email, senha);
      showMsg(msg, 'Cadastro realizado! Redirecionando...', 'success');
      setTimeout(() => (window.location.href = '/dashboard.html'), 1500);
    } catch (err) {
      const erros = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/weak-password': 'Senha muito fraca.'
      };
      showMsg(msg, erros[err.code] || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── Botão Logout (dashboard e demais páginas) ─────────────────────
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', logout);
}
