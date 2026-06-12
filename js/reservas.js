import { db } from './firebase.js';
import {
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'reservas';

// ── Criar reserva ────────────────────────────────────────────────
export async function criarReserva(dados) {
  // dados: { clienteId, clienteNome, quadraId, quadraNome, data, horaInicio, horaFim, valorTotal }
  const ref = await addDoc(collection(db, COL), {
    ...dados,
    status: 'pendente',
    criadoEm: serverTimestamp()
  });
  return ref.id;
}

// ── Buscar todas as reservas (admin) ────────────────────────────
export async function listarTodasReservas() {
  const q = query(collection(db, COL), orderBy('criadoEm', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Buscar reservas do cliente ────────────────────────────────
export async function listarReservasCliente(clienteId) {
  const q = query(
    collection(db, COL),
    where('clienteId', '==', clienteId),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Buscar reservas por data/quadra (verifica disponibilidade) ──────
export async function verificarDisponibilidade(quadraId, data) {
  const q = query(
    collection(db, COL),
    where('quadraId', '==', quadraId),
    where('data', '==', data),
    where('status', 'in', ['pendente', 'confirmada'])
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Buscar uma reserva ──────────────────────────────────────────
export async function getReserva(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ── Atualizar status da reserva ───────────────────────────────
export async function atualizarStatusReserva(id, status) {
  await updateDoc(doc(db, COL, id), { status, atualizadoEm: serverTimestamp() });
}

// ── Cancelar reserva ───────────────────────────────────────────
export async function cancelarReserva(id) {
  await updateDoc(doc(db, COL, id), {
    status: 'cancelada',
    canceladoEm: serverTimestamp()
  });
}

// ── Excluir reserva (admin) ────────────────────────────────────
export async function excluirReserva(id) {
  await deleteDoc(doc(db, COL, id));
}

// ── Helpers de UI ────────────────────────────────────────────────
export function statusBadge(status) {
  const map = {
    pendente:   '<span class="badge badge-pending">Pendente</span>',
    confirmada: '<span class="badge badge-confirmed">Confirmada</span>',
    cancelada:  '<span class="badge badge-cancelled">Cancelada</span>',
    concluida:  '<span class="badge badge-paid">Concluída</span>'
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

export function formatarData(data) {
  // data: 'YYYY-MM-DD'
  if (!data) return '-';
  const [y, m, d] = data.split('-');
  return `${d}/${m}/${y}`;
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(valor || 0);
}

// ── Renderizar tabela de reservas ───────────────────────────────
export function renderTabelaReservas(reservas, tbodyId, opcoes = {}) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (reservas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">Nenhuma reserva encontrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = reservas.map(r => `
    <tr>
      <td>${r.clienteNome || '-'}</td>
      <td>${r.quadraNome || '-'}</td>
      <td>${formatarData(r.data)}</td>
      <td>${r.horaInicio || '-'} – ${r.horaFim || '-'}</td>
      <td>${formatarMoeda(r.valorTotal)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        ${opcoes.confirmar && r.status === 'pendente'
          ? `<button class="btn btn-success btn-sm" data-id="${r.id}" data-acao="confirmar">Confirmar</button> `
          : ''}
        ${opcoes.cancelar && (r.status === 'pendente' || r.status === 'confirmada')
          ? `<button class="btn btn-danger btn-sm" data-id="${r.id}" data-acao="cancelar">Cancelar</button>`
          : ''}
        ${opcoes.excluir
          ? `<button class="btn btn-danger btn-sm" data-id="${r.id}" data-acao="excluir">Excluir</button>`
          : ''}
      </td>
    </tr>
  `).join('');

  // Eventos
  tbody.querySelectorAll('button[data-acao]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const acao = btn.dataset.acao;
      btn.disabled = true;
      try {
        if (acao === 'confirmar') await atualizarStatusReserva(id, 'confirmada');
        if (acao === 'cancelar')  await cancelarReserva(id);
        if (acao === 'excluir')   await excluirReserva(id);
        btn.closest('tr').remove();
      } catch (e) {
        alert('Erro: ' + e.message);
        btn.disabled = false;
      }
    });
  });
}
