// ===== RESERVAS.JS - Compat Mode =====
// Usa firebase.firestore() que já está disponível globalmente

const COL = 'reservas';

// ── Criar reserva ──────────────────────────────────────────────────
async function criarReserva(dados) {
  try {
    const ref = await firebase.firestore().collection(COL).add({
      ...dados,
      status: 'pendente',
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  } catch (e) {
    console.error('Erro ao criar reserva:', e);
    throw e;
  }
}

// ── Buscar todas as reservas (admin) ──────────────────────────────
async function listarTodasReservas() {
  try {
    const snap = await firebase.firestore().collection(COL)
      .orderBy('criadoEm', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Erro ao listar reservas:', e);
    return [];
  }
}

// ── Buscar reservas do cliente ────────────────────────────────────
async function listarReservasCliente(clienteId) {
  try {
    const snap = await firebase.firestore().collection(COL)
      .where('clienteId', '==', clienteId)
      .orderBy('criadoEm', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Erro ao listar reservas do cliente:', e);
    return [];
  }
}

// ── Buscar reserva por ID ─────────────────────────────────────────
async function getReserva(id) {
  try {
    const doc = await firebase.firestore().collection(COL).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (e) {
    console.error('Erro ao buscar reserva:', e);
    return null;
  }
}

// ── Atualizar status ──────────────────────────────────────────────
async function atualizarStatusReserva(id, status) {
  try {
    await firebase.firestore().collection(COL).doc(id).update({
      status,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('Erro ao atualizar status:', e);
    throw e;
  }
}

// ── Cancelar reserva ──────────────────────────────────────────────
async function cancelarReserva(id) {
  try {
    await firebase.firestore().collection(COL).doc(id).update({
      status: 'cancelada',
      canceladoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('Erro ao cancelar reserva:', e);
    throw e;
  }
}

// ── Excluir reserva ───────────────────────────────────────────────
async function excluirReserva(id) {
  try {
    await firebase.firestore().collection(COL).doc(id).delete();
  } catch (e) {
    console.error('Erro ao excluir reserva:', e);
    throw e;
  }
}

// ── Verificar disponibilidade ─────────────────────────────────────
async function verificarDisponibilidade(quadraId, data) {
  try {
    const snap = await firebase.firestore().collection(COL)
      .where('quadraId', '==', quadraId)
      .where('data', '==', data)
      .where('status', 'in', ['pendente', 'confirmada'])
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Erro ao verificar disponibilidade:', e);
    return [];
  }
}

// ── Helpers de UI ─────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    pendente: `<span class="badge badge-pendente">Pendente</span>`,
    confirmada: `<span class="badge badge-confirmada">Confirmada</span>`,
    cancelada: `<span class="badge badge-cancelada">Cancelada</span>`,
    concluida: `<span class="badge badge-concluida">Concluída</span>`
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

function formatarData(data) {
  if (!data) return '-';
  const parts = data.split('-');
  if (parts.length !== 3) return data;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function renderTabelaReservas(reservas, containerId, opcoes = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!reservas || reservas.length === 0) {
    container.innerHTML = '<p>Nenhuma reserva encontrada.</p>';
    return;
  }
  let html = `<table class="tabela"><thead><tr>
    <th>Data</th><th>Horário</th><th>Quadra</th><th>Valor</th><th>Status</th><th>Ações</th>
  </tr></thead><tbody>`;
  reservas.forEach(r => {
    html += `<tr>
      <td>${formatarData(r.data)}</td>
      <td>${r.horaInicio || '-'} – ${r.horaFim || '-'}</td>
      <td>${r.quadraNome || '-'}</td>
      <td>${formatarMoeda(r.valorTotal)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>`;
    if (opcoes.cancelar && (r.status === 'pendente' || r.status === 'confirmada')) {
      html += `<button class="btn btn-sm btn-cancelar" onclick="cancelarReservaPorId('${r.id}')">Cancelar</button>`;
    }
    if (opcoes.excluir) {
      html += `<button class="btn btn-sm btn-excluir" onclick="excluirReservaPorId('${r.id}')">Excluir</button>`;
    }
    html += `</td></tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ── FUNÇÕES GLOBAIS (usadas pelo HTML) ────────────────────────────

// Carregar reservas do usuário logado
async function carregarReservas() {
  const listaEl = document.getElementById('lista-reservas');
  if (!listaEl) return;
  listaEl.innerHTML = '<p>Carregando...</p>';
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      listaEl.innerHTML = '<p>Faça login para ver suas reservas.</p>';
      return;
    }
    const reservas = await listarReservasCliente(user.uid);
    renderTabelaReservas(reservas, 'lista-reservas', { cancelar: true });
  } catch (e) {
    console.error('Erro ao carregar reservas:', e);
    listaEl.innerHTML = '<p>Erro ao carregar reservas. Tente novamente.</p>';
  }
}

// Cancelar reserva pelo ID (wrapper global)
async function cancelarReservaPorId(id) {
  if (!confirm('Deseja cancelar esta reserva?')) return;
  try {
    await cancelarReserva(id);
    alert('Reserva cancelada com sucesso!');
    carregarReservas();
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

// Excluir reserva pelo ID (wrapper global - admin)
async function excluirReservaPorId(id) {
  if (!confirm('Deseja EXCLUIR esta reserva permanentemente?')) return;
  try {
    await excluirReserva(id);
    alert('Reserva excluída!');
    carregarReservas();
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

// Confirmar nova reserva
async function confirmarReserva() {
  const dataEl = document.getElementById('reserva-data');
  const horarioEl = document.getElementById('reserva-horario');
  const obsEl = document.getElementById('reserva-obs');
  const msgEl = document.getElementById('reserva-msg');

  const data = dataEl ? dataEl.value : '';
  const horario = horarioEl ? horarioEl.value : '';
  const obs = obsEl ? obsEl.value : '';

  if (!data || !horario) {
    if (msgEl) {
      msgEl.textContent = 'Preencha data e horário.';
      msgEl.className = 'msg error show';
    }
    return;
  }

  const btn = document.querySelector('#tela-nova-reserva .btn-primary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Agendando...';
  }

  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Usuário não logado.');

    const userDoc = await firebase.firestore().collection('usuarios').doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const [hh, mm] = horario.split(':').map(Number);
    const horaFim = `${String(hh + 1).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    const reservaId = await criarReserva({
      clienteId: user.uid,
      clienteNome: userData.nome || user.email,
      quadraId: 'quadra-1',
      quadraNome: 'Quadra Principal',
      data,
      horaInicio: horario,
      horaFim,
      observacoes: obs,
      valorTotal: 50
    });

    if (msgEl) {
      msgEl.textContent = 'Reserva confirmada! ID: ' + reservaId;
      msgEl.className = 'msg success show';
    }
    if (dataEl) dataEl.value = '';
    if (horarioEl) horarioEl.value = '';
    if (obsEl) obsEl.value = '';
    carregarReservas();
  } catch (e) {
    if (msgEl) {
      msgEl.textContent = 'Erro: ' + e.message;
      msgEl.className = 'msg error show';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirmar Reserva';
    }
  }
}

// Expor funções globalmente
window.carregarReservas = carregarReservas;
window.cancelarReservaPorId = cancelarReservaPorId;
window.excluirReservaPorId = excluirReservaPorId;
window.confirmarReserva = confirmarReserva;
window.formatarMoeda = formatarMoeda;
window.listarReservasCliente = listarReservasCliente;
