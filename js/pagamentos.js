import { db } from './firebase.js';
import {
  collection, addDoc, getDocs, getDoc, updateDoc,
  doc, query, where, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { atualizarStatusReserva } from './reservas.js';
import { formatarMoeda } from './reservas.js';

const COL = 'pagamentos';

// ── Registrar pagamento ──────────────────────────────────────────
export async function registrarPagamento(dados) {
  // dados: { reservaId, clienteId, clienteNome, valor, metodoPagamento, observacao }
  const ref = await addDoc(collection(db, COL), {
    ...dados,
    status: 'pago',
    paidAt: serverTimestamp(),
    criadoEm: serverTimestamp()
  });

  // Atualiza status da reserva para confirmada
  await atualizarStatusReserva(dados.reservaId, 'confirmada');

  return ref.id;
}

// ── Listar todos os pagamentos (admin) ──────────────────────────
export async function listarTodosPagamentos() {
  const q = query(collection(db, COL), orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Listar pagamentos do cliente ──────────────────────────────
export async function listarPagamentosCliente(clienteId) {
  const q = query(
    collection(db, COL),
    where('clienteId', '==', clienteId),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Buscar pagamento por reserva ──────────────────────────────
export async function getPagamentoPorReserva(reservaId) {
  const q = query(
    collection(db, COL),
    where('reservaId', '==', reservaId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// ── Buscar um pagamento ────────────────────────────────────────
export async function getPagamento(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ── Estornar pagamento ────────────────────────────────────────
export async function estornarPagamento(pagamentoId, reservaId) {
  await updateDoc(doc(db, COL, pagamentoId), {
    status: 'estornado',
    estornadoEm: serverTimestamp()
  });
  await atualizarStatusReserva(reservaId, 'cancelada');
}

// ── Métodos de pagamento disponíveis ────────────────────────────
export const METODOS_PAGAMENTO = [
  { value: 'pix',         label: 'PIX' },
  { value: 'cartao_cred', label: 'Cartão de Crédito' },
  { value: 'cartao_deb',  label: 'Cartão de Débito' },
  { value: 'dinheiro',    label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência Bancária' }
];

// ── Render tabela de pagamentos ───────────────────────────────
export function renderTabelaPagamentos(pagamentos, tbodyId, opcoes = {}) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (pagamentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">Nenhum pagamento encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = pagamentos.map(p => {
    const metodo = METODOS_PAGAMENTO.find(m => m.value === p.metodoPagamento);
    const statusClass = p.status === 'pago' ? 'badge-paid'
      : p.status === 'estornado' ? 'badge-cancelled'
      : 'badge-pending';
    const statusLabel = p.status === 'pago' ? 'Pago'
      : p.status === 'estornado' ? 'Estornado'
      : p.status;
    return `
      <tr>
        <td>${p.clienteNome || '-'}</td>
        <td>${p.reservaId || '-'}</td>
        <td>${formatarMoeda(p.valor)}</td>
        <td>${metodo ? metodo.label : (p.metodoPagamento || '-')}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>
          ${opcoes.estornar && p.status === 'pago'
            ? `<button class="btn btn-danger btn-sm" data-id="${p.id}" data-reserva="${p.reservaId}">Estornar</button>`
            : ''}
        </td>
      </tr>
    `;
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

// ── Formulário de Pagamento (modal) ────────────────────────────
export function iniciarFormPagamento(formId, onSuccess) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Popular select de métodos
  const sel = form.querySelector('[name=metodoPagamento]');
  if (sel) {
    sel.innerHTML = METODOS_PAGAMENTO.map(m =>
      `<option value="${m.value}">${m.label}</option>`
    ).join('');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    const dados = {
      reservaId:        form.dataset.reservaId,
      clienteId:        form.dataset.clienteId,
      clienteNome:      form.dataset.clienteNome,
      valor:            parseFloat(form.dataset.valor),
      metodoPagamento:  form.metodoPagamento.value,
      observacao:       (form.observacao?.value || '').trim()
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
