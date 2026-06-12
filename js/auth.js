// ===== AUTH.JS - Autenticacao Firebase com verificacao de licenca =====

// Utilitario de mensagens
function showMsg(el, text, type = 'error') {
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + type + ' show';
  setTimeout(() => el.classList.remove('show'), 5000);
}

// Mostrar tela
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
}

// ===== LOGIN =====
async function loginUsuario() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erroEl = document.getElementById('login-erro');

  if (!email || !senha) {
    showMsg(erroEl, 'Preencha e-mail e senha.');
    return;
  }

  const btn = document.querySelector('#tela-login .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Entrando...';

  try {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, senha);
    const uid = cred.user.uid;

    const licenca = await verificarLicenca(uid);
    if (!licenca.valida) {
      await firebase.auth().signOut();
      mostrarTelaBloqueio(licenca);
      return;
    }

    const userDoc = await firebase.firestore().collection('usuarios').doc(uid).get();
    const nomeUsuario = userDoc.exists ? userDoc.data().nome : email;
    const nomeEl = document.getElementById('nome-usuario');
    if (nomeEl) nomeEl.textContent = nomeUsuario;
    mostrarTela('tela-dashboard');
    exibirAvisoVencimento(licenca);
    if (typeof carregarReservas === 'function') carregarReservas();
  } catch (e) {
    const msgs = {
      'auth/user-not-found': 'Usuario nao encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-email': 'E-mail invalido.',
      'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.'
    };
    showMsg(erroEl, msgs[e.code] || 'Erro ao entrar: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Entrar';
  }
}

// ===== CADASTRO =====
async function cadastrarUsuario() {
  const nome = document.getElementById('cad-nome').value.trim();
  const telefone = document.getElementById('cad-telefone') ? document.getElementById('cad-telefone').value.trim() : '';
  const email = document.getElementById('cad-email').value.trim();
  const senha = document.getElementById('cad-senha').value;
  const erroEl = document.getElementById('cad-erro');

  if (!nome || !email || !senha) {
    showMsg(erroEl, 'Preencha todos os campos obrigatorios.');
    return;
  }
  if (senha.length < 6) {
    showMsg(erroEl, 'A senha deve ter no minimo 6 caracteres.');
    return;
  }

  const btn = document.querySelector('#tela-cadastro .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Criando conta...';

  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, senha);
    const uid = cred.user.uid;
    await firebase.firestore().collection('usuarios').doc(uid).set({
      nome, telefone, email, uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    const licenca = await verificarLicenca(uid);
    if (!licenca.valida) {
      await firebase.auth().signOut();
      mostrarTelaBloqueio(licenca);
      return;
    }

    const nomeEl = document.getElementById('nome-usuario');
    if (nomeEl) nomeEl.textContent = nome;
    mostrarTela('tela-dashboard');
    if (typeof carregarReservas === 'function') carregarReservas();
  } catch (e) {
    const msgs = {
      'auth/email-already-in-use': 'Este e-mail ja esta cadastrado.',
      'auth/invalid-email': 'E-mail invalido.',
      'auth/weak-password': 'Senha muito fraca.'
    };
    showMsg(erroEl, msgs[e.code] || 'Erro ao cadastrar: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Criar Conta';
  }
}

// ===== LOGOUT =====
async function sairUsuario() {
  await firebase.auth().signOut();
  mostrarTela('tela-login');
  const emailEl = document.getElementById('login-email');
  const senhaEl = document.getElementById('login-senha');
  if (emailEl) emailEl.value = '';
  if (senhaEl) senhaEl.value = '';
}

// ===== VERIFICACAO AUTOMATICA DE SESSAO =====
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    const licenca = await verificarLicenca(user.uid);
    if (!licenca.valida) {
      await firebase.auth().signOut();
      mostrarTelaBloqueio(licenca);
      return;
    }
    const userDoc = await firebase.firestore().collection('usuarios').doc(user.uid).get();
    const nomeUsuario = userDoc.exists ? userDoc.data().nome : user.email;
    const nomeEl = document.getElementById('nome-usuario');
    if (nomeEl) nomeEl.textContent = nomeUsuario;
    mostrarTela('tela-dashboard');
    exibirAvisoVencimento(licenca);
    if (typeof carregarReservas === 'function') carregarReservas();
  } else {
    mostrarTela('tela-login');
  }
});

// ===== ALIASES - nomes usados no HTML =====
function fazerLogin() { loginUsuario(); }
function fazerCadastro() { cadastrarUsuario(); }
function fazerLogout() { sairUsuario(); }

async function recuperarSenha() {
  const email = document.getElementById('recuperar-email').value.trim();
  const msgEl = document.getElementById('recuperar-msg');
  if (!email) { showMsg(msgEl, 'Informe o email.', 'error'); return; }
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    showMsg(msgEl, 'Email de recuperacao enviado! Verifique sua caixa de entrada.', 'success');
  } catch (e) {
    showMsg(msgEl, 'Erro ao enviar: ' + e.message, 'error');
  }
}

function solicitarRenovacao() {
  const el = document.getElementById('bloqueio-info') || document.getElementById('expirado-info');
  showMsg(el, 'Contate o administrador para renovar sua licenca.', 'info');
}
