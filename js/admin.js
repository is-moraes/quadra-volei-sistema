// ===== ADMIN.JS - Portal de Gerenciamento de Licencas =====
// E-mail do super admin (altere para o seu)
const ADMIN_EMAIL = 'zeisrael@gmail.com';

let clienteSelecionadoId = null;

// ===== LOGIN ADMIN =====
async function loginAdmin() {
  const email = document.getElementById('admin-email').value.trim();
  const senha = document.getElementById('admin-senha').value;
  const erroEl = document.getElementById('admin-login-erro');

  if (!email || !senha) {
    mostrarMsg(erroEl, 'Preencha todos os campos.', 'error');
    return;
  }

  try {
    const cred = await firebase.auth().signInWithEmailAndPassword(email, senha);
    // Verifica se e' admin
    const doc = await firebase.firestore().collection('admins').doc(cred.user.uid).get();
    if (!doc.exists || !doc.data().isAdmin) {
      await firebase.auth().signOut();
      mostrarMsg(erroEl, 'Acesso negado. Voce nao e administrador.', 'error');
      return;
    }
    document.getElementById('admin-nome').textContent = cred.user.email;
    document.getElementById('tela-admin-login').style.display = 'none';
    document.getElementById('painel-admin').style.display = 'block';
    carregarClientes();
  } catch (e) {
    mostrarMsg(erroEl, 'E-mail ou senha invalidos.', 'error');
  }
}

async function logoutAdmin() {
  await firebase.auth().signOut();
  location.reload();
}

