// ===== PAGAMENTOS.JS - Compat Mode =====
// Usar window.firebase que ja esta disponivel globalmente

const COL = 'pagamentos';

// Helpers de acesso ao Firestore compat
function fs() { return window.firebase.firestore(); }
function serverTs() { return window.firebase.firestore.FieldValue.serverTimestamp(); }

// funcoes expostas por reservas.js (compat mode)
// listarReservasCliente ja existe no window
// formatarMoeda ja existe no window

// ── Registrar pagamento ──────────────────────────────────────────
async function registrarPagamento(dados) {
  // dados: { reservaId, clienteId, clienteNome, valor, metodoPagamento, observacao }
  const ref = await fs().collection(COL).add({
    ...dados,
    status: 'pago',
    paidAt: serverTs(),
    criadoEm: serverTs()
  });
  // Atualiza status da reserva para confirmada
  await atualizarStatusReserva(dados.reservaId, 'confirmada');
  return ref.id;
}

// ── Listar todos os pagamentos (admin) ──────────────────────────
async function listarTodosPagamentos() {
  const q = fs().collection(COL).orderBy('criadoEm', 'desc');
  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Listar pagamentos do cliente ──────────────────────────────
async function listarPagamentosCliente(clienteId) {
      try {
  const q = fs().collection(COL)
    .where('clienteId', '==', clienteId)
    .orderBy('criadoEm', 'desc');
  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error('Erro ao listar pagamentos do cliente:', e);
        return [];
    }}

// ── Buscar pagamento por reserva ──────────────────────────────
async function getPagamentoPorReserva(reservaId) {
  const q = fs().collection(COL).where('reservaId', '==', reservaId);
  const snap = await q.get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// ── Buscar um pagamento ────────────────────────────────────────
async function getPagamento(id) {
  const snap = await fs().collection(COL).doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

// ── Estornar pagamento ────────────────────────────────────────
async function estornarPagamento(pagamentoId, reservaId) {
  await fs().collection(COL).doc(pagamentoId).update({
    status: 'estornado',
    estornadoEm: serverTs()
  });
  await atualizarStatusReserva(reservaId, 'cancelada');
}

// ── Metodos de pagamento disponiveis ────────────────────────────
const METODOS_PAGAMENTO = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_cred', label: 'Cartao de Credito' },
  { value: 'cartao_deb', label: 'Cartao de Debito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferencia Bancaria' }
];

// ── Render tabela de pagamentos ───────────────────────────────
function renderTabelaPagamentos(pagamentos, tbodyId, opcoes = {}) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!pagamentos || pagamentos.length === 0) {
    tbody.innerHTML = 'Nenhum pagamento encontrado.';
    return;
  }
  tbody.innerHTML = pagamentos.map(p => {
    const metodo = METODOS_PAGAMENTO.find(m => m.value === p.metodoPagamento);
    const statusClass = p.status === 'pago' ? 'badge-paid' : p.status === 'estornado' ? 'badge-cancelled' : 'badge-pending';
    const statusLabel = p.status === 'pago' ? 'Pago' : p.status === 'estornado' ? 'Estornado' : p.status;
    return '<tr>' +
      '<td>' + (p.clienteNome || '-') + '</td>' +
      '<td>' + (p.reservaId || '-') + '</td>' +
      '<td>' + formatarMoeda(p.valor) + '</td>' +
      '<td>' + (metodo ? metodo.label : (p.metodoPagamento || '-')) + '</td>' +
      '<td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td>' +
      '<td>' + (opcoes.estornar && p.status === 'pago' ? '<button data-id="' + p.id + '" data-reserva="' + p.reservaId + '">Estornar</button>' : '') + '</td>' +
    '</tr>';
  }).join('');

  // Eventos de estorno
  tbody.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Confirmar estorno deste pagamento?')) return;
      const id = btn.dataset.id;
      const reservaId = btn.dataset.reserva;
      btn.disabled = true;
      try {
        await estornarPagamento(id, reservaId);
        btn.closest('tr').querySelector('.badge').textContent = 'Estornado';
        btn.closest('tr').querySelector('.badge').className = 'badge badge-cancelled';
        btn.remove();
      } catch (e) {
        alert('Erro: ' + e.message);
        btn.disabled = false;
      }
    });
  });
}

// ── Formul de Pagamento (modal) ────────────────────────────────
function iniciarFormPagamento(formId, onSuccess) {
  const form = document.getElementById(formId);
  if (!form) return;
  const sel = form.querySelector('[name=metodoPagamento]');
  if (sel) {
    sel.innerHTML = METODOS_PAGAMENTO.map(m => '<option value="' + m.value + '">' + m.label + '</option>').join('');
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    const dados = {
      reservaId: form.dataset.reservaId,
      clienteId: form.dataset.clienteId,
      clienteNome: form.dataset.clienteNome,
      valor: parseFloat(form.dataset.valor),
      metodoPagamento: form.metodoPagamento.value,
      observacao: (form.observacao?.value || '').trim()
    };
    btn.disabled = true;
    try {
      const id = await registrarPagamento(dados);
      if (onSuccess) onSuccess(id);
    } catch (err) {
      alert('Erro ao registrar pagamento: ' + err.message);
      btn.disabled = false;
    }
  });
}

// Expor funcoes globalmente (compat mode - sem exports)
window.registrarPagamento = registrarPagamento;
window.listarTodosPagamentos = listarTodosPagamentos;
window.listarPagamentosCliente = listarPagamentosCliente;
window.getPagamentoPorReserva = getPagamentoPorReserva;
window.getPagamento = getPagamento;
window.estornarPagamento = estornarPagamento;
window.METODOS_PAGAMENTO = METODOS_PAGAMENTO;
window.renderTabelaPagamentos = renderTabelaPagamentos;
window.iniciarFormPagamento = iniciarFormPagamento;
