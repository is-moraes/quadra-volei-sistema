// ===== LICENCA.JS - Verificacao de licenca e bloqueio de acesso =====

// Verifica a licenca do usuario logado no Firestore
// Retorna: { valida: bool, status: string, diasRestantes: number, mensagem: string }
async function verificarLicenca(uid) {
  try {
    const doc = await firebase.firestore().collection('clientes').doc(uid).get();

    if (!doc.exists) {
      // Usuario nao tem registro de cliente - pode ser um admin ou usuario legado
      // Deixa passar (nao bloqueia usuarios sem registro de cliente)
      return { valida: true, status: 'sem-registro', diasRestantes: null, mensagem: '' };
    }

    const data = doc.data();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Verifica se foi bloqueado manualmente
    if (data.status === 'bloqueado') {
      return {
        valida: false,
        status: 'bloqueado',
        diasRestantes: 0,
        mensagem: 'Seu acesso foi suspenso pelo administrador. Entre em contato para reativar.'
      };
    }

    // Verifica expiracao
    if (data.dataExpiracao) {
      const expiracao = data.dataExpiracao.toDate ? data.dataExpiracao.toDate() : new Date(data.dataExpiracao);
      expiracao.setHours(0, 0, 0, 0);
      const diasRestantes = Math.ceil((expiracao - hoje) / (1000 * 60 * 60 * 24));

      if (diasRestantes < 0 || data.status === 'expirado') {
        // Atualiza status no Firestore automaticamente
        await firebase.firestore().collection('clientes').doc(uid).update({ status: 'expirado' });
        return {
          valida: false,
          status: 'expirado',
          diasRestantes: 0,
          mensagem: 'Sua assinatura expirou em ' + expiracao.toLocaleDateString('pt-BR') + '. Renove para continuar usando o sistema.'
        };
      }

      return {
        valida: true,
        status: 'ativo',
        diasRestantes,
        mensagem: diasRestantes <= 5
          ? 'Sua licenca vence em ' + diasRestantes + ' dia(s). Renove para nao perder o acesso!'
          : ''
      };
    }

    // Status ativo sem data de expiracao (acesso permanente)
    return { valida: true, status: 'ativo', diasRestantes: null, mensagem: '' };

  } catch (e) {
    console.warn('Erro ao verificar licenca:', e);
    // Em caso de erro na verificacao, permite acesso (fail-open)
    return { valida: true, status: 'erro', diasRestantes: null, mensagem: '' };
  }
}

// Exibe a tela de bloqueio correta
function mostrarTelaBloqueio(licenca) {
  // Esconde todas as telas
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));

  if (licenca.status === 'bloqueado') {
    document.getElementById('tela-bloqueado').classList.add('ativa');
    document.getElementById('msg-bloqueio').textContent = licenca.mensagem;
  } else if (licenca.status === 'expirado') {
    document.getElementById('tela-expirado').classList.add('ativa');
    document.getElementById('msg-expirado').textContent = licenca.mensagem;
  }
}

// Exibe aviso de vencimento proximo (banner no dashboard)
function exibirAvisoVencimento(licenca) {
  if (!licenca.mensagem || !licenca.valida) return;
  const aviso = document.getElementById('aviso-licenca');
  if (aviso) {
    aviso.textContent = '\u26a0\ufe0f ' + licenca.mensagem;
    aviso.style.display = 'block';
  }
}