// ===== CARREGAR CLIENTES =====
async function carregarClientes() {
  const tbody = document.getElementById('tabela-clientes');
  tbody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
  try {
    const snap = await firebase.firestore().collection('clientes').orderBy('nome').get();
    const clientes = [];
    snap.forEach(doc => clientes.push({ id: doc.id, ...doc.data() }));

    // Atualiza stats
    const ativos = clientes.filter(c => c.status === 'ativo').length;
    const expirados = clientes.filter(c => c.status === 'expirado').length;
    const bloqueados = clientes.filter(c => c.status === 'bloqueado').length;
    document.getElementById('stat-total').textContent = clientes.length;
    document.getElementById('stat-ativos').textContent = ativos;
    document.getElementById('stat-expirados').textContent = expirados;
    document.getElementById('stat-bloqueados').textContent = bloqueados;

    // Avisos de vencimento proximos (<=5 dias)
    const hoje = new Date();
    const vencendoEm5 = clientes.filter(c => {
      if (c.status !== 'ativo' || !c.dataExpiracao) return false;
      const exp = c.dataExpiracao.toDate ? c.dataExpiracao.toDate() : new Date(c.dataExpiracao);
      const dias = Math.ceil((exp - hoje) / (1000 * 60 * 60 * 24));
      return dias >= 0 && dias <= 5;
    });
    const avisoEl = document.getElementById('aviso-vencimento');
    if (avisoEl) {
      if (vencendoEm5.length > 0) {
        avisoEl.style.display = 'block';
        avisoEl.innerHTML = '\u26a0\ufe0f <strong>' + vencendoEm5.length + ' cliente(s)</strong> vencem nos proximos 5 dias: ' +
          vencendoEm5.map(c => '<strong>' + c.nome + '</strong>').join(', ');
      } else {
        avisoEl.style.display = 'none';
      }
    }

    // Renderiza tabela
    if (clientes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Nenhum cliente cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = clientes.map(c => {
      const exp = c.dataExpiracao
        ? (c.dataExpiracao.toDate ? c.dataExpiracao.toDate() : new Date(c.dataExpiracao))
        : null;
      const diasRestantes = exp ? Math.ceil((exp - hoje) / (1000 * 60 * 60 * 24)) : null;
      const diasStr = diasRestantes !== null
        ? (diasRestantes <= 0
          ? '<span class="dias-restantes dias-critico">Expirado</span>'
          : diasRestantes <= 5
            ? '<span class="dias-restantes dias-critico">' + diasRestantes + ' dias</span>'
            : '<span class="dias-restantes dias-ok">' + diasRestantes + ' dias</span>')
        : '-';
      const badgeClass = c.status === 'ativo' ? 'badge-ativo' : c.status === 'bloqueado' ? 'badge-bloqueado' : 'badge-expirado';
      const statusLabel = c.status === 'ativo' ? '\u2705 Ativo' : c.status === 'bloqueado' ? '\u26d4 Bloqueado' : '\u23f0 Expirado';
      const planoLabels = { trial: 'Trial', mensal: 'Mensal', trimestral: 'Trimestral', anual: 'Anual' };
      return `<tr>
        <td><strong>${c.nome}</strong><br><small>${c.email}</small></td>
        <td>${planoLabels[c.plano] || c.plano || '-'}</td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
        <td>${exp ? exp.toLocaleDateString('pt-BR') : '-'}</td>
        <td>${diasStr}</td>
        <td class="action-btns">
          ${c.status !== 'ativo' ? `<button class="btn-sm btn-ativar" onclick="alterarStatus('${c.id}','ativo')">\u2705 Ativar</button>` : ''}
          ${c.status !== 'bloqueado' ? `<button class="btn-sm btn-bloquear" onclick="alterarStatus('${c.id}','bloqueado')">\u26d4 Bloquear</button>` : ''}
          <button class="btn-sm btn-renovar" onclick="abrirModalRenovar('${c.id}','${c.nome.replace(/'/g, "\\'")}')">\uD83D\uDD04 Renovar</button>
          <button class="btn-sm btn-excluir" onclick="excluirCliente('${c.id}','${c.nome.replace(/'/g, "\\'")}')">\uD83D\uDDD1 Excluir</button>
        </td>
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:red">Erro ao carregar: ' + e.message + '</td></tr>';
  }
}

// ===== ALTERAR STATUS =====
async function alterarStatus(id, novoStatus) {
  if (!confirm('Confirma alterar o status para "' + novoStatus + '"?')) return;
  try {
    await firebase.firestore().collection('clientes').doc(id).update({ status: novoStatus });
    carregarClientes();
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

// ===== RENOVAR LICENCA =====
function abrirModalRenovar(id, nome) {
  clienteSelecionadoId = id;
  const info = document.getElementById('renovar-info');
  if (info) info.textContent = 'Cliente: ' + nome;
  document.getElementById('modal-renovar').classList.add('open');
}

async function confirmarRenovacao() {
  const dias = parseInt(document.getElementById('renovar-plano').value);
  const msgEl = document.getElementById('msg-renovar');
  try {
    const novaExpiracao = new Date();
    novaExpiracao.setDate(novaExpiracao.getDate() + dias);
    const planoMap = { 30: 'mensal', 90: 'trimestral', 365: 'anual' };
    await firebase.firestore().collection('clientes').doc(clienteSelecionadoId).update({
      dataExpiracao: firebase.firestore.Timestamp.fromDate(novaExpiracao),
      status: 'ativo',
      plano: planoMap[dias] || 'mensal'
    });
    fecharModal('modal-renovar');
    carregarClientes();
  } catch (e) {
    mostrarMsg(msgEl, 'Erro: ' + e.message, 'error');
  }
}

// ===== NOVO CLIENTE (usa app secundario para nao deslogar o admin) =====
function abrirModalNovoCliente() {
  document.getElementById('modal-novo-cliente').classList.add('open');
}

async function criarNovoCliente() {
  const nome = document.getElementById('nc-nome').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const senha = document.getElementById('nc-senha').value;
  const plano = document.getElementById('nc-plano').value;
  const msgEl = document.getElementById('msg-novo-cliente');

  if (!nome || !email || !senha) {
    mostrarMsg(msgEl, 'Preencha todos os campos.', 'error');
    return;
  }

  const diasPlano = { trial: 30, mensal: 30, trimestral: 90, anual: 365 };
  const dias = diasPlano[plano] || 30;

  try {
    // Usa app secundario para criar usuario sem deslogar o admin
    const secondaryApp = firebase.apps.find(a => a.name === 'Secondary') ||
      firebase.initializeApp(firebase.app().options, 'Secondary');
    const secondaryAuth = secondaryApp.auth();
    const cred = await secondaryAuth.createUserWithEmailAndPassword(email, senha);
    const uid = cred.user.uid;

    // Desloga do app secundario imediatamente
    await secondaryAuth.signOut();

    // Calcula expiracao
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + dias);

    // Salva no Firestore usando app principal (admin ainda logado)
    await firebase.firestore().collection('clientes').doc(uid).set({
      nome,
      email,
      plano,
      status: 'ativo',
      dataInicio: firebase.firestore.FieldValue.serverTimestamp(),
      dataExpiracao: firebase.firestore.Timestamp.fromDate(dataExpiracao),
      uid
    });

    // Limpa formulario
    document.getElementById('nc-nome').value = '';
    document.getElementById('nc-email').value = '';
    document.getElementById('nc-senha').value = '';
    document.getElementById('nc-plano').value = 'trial';

    mostrarMsg(msgEl, 'Cliente criado com sucesso!', 'success');
    setTimeout(() => {
      fecharModal('modal-novo-cliente');
      carregarClientes();
    }, 1500);
  } catch (e) {
    mostrarMsg(msgEl, 'Erro: ' + e.message, 'error');
  }
}

// ===== EXCLUIR CLIENTE =====
async function excluirCliente(id, nome) {
  if (!confirm('Tem certeza que deseja excluir o cliente "' + nome + '"?\nEssa acao nao pode ser desfeita.')) return;
  try {
    await firebase.firestore().collection('clientes').doc(id).delete();
    carregarClientes();
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

// ===== UTILITARIOS =====
function fecharModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function mostrarMsg(el, texto, tipo) {
  if (!el) return;
  el.textContent = texto;
  el.className = 'msg ' + tipo + ' show';
  setTimeout(() => el.classList.remove('show'), 4000);
}

// ===== INICIALIZACAO (aguarda DOM estar pronto) =====
document.addEventListener('DOMContentLoaded', () => {
  // Fecha modal clicando fora
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('open');
    }
  });

  // Enter no login
  document.addEventListener('keydown', (e) => {
    const telaLogin = document.getElementById('tela-admin-login');
    if (e.key === 'Enter' && telaLogin && telaLogin.style.display !== 'none') {
      loginAdmin();
    }
  });

  // Botao de login
  const btnLogin = document.getElementById('loginAdmin');
  if (btnLogin) {
    btnLogin.addEventListener('click', (e) => {
      e.preventDefault();
      loginAdmin();
    });
  }

  // Submit do form de login
  const formLogin = document.getElementById('tela-admin-login');
  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      loginAdmin();
    });
  }
});
