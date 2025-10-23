// Estado centralizado da aplicação
const appState = {
  user: null,
  clientes: {
    todos: [],
    filtrados: [],
    exibidos: []
  },
  paginacao: {
    atual: 1,
    porPagina: 10,
    total: 0
  },
  ordenacao: {
    campo: 'id_cliente',
    direcao: 'asc'
  },
  filtros: {
    busca: '',
    empresa: '',
    situacao: '',
    tributacao: '',
    uf: ''
  },
  modals: {
    cliente: null,
    viewCliente: null,
    historico: null
  },
  ui: {
    editingClienteId: null
  },
  notificacoes: {
    lista: [],
    naoLidas: 0
  }
};

// Variável auxiliar para debounce
let buscaTimeout = null;

// Intervalo para verificação de notificações
let notificationInterval = null;

// Modal de parcelamento
let parcelamentoModal = null;

// ========================================
// UTILITÁRIOS
// ========================================

/**
 * Função de debounce - evita execuções repetidas
 */
function debounce(func, delay = 300) {
  return function(...args) {
    clearTimeout(buscaTimeout);
    buscaTimeout = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Aplica todos os filtros e ordenação aos clientes
 */
function processarClientes() {
  let resultado = [...appState.clientes.todos];
  
  // Aplicar filtros
  if (appState.filtros.busca) {
    const termo = appState.filtros.busca.toLowerCase();
    resultado = resultado.filter(c => 
      (c.razao_social && c.razao_social.toLowerCase().includes(termo)) ||
      (c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(termo))
    );
  }
  
  if (appState.filtros.empresa) {
    resultado = resultado.filter(c => c.empresa_responsavel === appState.filtros.empresa);
  }
  
  if (appState.filtros.situacao) {
    resultado = resultado.filter(c => c.situacao === appState.filtros.situacao);
  }
  
  if (appState.filtros.tributacao) {
    resultado = resultado.filter(c => c.regime_tributacao === appState.filtros.tributacao);
  }
  
  if (appState.filtros.uf) {
    resultado = resultado.filter(c => c.uf === appState.filtros.uf);
  }
  
  // Aplicar ordenação
  resultado.sort((a, b) => {
    let valorA = a[appState.ordenacao.campo];
    let valorB = b[appState.ordenacao.campo];
    
    if (valorA === null || valorA === undefined) valorA = '';
    if (valorB === null || valorB === undefined) valorB = '';
    
    valorA = String(valorA).toLowerCase();
    valorB = String(valorB).toLowerCase();
    
    if (appState.ordenacao.direcao === 'asc') {
      return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
    } else {
      return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
    }
  });
  
  appState.clientes.filtrados = resultado;
  appState.paginacao.total = Math.ceil(resultado.length / appState.paginacao.porPagina);
  
  // Garantir que a página atual seja válida
  if (appState.paginacao.atual > appState.paginacao.total && appState.paginacao.total > 0) {
    appState.paginacao.atual = appState.paginacao.total;
  }
  if (appState.paginacao.atual < 1) {
    appState.paginacao.atual = 1;
  }
}

/**
 * Retorna a classe CSS para o badge da empresa
 */
function getBadgeEmpresaClass(empresa) {
  const classes = {
    'Sorria': 'badge-sorria',
    'Medic': 'badge-medic',
    'Felício': 'badge-felicio'
  };
  return classes[empresa] || 'badge-default';
}

// ========================================
// SEGURANÇA - SANITIZAÇÃO
// ========================================

/**
 * Sanitiza string removendo tags HTML perigosas
 * Previne ataques XSS (Cross-Site Scripting)
 */
function sanitizeHTML(str) {
  if (!str) return '';
  
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Sanitiza string para uso seguro em atributos HTML
 */
function sanitizeAttribute(str) {
  if (!str) return '';
  
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Valida e sanitiza email
 */
function sanitizeEmail(email) {
  if (!email) return '';
  
  email = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new Error('Email inválido');
  }
  
  return email;
}

/**
 * Sanitiza número de telefone
 */
function sanitizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^0-9+\-() ]/g, '');
}

/**
 * Sanitiza valor monetário
 */
function sanitizeMoney(value) {
  if (value === null || value === undefined || value === '') return 0;
  
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;
  
  return num;
}

/**
 * Sanitiza SQL-like strings (prevenção básica de SQL injection)
 * NOTA: O Supabase já protege contra SQL injection, mas é uma camada extra
 */
function sanitizeSQL(str) {
  if (!str) return '';
  
  return String(str)
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

/**
 * Valida e sanitiza URL
 */
function sanitizeURL(url) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    
    // Permitir apenas HTTP e HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Protocolo não permitido');
    }
    
    return urlObj.href;
  } catch (error) {
    console.warn('URL inválida:', url);
    return '';
  }
}

/**
 * Limita tamanho de string
 */
function truncateString(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength);
}

/**
 * Constantes de validação
 */
const VALIDATION_RULES = {
  razao_social: { max: 255, required: true },
  cpf_cnpj: { max: 18, min: 11, required: true },
  municipio: { max: 100, required: true },
  squad: { max: 50, required: true },
  observacoes: { max: 2000, required: false },
  observacoes_regularidade: { max: 2000, required: false },
  email: { max: 255, required: true },
  nome_usuario: { max: 255, required: true },
  comentario: { max: 1000, required: true }
};

/**
 * Valida campo de acordo com as regras
 */
function validateField(fieldName, value) {
  const rule = VALIDATION_RULES[fieldName];
  if (!rule) return { valid: true };
  
  const errors = [];
  
  // Required
  if (rule.required && (!value || value.trim() === '')) {
    errors.push(`${fieldName} é obrigatório`);
  }
  
  // Min length
  if (rule.min && value && value.length < rule.min) {
    errors.push(`${fieldName} deve ter no mínimo ${rule.min} caracteres`);
  }
  
  // Max length
  if (rule.max && value && value.length > rule.max) {
    errors.push(`${fieldName} deve ter no máximo ${rule.max} caracteres`);
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida formulário completo
 */
function validateForm(formData, rules) {
  const errors = {};
  let isValid = true;
  
  for (const [field, value] of Object.entries(formData)) {
    const validation = validateField(field, value);
    if (!validation.valid) {
      errors[field] = validation.errors;
      isValid = false;
    }
  }
  
  return { isValid, errors };
}


// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando aplicação...');
  M.AutoInit();
  
  const clienteModalEl = document.getElementById('clienteModal');
  const viewClienteModalEl = document.getElementById('viewClienteModal');
  const historicoModalEl = document.getElementById('historicoModal');
  const parcelamentoModalEl = document.getElementById('parcelamentoModal');
  const usuarioModalEl = document.getElementById('usuarioModal');
  const trocarSenhaModalEl = document.getElementById('trocarSenhaModal');


  if (trocarSenhaModalEl) {
    trocarSenhaModal = M.Modal.init(trocarSenhaModalEl, {
      dismissible: true,
      onCloseEnd: resetTrocarSenhaForm
    });
  }


  if (usuarioModalEl) {
    usuarioModal = M.Modal.init(usuarioModalEl, {
      dismissible: true,
      onCloseEnd: resetUsuarioForm
    });
  }


  if (parcelamentoModalEl) {
    parcelamentoModal = M.Modal.init(parcelamentoModalEl, {
      dismissible: true,
      onCloseEnd: resetParcelamentoForm
    });
  }

  if (clienteModalEl) {
    appState.modals.cliente = M.Modal.init(clienteModalEl, {
      dismissible: true,
      onCloseEnd: resetClienteForm
    });
  }
  
  if (viewClienteModalEl) {
    appState.modals.viewCliente = M.Modal.init(viewClienteModalEl);
  }
  
  if (historicoModalEl) {
    appState.modals.historico = M.Modal.init(historicoModalEl);
  }
  
  M.FormSelect.init(document.querySelectorAll('select'));
  
  // Inicializar dropdown de exportação
  const dropdowns = document.querySelectorAll('.dropdown-trigger');
  M.Dropdown.init(dropdowns, {
    coverTrigger: false,
    constrainWidth: false
  });
  

  
  // Iniciar verificação de notificações a cada 5 minutos
  verificarNotificacoes();
  notificationInterval = setInterval(verificarNotificacoes, 5 * 60 * 1000);
});


// ========================================
// SISTEMA DE AUTENTICAÇÃO - SUPABASE AUTH
// Adicione estas funções no arquivo app.js
// ========================================

/**
 * Inicializa o aplicativo verificando autenticação
 */
async function inicializarApp() {
  console.log('🚀 Inicializando aplicação...');
  
  try {
    // Verificar se há sessão ativa
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('❌ Erro ao verificar sessão:', error);
      mostrarTelaLogin();
      return;
    }
    
    if (session) {
      // Usuário autenticado
      console.log('✅ Sessão ativa encontrada');
      await carregarUsuarioAutenticado(session.user);
      inicializarAppAutenticado();
    } else {
      // Sem sessão - mostrar tela de login
      console.log('⚠️ Nenhuma sessão ativa - mostrando tela de login');
      mostrarTelaLogin();
    }
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    mostrarTelaLogin();
  }
}

/**
 * Carrega dados do usuário autenticado
 */
async function carregarUsuarioAutenticado(authUser) {
  try {
    console.log('🔧 Carregando dados do usuário:', authUser.email);
    
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('email', authUser.email)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      throw new Error('Usuário não encontrado na tabela usuarios');
    }
    
    appState.user = data;
    console.log('✅ Usuário carregado:', data);
    
    // Atualizar UI com nome do usuário 
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.textContent = data.nome || data.email;
    } else {
      console.warn('⚠️ Elemento #userName não encontrado no HTML');
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar usuário:', error);
    M.toast({html: 'Erro ao carregar dados do usuário', classes: 'red'});
  }
}

/**
 * Inicializa o app após autenticação bem-sucedida
 */
function inicializarAppAutenticado() {
  // Remover classe de modo login
  document.body.classList.remove('login-mode');
  
  // Ocultar tela de login
  document.getElementById('loginSection').classList.add('hidden');
  
  // Mostrar navbar e conteúdo
  document.querySelector('nav').style.display = 'block';
  
  // Inicializar Materialize
  M.AutoInit();

  // Reinicializar dropdowns especificamente
  const dropdowns = document.querySelectorAll('.dropdown-trigger');
  M.Dropdown.init(dropdowns, {
    coverTrigger: false,
    constrainWidth: false
  });
  
  // Reinicializar selects
  M.FormSelect.init(document.querySelectorAll('select'));
  
  // Atualizar labels de inputs
  M.updateTextFields();
  
  // Inicializar modais
  appState.modals.cliente = M.Modal.init(document.getElementById('clienteModal'));
  appState.modals.viewCliente = M.Modal.init(document.getElementById('viewClienteModal'));
  appState.modals.historico = M.Modal.init(document.getElementById('historicoModal'));
  
  // Inicializar dropdown de notificações
  M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), {
    coverTrigger: false,
    constrainWidth: false
  });
  
  // Garantir que todas as seções estejam ocultas primeiro
  document.querySelectorAll('#dashboardSection, #clientesSection, #usuariosSection, #auditoriaSection').forEach(section => {
    section.classList.add('hidden');
  });

  // Aguardar renderização e então mostrar dashboard
  setTimeout(() => {
    showDashboard();
  
  // Iniciar verificação de notificações
  verificarNotificacoes();
  notificationInterval = setInterval(verificarNotificacoes, 5 * 60 * 1000);
}, 200);
  
  console.log('✅ Aplicação inicializada com sucesso');
}

/**
 * Mostra a tela de login
 */
function mostrarTelaLogin() {
  // Adicionar classe de modo login
  document.body.classList.add('login-mode');
  
  // Ocultar todas as seções
  document.querySelectorAll('main > div').forEach(el => {
    if (el.id !== 'loginSection') {
      el.classList.add('hidden');
    }
  });
  
  // Mostrar tela de login
  const loginSection = document.getElementById('loginSection');
  if (loginSection) {
    loginSection.classList.remove('hidden');
  }
  
  // Ocultar navbar
  const nav = document.querySelector('nav');
  if (nav) {
    nav.style.display = 'none';
  }
  
  // Inicializar Materialize para o formulário de login
  M.updateTextFields();
  
  // Adicionar listener ao formulário de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.removeEventListener('submit', handleLogin); // Remover listener anterior
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Inicializar modal de recuperar senha
  const recuperarModal = document.getElementById('recuperarSenhaModal');
  if (recuperarModal) {
    M.Modal.init(recuperarModal);
  }
}

/**
 * Processa o login do usuário
 */
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login_email').value.trim();
  const senha = document.getElementById('login_senha').value;
  
  if (!email || !senha) {
    M.toast({html: 'Preencha email e senha', classes: 'orange'});
    return;
  }
  
  try {
    console.log('🔐 Tentando fazer login:', email);
    
    // Fazer login com Supabase Auth
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: senha
    });
    
    if (error) throw error;
    
    console.log('✅ Login realizado com sucesso');
    M.toast({html: 'Login realizado com sucesso!', classes: 'green'});
    
    // Carregar dados do usuário
    await carregarUsuarioAutenticado(data.user);

    // Recarregar página para garantir inicialização correta
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
  } catch (error) {
    console.error('❌ Erro no login:', error);
    
    let mensagem = 'Erro ao fazer login';
    if (error.message.includes('Invalid login credentials')) {
      mensagem = 'Email ou senha incorretos';
    } else if (error.message.includes('Email not confirmed')) {
      mensagem = 'Email não confirmado. Verifique sua caixa de entrada.';
    }
    
    M.toast({html: mensagem, classes: 'red'});
  }
}

/**
 * Faz logout do usuário
 */
async function fazerLogout() {
  try {
    console.log('🚪 Fazendo logout...');
    
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) throw error;
    
    // Limpar estado do app
    appState.user = null;
    appState.clientes.todos = [];
    appState.clientes.filtrados = [];
    appState.clientes.exibidos = [];
    appState.notificacoes.lista = [];
    appState.notificacoes.naoLidas = 0;
    
    // Parar verificação de notificações
    if (notificationInterval) {
      clearInterval(notificationInterval);
      notificationInterval = null;
    }
    
    console.log('✅ Logout realizado com sucesso');
    M.toast({html: 'Logout realizado com sucesso', classes: 'green'});
    
    // Mostrar tela de login
    mostrarTelaLogin();
    
  } catch (error) {
    console.error('❌ Erro no logout:', error);
    M.toast({html: 'Erro ao fazer logout', classes: 'red'});
  }
}

/**
 * Mostra modal de recuperar senha
 */
function mostrarRecuperarSenha() {
  const modal = M.Modal.getInstance(document.getElementById('recuperarSenhaModal'));
  if (modal) {
    modal.open();
  }
}

/**
 * Envia email de recuperação de senha
 */
async function enviarRecuperacaoSenha() {
  const email = document.getElementById('recuperar_email').value.trim();
  
  if (!email) {
    M.toast({html: 'Digite seu email', classes: 'orange'});
    return;
  }
  
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password.html'
    });
    
    if (error) throw error;
    
    M.toast({html: 'Email de recuperação enviado! Verifique sua caixa de entrada.', classes: 'green'});
    
    // Fechar modal
    const modal = M.Modal.getInstance(document.getElementById('recuperarSenhaModal'));
    if (modal) {
      modal.close();
    }
    
    // Limpar campo
    document.getElementById('recuperar_email').value = '';
    
  } catch (error) {
    console.error('❌ Erro ao enviar recuperação:', error);
    M.toast({html: 'Erro ao enviar email de recuperação', classes: 'red'});
  }
}

/**
 * Monitora mudanças no estado de autenticação
 */
supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Mudança de autenticação:', event);
  
  if (event === 'SIGNED_IN') {
    console.log('✅ Usuário autenticado');
  } else if (event === 'SIGNED_OUT') {
    console.log('🚪 Usuário desconectado');
    mostrarTelaLogin();
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('🔄 Token atualizado');
  }
});

// ========================================
// FUNÇÕES DE PERFIL E CONFIGURAÇÕES
// ========================================

/**
 * Abre modal de perfil do usuário
 */
function abrirMeuPerfil() {
  if (!appState.user) {
    M.toast({html: 'Usuário não carregado', classes: 'red'});
    return;
  }
  
  M.toast({html: 'Funcionalidade em desenvolvimento', classes: 'blue'});
  
  // TODO: Implementar modal de perfil
  console.log('📝 Abrir perfil do usuário:', appState.user);
}

/**
 * Abre modal de configurações
 */
function abrirConfiguracoes() {
  M.toast({html: 'Funcionalidade em desenvolvimento', classes: 'blue'});
  
  // TODO: Implementar modal de configurações
  console.log('⚙️ Abrir configurações');
}

// ========================================
// INICIALIZAÇÃO
// ========================================

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
  inicializarApp();
}



// ========================================
// NAVEGAÇÃO
// ========================================
function showDashboard() {
  console.log('📊 Mostrando Dashboard');
  hideAllSections();
  document.getElementById('dashboardSection').classList.remove('hidden');
  loadDashboardStats();
}

function showClientes() {
  console.log('👥 Mostrando Clientes');
  hideAllSections();
  document.getElementById('clientesSection').classList.remove('hidden');
  loadClientes();
}

function showUsuarios() {
  if (appState.user && appState.user.papel === 'Administrador') {
    hideAllSections();
    document.getElementById('usuariosSection').classList.remove('hidden');
    loadUsuarios();
  } else {
    M.toast({html: 'Você não tem permissão.', classes: 'red'});
  }
}

function showAuditoria() {
  if (appState.user && appState.user.papel === 'Administrador') {
    hideAllSections();
    document.getElementById('auditoriaSection').classList.remove('hidden');
    loadAuditoria();
  } else {
    M.toast({html: 'Você não tem permissão.', classes: 'red'});
  }
}

function hideAllSections() {
  ['dashboardSection', 'clientesSection', 'usuariosSection', 'auditoriaSection']
    .forEach(id => {
      const section = document.getElementById(id);
      if (section) {
        section.classList.add('hidden');
      }
    });
}

// ========================================
// NOTIFICAÇÕES
// ========================================

/**
 * Verifica vencimentos próximos e cria notificações
 */
async function verificarNotificacoes() {
  try {
    const { data: clientes, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('situacao', 'Ativo');
    
    if (error) throw error;
    
    const hoje = new Date();
    const notificacoes = [];
    
    clientes.forEach(cliente => {
      // Verificar ISS
      if (cliente.vencimento_iss) {
        const vencimento = new Date(cliente.vencimento_iss);
        const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes >= 0 && diasRestantes <= 7) {
          notificacoes.push({
            id: `iss_${cliente.id_cliente}`,
            tipo: diasRestantes <= 3 ? 'danger' : 'warning',
            titulo: 'Vencimento ISS Próximo',
            mensagem: `${cliente.razao_social} - Vence em ${diasRestantes} dia(s)`,
            cliente_id: cliente.id_cliente,
            data: vencimento,
            lida: false
          });
        }
      }
      
      // Verificar EFD-Reinf
      if (cliente.prazo_efd_reinf) {
        const prazo = new Date(cliente.prazo_efd_reinf);
        const diasRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes >= 0 && diasRestantes <= 7) {
          notificacoes.push({
            id: `efd_${cliente.id_cliente}`,
            tipo: diasRestantes <= 3 ? 'danger' : 'warning',
            titulo: 'Prazo EFD-Reinf Próximo',
            mensagem: `${cliente.razao_social} - Vence em ${diasRestantes} dia(s)`,
            cliente_id: cliente.id_cliente,
            data: prazo,
            lida: false
          });
        }
      }
      
      // Verificar Prazo de Fechamento
      if (cliente.prazo_fechamento) {
        const prazo = new Date(cliente.prazo_fechamento);
        const diasRestantes = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes >= 0 && diasRestantes <= 5) {
          notificacoes.push({
            id: `fechamento_${cliente.id_cliente}`,
            tipo: diasRestantes <= 2 ? 'danger' : 'warning',
            titulo: 'Prazo de Fechamento Próximo',
            mensagem: `${cliente.razao_social} - Vence em ${diasRestantes} dia(s)`,
            cliente_id: cliente.id_cliente,
            data: prazo,
            lida: false
          });
        }
      }
      
      // Verificar regularidade
      const statusIrregulares = [
        cliente.status_regularidade_federal,
        cliente.status_regularidade_municipal,
        cliente.status_regularidade_estadual,
        cliente.status_regularidade_conselho
      ].filter(status => status === 'IRREGULAR' || status === 'PENDENTE');
      
      if (statusIrregulares.length > 0) {
        notificacoes.push({
          id: `regularidade_${cliente.id_cliente}`,
          tipo: 'info',
          titulo: 'Pendência Fiscal',
          mensagem: `${cliente.razao_social} - ${statusIrregulares.length} pendência(s)`,
          cliente_id: cliente.id_cliente,
          data: new Date(),
          lida: false
        });
      }
    });
    
    // Ordenar por data (mais próximas primeiro)
    notificacoes.sort((a, b) => a.data - b.data);
    
    appState.notificacoes.lista = notificacoes;
    appState.notificacoes.naoLidas = notificacoes.filter(n => !n.lida).length;
    
    renderNotificacoes();
  } catch (error) {
    console.error('❌ Erro ao verificar notificações:', error);
  }
}

/**
 * Renderiza as notificações no dropdown
 */
function renderNotificacoes() {
  const notificationsList = document.getElementById('notificationsList');
  const notificationCount = document.getElementById('notificationCount');
  
  if (appState.notificacoes.naoLidas > 0) {
    notificationCount.textContent = appState.notificacoes.naoLidas;
    notificationCount.style.display = 'block';
  } else {
    notificationCount.style.display = 'none';
  }
  
  if (appState.notificacoes.lista.length === 0) {
    notificationsList.innerHTML = `
      <div class="notification-empty">
        <i class="material-icons" style="font-size: 48px; color: #bdbdbd;">notifications_none</i>
        <p>Nenhuma notificação</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  appState.notificacoes.lista.forEach(notif => {
    const iconClass = notif.tipo === 'danger' ? 'danger' : notif.tipo === 'warning' ? 'warning' : 'info';
    const iconName = notif.tipo === 'danger' ? 'error' : notif.tipo === 'warning' ? 'warning' : 'info';
    const unreadClass = notif.lida ? '' : 'unread';
    
    const tempoDecorrido = calcularTempoDecorrido(notif.data);
    
    html += `
      <div class="notification-item ${unreadClass}" onclick="abrirNotificacao(${notif.cliente_id}, '${notif.id}')">
        <i class="material-icons notification-icon ${iconClass}">${iconName}</i>
        <div style="display: inline-block; vertical-align: top; width: calc(100% - 40px);">
          <div class="notification-title">${notif.titulo}</div>
          <div class="notification-message">${notif.mensagem}</div>
          <div class="notification-time">${tempoDecorrido}</div>
        </div>
      </div>
    `;
  });
  
  notificationsList.innerHTML = html;
}

/**
 * Calcula tempo decorrido em formato legível
 */
function calcularTempoDecorrido(data) {
  const agora = new Date();
  const diff = data - agora;
  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (dias < 0) {
    return 'Vencido';
  } else if (dias === 0) {
    return 'Hoje';
  } else if (dias === 1) {
    return 'Amanhã';
  } else {
    return `Em ${dias} dias`;
  }
}

/**
 * Abre detalhes do cliente ao clicar na notificação
 */
async function abrirNotificacao(clienteId, notifId) {
  // Marcar como lida
  const notif = appState.notificacoes.lista.find(n => n.id === notifId);
  if (notif && !notif.lida) {
    notif.lida = true;
    appState.notificacoes.naoLidas--;
    renderNotificacoes();
  }
  
  // Abrir cliente
  await viewCliente(clienteId);
}

/**
 * Marca todas as notificações como lidas
 */
function marcarTodasLidas() {
  appState.notificacoes.lista.forEach(n => n.lida = true);
  appState.notificacoes.naoLidas = 0;
  renderNotificacoes();
  M.toast({html: 'Todas as notificações foram marcadas como lidas', classes: 'green'});
}

// ========================================
// HISTÓRICO DE ALTERAÇÕES
// ========================================

/**
 * Registra uma alteração no histórico
 */
async function registrarHistorico(id_cliente, tipoAlteracao, alteracoes, observacao = null) {
  try {
    if (!appState.user) return;
    
    const registros = [];
    
    if (tipoAlteracao === 'CRIACAO') {
      registros.push({
        id_cliente: id_cliente,
        email_usuario: appState.user.email,
        tipo_alteracao: 'CRIACAO',
        campo_alterado: null,
        valor_anterior: null,
        valor_novo: null,
        observacao: observacao || 'Cliente criado'
      });
    } else if (tipoAlteracao === 'EDICAO' && alteracoes) {
      for (const [campo, valores] of Object.entries(alteracoes)) {
        registros.push({
          id_cliente: id_cliente,
          email_usuario: appState.user.email,
          tipo_alteracao: 'EDICAO',
          campo_alterado: campo,
          valor_anterior: valores.anterior,
          valor_novo: valores.novo,
          observacao: observacao
        });
      }
    } else if (tipoAlteracao === 'EXCLUSAO') {
      registros.push({
        id_cliente: id_cliente,
        email_usuario: appState.user.email,
        tipo_alteracao: 'EXCLUSAO',
        campo_alterado: null,
        valor_anterior: null,
        valor_novo: null,
        observacao: observacao || 'Cliente excluído'
      });
    }
    
    if (registros.length > 0) {
      const { error } = await supabaseClient
        .from('historico_alteracoes')
        .insert(registros);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('❌ Erro ao registrar histórico:', error);
  }
}

/**
 * Carrega e exibe o histórico de um cliente
 */
async function verHistoricoCliente() {
  if (!window.currentViewingClienteId) return;
  
  try {
    // Fechar modal de visualização
    if (appState.modals.viewCliente) appState.modals.viewCliente.close();
    
    // Abrir modal de histórico
    if (appState.modals.historico) appState.modals.historico.open();
    
    setTimeout(() => {
      const modalContent = document.querySelector('#historicoModal .modal-content');
      if (modalContent) modalContent.scrollTop = 0;
    }, 100);

    // Carregar histórico
    const { data: historico, error } = await supabaseClient
      .from('historico_alteracoes')
      .select('*')
      .eq('id_cliente', window.currentViewingClienteId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    // Carregar dados do cliente
    const { data: cliente, error: clienteError } = await supabaseClient
      .from('clientes')
      .select('razao_social')
      .eq('id_cliente', window.currentViewingClienteId)
      .single();
    
    if (clienteError) throw clienteError;
    
    renderHistorico(historico, cliente.razao_social);
  } catch (error) {
    console.error('❌ Erro ao carregar histórico:', error);
    M.toast({html: 'Erro ao carregar histórico', classes: 'red'});
  }
}

/**
 * Renderiza o histórico no modal
 */
function renderHistorico(historico, razaoSocial) {
  const historicoContent = document.getElementById('historicoContent');
  
  if (historico.length === 0) {
    historicoContent.innerHTML = `
      <div class="center-align" style="padding: 40px;">
        <i class="material-icons" style="font-size: 64px; color: #bdbdbd;">history</i>
        <p style="color: #757575; margin-top: 20px;">Nenhuma alteração registrada para este cliente.</p>
      </div>
    `;
    return;
  }
  
  let html = `
    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h6 style="margin: 0; color: #1976d2;">
        <i class="material-icons" style="vertical-align: middle;">business</i>
        ${razaoSocial}
      </h6>
      <p style="margin: 5px 0 0 0; color: #616161; font-size: 14px;">
        Total de ${historico.length} registro(s) de alteração
      </p>
    </div>
    <div class="timeline">
  `;
  
  historico.forEach(registro => {
    const data = new Date(registro.timestamp);
    const dataFormatada = data.toLocaleString('pt-BR');
    
    let iconClass = 'edit';
    let iconName = 'edit';
    let titulo = 'Edição';
    
    if (registro.tipo_alteracao === 'CRIACAO') {
      iconClass = 'create';
      iconName = 'add_circle';
      titulo = 'Criação';
    } else if (registro.tipo_alteracao === 'EXCLUSAO') {
      iconClass = 'delete';
      iconName = 'delete';
      titulo = 'Exclusão';
    }
    
    html += `
      <div class="timeline-item">
        <div class="timeline-icon ${iconClass}">
          <i class="material-icons">${iconName}</i>
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-title">${titulo}</span>
            <span class="timeline-time">${dataFormatada}</span>
          </div>
          <div class="timeline-user">
            <i class="material-icons tiny" style="vertical-align: middle;">person</i>
            ${registro.email_usuario}
          </div>
    `;
    
    if (registro.campo_alterado) {
      const labelCampo = formatarNomeCampo(registro.campo_alterado);
      html += `
        <div class="timeline-changes">
          <div class="timeline-change-item">
            <span class="timeline-change-label">${labelCampo}:</span><br>
            <span class="timeline-change-old">${registro.valor_anterior || '(vazio)'}</span>
            →
            <span class="timeline-change-new">${registro.valor_novo || '(vazio)'}</span>
          </div>
        </div>
      `;
    }
    
    if (registro.observacao) {
      html += `
        <div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 14px;">
          <i class="material-icons tiny" style="vertical-align: middle;">info</i>
          ${registro.observacao}
        </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  historicoContent.innerHTML = html;
}

/**
 * Formata o nome do campo para exibição
 */
function formatarNomeCampo(campo) {
  const mapeamento = {
    'razao_social': 'Razão Social',
    'cpf_cnpj': 'CPF/CNPJ',
    'empresa_responsavel': 'Empresa Responsável',
    'squad': 'Squad',
    'municipio': 'Município',
    'uf': 'UF',
    'situacao': 'Situação',
    'regime_tributacao': 'Regime de Tributação',
    'faturamento': 'Faturamento',
    'status_parcelamento': 'Status Parcelamento',
    'data_entrada': 'Data de Entrada',
    'data_constituicao': 'Data de Constituição',
    'ultima_consulta_fiscal': 'Última Consulta Fiscal',
    'vencimento_iss': 'Vencimento ISS',
    'prazo_efd_reinf': 'Prazo EFD-Reinf',
    'prazo_fechamento': 'Prazo Fechamento',
    'status_regularidade_federal': 'Regularidade Federal',
    'status_regularidade_municipal': 'Regularidade Municipal',
    'status_regularidade_estadual': 'Regularidade Estadual',
    'status_regularidade_conselho': 'Regularidade Conselho',
    'observacoes_regularidade': 'Observações de Regularidade',
    'observacoes': 'Observações'
  };
  
  return mapeamento[campo] || campo;
}

/**
 * Compara dados antigos e novos para detectar alterações
 */
function detectarAlteracoes(dadosAntigos, dadosNovos) {
  const alteracoes = {};
  
  const camposMonitorados = [
    'razao_social', 'cpf_cnpj', 'empresa_responsavel', 'squad', 'municipio', 'uf',
    'situacao', 'regime_tributacao', 'faturamento', 'status_parcelamento',
    'data_entrada', 'data_constituicao', 'ultima_consulta_fiscal',
    'vencimento_iss', 'prazo_efd_reinf', 'prazo_fechamento',
    'status_regularidade_federal', 'status_regularidade_municipal',
    'status_regularidade_estadual', 'status_regularidade_conselho',
    'observacoes_regularidade', 'observacoes'
  ];
  
  camposMonitorados.forEach(campo => {
    const valorAntigo = dadosAntigos[campo];
    const valorNovo = dadosNovos[campo];
    
    // Converter null para string vazia para comparação
    const antigoStr = valorAntigo === null || valorAntigo === undefined ? '' : String(valorAntigo);
    const novoStr = valorNovo === null || valorNovo === undefined ? '' : String(valorNovo);
    
    if (antigoStr !== novoStr) {
      alteracoes[campo] = {
        anterior: valorAntigo,
        novo: valorNovo
      };
    }
  });
  
  return alteracoes;
}

// ========================================
// COMENTÁRIOS
// ========================================

/**
 * Carrega comentários de um cliente
 */
async function carregarComentarios(id_cliente) {
  try {
    const { data, error } = await supabaseClient
      .from('comentarios_clientes')
      .select('*')
      .eq('id_cliente', id_cliente)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao carregar comentários:', error);
    return [];
  }
}

/**
 * Renderiza comentários no modal
 */
function renderComentarios(comentarios, id_cliente) {
  const container = document.getElementById('comentariosContainer');
  if (!container) return;
  
  let html = `
    <div class="comentarios-section">
      <h6>
        <i class="material-icons">comment</i>
        Comentários
        ${comentarios.length > 0 ? `<span class="badge-comentarios">${comentarios.length}</span>` : ''}
      </h6>
      
      <!-- Formulário de novo comentário -->
      <div class="comentario-form">
        <textarea 
          id="novoComentario" 
          placeholder="Adicione um comentário sobre este cliente..."
          maxlength="1000"
        ></textarea>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #9e9e9e; font-size: 12px;">
            <span id="charCount">0</span>/1000 caracteres
          </span>
          <button 
            class="btn blue waves-effect waves-light" 
            onclick="adicionarComentario(${id_cliente})"
            style="padding: 0 20px; height: 36px; line-height: 36px;">
            <i class="material-icons left" style="margin-right: 8px;">send</i>
            Enviar
          </button>
        </div>
      </div>
      
      <!-- Lista de comentários -->
      <div class="comentarios-lista" id="listaComentarios">
  `;
  
  if (comentarios.length === 0) {
    html += `
      <div class="comentarios-vazio">
        <i class="material-icons">chat_bubble_outline</i>
        <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
      </div>
    `;
  } else {
    comentarios.forEach(comentario => {
      const data = new Date(comentario.timestamp);
      const dataFormatada = data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const iniciais = comentario.nome_usuario
        ? comentario.nome_usuario.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : comentario.email_usuario.substring(0, 2).toUpperCase();
      
      const podeEditar = appState.user && appState.user.email === comentario.email_usuario;
      
      html += `
      <div class="comentario-item" id="comentario-${comentario.id}">
        <div class="comentario-header">
          <div class="comentario-autor">
            <div class="comentario-avatar">${iniciais}</div>
            <div class="comentario-autor-info">
              <span class="comentario-nome">${comentario.nome_usuario || 'Usuário'}</span>
              <span class="comentario-email">${comentario.email_usuario}</span>
            </div>
          </div>
          <div class="comentario-data">
            <i class="material-icons tiny" style="font-size: 14px;">schedule</i>
            ${dataFormatada}
            ${comentario.editado ? '<span class="comentario-editado">(editado)</span>' : ''}
          </div>
        </div>
        <div class="comentario-texto" id="texto-${comentario.id}">${sanitizeHTML(comentario.comentario)}</div>
        ${podeEditar ? `
          <div class="comentario-acoes">
            <button class="comentario-btn edit" onclick="editarComentario(${comentario.id})" title="Editar">
              <i class="material-icons">edit</i>
            </button>
            <button class="comentario-btn delete" onclick="deletarComentario(${comentario.id}, ${id_cliente})" title="Excluir">
              <i class="material-icons">delete</i>
            </button>
          </div>
        ` : ''}
      </div>
    `;
    });
  }
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Adicionar contador de caracteres
  const textarea = document.getElementById('novoComentario');
  if (textarea) {
    textarea.addEventListener('input', function() {
      document.getElementById('charCount').textContent = this.value.length;
    });
  }
}

/**
 * Adiciona novo comentário
 */
async function adicionarComentario(id_cliente) {
  try {
    const textarea = document.getElementById('novoComentario');
    const comentario = textarea.value.trim();
    
    if (!comentario) {
      M.toast({html: 'Digite um comentário', classes: 'orange'});
      return;
    }
    
    if (!appState.user) {
      M.toast({html: 'Usuário não identificado', classes: 'red'});
      return;
    }
    
    const { data, error } = await supabaseClient
      .from('comentarios_clientes')
      .insert([{
        id_cliente: id_cliente,
        email_usuario: appState.user.email,
        nome_usuario: appState.user.nome,
        comentario: comentario
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Limpar textarea
    textarea.value = '';
    document.getElementById('charCount').textContent = '0';
    
    // Recarregar comentários
    const comentarios = await carregarComentarios(id_cliente);
    renderComentarios(comentarios, id_cliente);
    
    // Log de auditoria
    await logAuditoria('COMENTARIO_ADICIONADO', id_cliente, `Comentário adicionado`);
    
    M.toast({html: 'Comentário adicionado!', classes: 'green'});
  } catch (error) {
    console.error('❌ Erro ao adicionar comentário:', error);
    M.toast({html: 'Erro ao adicionar comentário', classes: 'red'});
  }
}

/**
 * Editar comentário
 */
async function editarComentario(idComentario) {
  try {
    const textoEl = document.getElementById(`texto-${idComentario}`);
    const textoAtual = sanitizeHTML(textoEl.textContent);
    
    // Substituir texto por textarea
    textoEl.innerHTML = `
      <textarea 
        id="edit-textarea-${idComentario}" 
        style="width: 100%; min-height: 80px; padding: 10px; border: 1px solid #1976d2; border-radius: 4px; font-family: inherit; font-size: 14px;"
        maxlength="1000"
      >${textoAtual}</textarea>
      <div style="margin-top: 10px; text-align: right;">
        <button class="btn-flat waves-effect" onclick="cancelarEdicao(${idComentario}, '${textoAtual.replace(/`/g, '\\`')}')">
          Cancelar
        </button>
        <button class="btn blue waves-effect waves-light" onclick="salvarEdicaoComentario(${idComentario})">
          <i class="material-icons left">save</i>Salvar
        </button>
      </div>
    `;
    
    document.getElementById(`edit-textarea-${idComentario}`).focus();
  } catch (error) {
    console.error('❌ Erro ao editar comentário:', error);
  }
}

/**
 * Cancelar edição
 */
function cancelarEdicao(idComentario, textoOriginal) {
  const textoEl = document.getElementById(`texto-${idComentario}`);
  textoEl.textContent = textoOriginal;
}

/**
 * Salvar edição do comentário
 */
async function salvarEdicaoComentario(idComentario) {
  try {
    const textarea = document.getElementById(`edit-textarea-${idComentario}`);
    const novoTexto = textarea.value.trim();
    
    if (!novoTexto) {
      M.toast({html: 'O comentário não pode estar vazio', classes: 'orange'});
      return;
    }
    
    const { error } = await supabaseClient
      .from('comentarios_clientes')
      .update({
        comentario: novoTexto,
        editado: true,
        timestamp_edicao: new Date().toISOString()
      })
      .eq('id', idComentario);
    
    if (error) throw error;
    
    // Recarregar comentários
    if (window.currentViewingClienteId) {
      const comentarios = await carregarComentarios(window.currentViewingClienteId);
      renderComentarios(comentarios, window.currentViewingClienteId);
    }
    
    M.toast({html: 'Comentário atualizado!', classes: 'green'});
  } catch (error) {
    console.error('❌ Erro ao salvar comentário:', error);
    M.toast({html: 'Erro ao salvar comentário', classes: 'red'});
  }
}

/**
 * Deletar comentário
 */
async function deletarComentario(idComentario, id_cliente) {
  if (!confirm('Tem certeza que deseja excluir este comentário?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('comentarios_clientes')
      .delete()
      .eq('id', idComentario);
    
    if (error) throw error;
    
    // Recarregar comentários
    const comentarios = await carregarComentarios(id_cliente);
    renderComentarios(comentarios, id_cliente);
    
    // Log de auditoria
    await logAuditoria('COMENTARIO_DELETADO', id_cliente, `Comentário deletado`);
    
    M.toast({html: 'Comentário excluído!', classes: 'green'});
  } catch (error) {
    console.error('❌ Erro ao deletar comentário:', error);
    M.toast({html: 'Erro ao deletar comentário', classes: 'red'});
  }
}

// ========================================
// PARCELAMENTOS
// ========================================

/**
 * Carrega parcelamentos de um cliente
 */
async function carregarParcelamentos(id_cliente) {
  try {
    const { data, error } = await supabaseClient
      .from('parcelamentos')
      .select('*')
      .eq('id_cliente', id_cliente)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao carregar parcelamentos:', error);
    return [];
  }
}

/**
 * Renderiza parcelamentos no modal
 */
function renderParcelamentos(parcelamentos, id_cliente) {
  const container = document.getElementById('parcelamentosContainer');
  if (!container) return;
  
  let html = `
    <div class="parcelamentos-section">
      <h6>
        <i class="material-icons">payment</i>
        Parcelamentos Fiscais
        ${parcelamentos.length > 0 ? `<span class="badge-parcelamentos">${parcelamentos.length}</span>` : ''}
      </h6>
      
      <!-- Botão para adicionar -->
      <div style="margin-bottom: 20px;">
        <button 
          class="btn blue waves-effect waves-light" 
          onclick="openNovoParcelamentoModal(${id_cliente})"
          style="padding: 0 20px; height: 40px; line-height: 40px;">
          <i class="material-icons left" style="margin-right: 8px;">add</i>
          Adicionar Parcelamento
        </button>
      </div>
      
      <!-- Lista de parcelamentos -->
      <div class="parcelamentos-lista">
  `;
  
  if (parcelamentos.length === 0) {
    html += `
      <div class="parcelamentos-vazio">
        <i class="material-icons">receipt_long</i>
        <p>Nenhum parcelamento cadastrado. Adicione o primeiro!</p>
      </div>
    `;
  } else {
    parcelamentos.forEach(parc => {
      const dataEnvio = parc.data_envio_guia 
        ? new Date(parc.data_envio_guia).toLocaleDateString('pt-BR')
        : '-';
      
      // Verificar proximidade do vencimento
      let alertaVencimento = '';
      if (parc.data_envio_guia) {
        const hoje = new Date();
        const vencimento = new Date(parc.data_envio_guia);
        const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes >= 0 && diasRestantes <= 7) {
          const classeUrgencia = diasRestantes <= 3 ? 'urgente' : '';
          alertaVencimento = `
            <div class="alert-vencimento ${classeUrgencia}">
              <i class="material-icons">schedule</i>
              <span>
                <strong>${diasRestantes === 0 ? 'Vence HOJE!' : diasRestantes === 1 ? 'Vence AMANHÃ!' : `Vence em ${diasRestantes} dias`}</strong>
              </span>
            </div>
          `;
        }
      }
      
      html += `
        <div class="parcelamento-item">
          <div class="parcelamento-header">
            <div class="parcelamento-tipo">
              <i class="material-icons">account_balance</i>
              ${parc.tipo_parcelamento}
            </div>
            ${parc.status_parcela ? `<span class="parcelamento-status">${parc.status_parcela}</span>` : ''}
          </div>
          
          <div class="parcelamento-detalhes">
            <div class="parcelamento-detail-item">
              <i class="material-icons">event</i>
              <span>Envio: ${dataEnvio}</span>
            </div>
            <div class="parcelamento-detail-item">
              <i class="material-icons">credit_card</i>
              <span>${parc.modo_pagamento || 'Boleto'}</span>
            </div>
          </div>
          
          ${alertaVencimento}
          
          ${parc.observacoes ? `
            <div class="parcelamento-observacoes">
              <strong><i class="material-icons tiny" style="vertical-align: middle;">info</i> Observações:</strong><br>
              ${parc.observacoes}
            </div>
          ` : ''}
          
          <div class="parcelamento-acoes">
            <button class="parcelamento-btn edit" onclick="editParcelamento(${parc.id_parcelamento})" title="Editar">
              <i class="material-icons">edit</i>
            </button>
            <button class="parcelamento-btn delete" onclick="deleteParcelamento(${parc.id_parcelamento}, ${id_cliente})" title="Excluir">
              <i class="material-icons">delete</i>
            </button>
          </div>
        </div>
      `;
    });
  }
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Abre modal para novo parcelamento
 */
function openNovoParcelamentoModal(id_cliente) {
  resetParcelamentoForm();
  document.getElementById('parcelamentoModalTitle').textContent = 'Novo Parcelamento';
  document.getElementById('parcelamento_id_cliente').value = id_cliente;
  document.getElementById('parcelamento_id').value = '';
  
  setTimeout(() => {
    M.FormSelect.init(document.querySelectorAll('#parcelamentoModal select'));
    M.updateTextFields();
  }, 100);
  
  if (parcelamentoModal) parcelamentoModal.open();
  
  setTimeout(() => {
    const modalContent = document.querySelector('#parcelamentoModal .modal-content');
    if (modalContent) modalContent.scrollTop = 0;
  }, 100);
}

/**
 * Edita parcelamento existente
 */
async function editParcelamento(idParcelamento) {
  try {
    const { data, error } = await supabaseClient
      .from('parcelamentos')
      .select('*')
      .eq('id_parcelamento', idParcelamento)
      .single();
    
    if (error) throw error;
    
    document.getElementById('parcelamentoModalTitle').textContent = 'Editar Parcelamento';
    document.getElementById('parcelamento_id').value = data.id_parcelamento;
    document.getElementById('parcelamento_id_cliente').value = data.id_cliente;
    document.getElementById('parcelamento_tipo').value = data.tipo_parcelamento || '';
    document.getElementById('parcelamento_status_parcela').value = data.status_parcela || '';
    document.getElementById('parcelamento_data_envio').value = data.data_envio_guia || '';
    document.getElementById('parcelamento_modo_pagamento').value = data.modo_pagamento || 'Boleto';
    document.getElementById('parcelamento_observacoes').value = data.observacoes || '';
    
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('#parcelamentoModal select'));
      M.updateTextFields();
      M.textareaAutoResize(document.getElementById('parcelamento_observacoes'));
    }, 100);
    
    if (parcelamentoModal) parcelamentoModal.open();
    
    setTimeout(() => {
      const modalContent = document.querySelector('#parcelamentoModal .modal-content');
      if (modalContent) modalContent.scrollTop = 0;
    }, 100);
  } catch (error) {
    console.error('❌ Erro ao carregar parcelamento:', error);
    M.toast({html: 'Erro ao carregar parcelamento', classes: 'red'});
  }
}

/**
 * Salva parcelamento (criar ou atualizar)
 */
async function salvarParcelamento() {
  try {
    const idParcelamento = document.getElementById('parcelamento_id').value;
    const id_cliente = document.getElementById('parcelamento_id_cliente').value;
    const tipo = document.getElementById('parcelamento_tipo').value.trim();
    const statusParcela = document.getElementById('parcelamento_status_parcela').value.trim();
    const dataEnvio = document.getElementById('parcelamento_data_envio').value || null;
    const modoPagamento = document.getElementById('parcelamento_modo_pagamento').value;
    const observacoes = document.getElementById('parcelamento_observacoes').value.trim();
    
    if (!tipo) {
      M.toast({html: 'Preencha o tipo de parcelamento', classes: 'orange'});
      return;
    }
    
    const parcelamentoData = {
      id_cliente: parseInt(id_cliente),
      tipo_parcelamento: tipo,
      status_parcela: statusParcela || null,
      data_envio_guia: dataEnvio,
      modo_pagamento: modoPagamento,
      observacoes: observacoes || null,
      updated_at: new Date().toISOString()
    };
    
    if (idParcelamento) {
      // Atualizar
      const { error } = await supabaseClient
        .from('parcelamentos')
        .update(parcelamentoData)
        .eq('id_parcelamento', idParcelamento);
      
      if (error) throw error;
      
      await logAuditoria('PARCELAMENTO_ATUALIZADO', id_cliente, `Parcelamento ${tipo} atualizado`);
      M.toast({html: 'Parcelamento atualizado!', classes: 'green'});
    } else {
      // Criar novo
      const { error } = await supabaseClient
        .from('parcelamentos')
        .insert([parcelamentoData]);
      
      if (error) throw error;
      
      await logAuditoria('PARCELAMENTO_CRIADO', id_cliente, `Novo parcelamento: ${tipo}`);
      M.toast({html: 'Parcelamento adicionado!', classes: 'green'});
    }
    
    if (parcelamentoModal) parcelamentoModal.close();
    
    // Recarregar parcelamentos se o modal de visualização estiver aberto
    if (window.currentViewingClienteId) {
      const parcelamentos = await carregarParcelamentos(window.currentViewingClienteId);
      renderParcelamentos(parcelamentos, window.currentViewingClienteId);
    }
    
    verificarNotificacoes(); // Atualizar notificações
  } catch (error) {
    console.error('❌ Erro ao salvar parcelamento:', error);
    M.toast({html: `Erro: ${error.message}`, classes: 'red'});
  }
}

/**
 * Deleta parcelamento
 */
async function deleteParcelamento(idParcelamento, id_cliente) {
  if (!confirm('Tem certeza que deseja excluir este parcelamento?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('parcelamentos')
      .delete()
      .eq('id_parcelamento', idParcelamento);
    
    if (error) throw error;
    
    M.toast({html: 'Parcelamento excluído!', classes: 'green'});
    await logAuditoria('PARCELAMENTO_DELETADO', id_cliente, `Parcelamento ID ${idParcelamento} deletado`);
    
    // Recarregar parcelamentos
    const parcelamentos = await carregarParcelamentos(id_cliente);
    renderParcelamentos(parcelamentos, id_cliente);
  } catch (error) {
    console.error('❌ Erro ao deletar parcelamento:', error);
    M.toast({html: 'Erro ao deletar parcelamento', classes: 'red'});
  }
}

/**
 * Reseta formulário de parcelamento
 */
function resetParcelamentoForm() {
  document.getElementById('parcelamentoForm').reset();
  document.getElementById('parcelamento_id').value = '';
  document.getElementById('parcelamento_id_cliente').value = '';
  M.updateTextFields();
}


// ========================================
// DASHBOARD
// ========================================
async function loadDashboardStats() {
  try {
    const { data: clientes, error } = await supabaseClient.from('clientes').select('*');
    if (error) throw error;

    const stats = {
      totalClientes: clientes.length,
      clientesAtivos: clientes.filter(c => c.situacao === 'Ativo').length,
      clientesVencimento: 0,
      clientesPendencia: 0,
      clientesPorEmpresa: {},
      clientesPorTributacao: {}
    };

    const hoje = new Date();
    const trintaDias = new Date(hoje.getTime() + (30 * 24 * 60 * 60 * 1000));

    clientes.forEach(cliente => {
      stats.clientesPorEmpresa[cliente.empresa_responsavel] = 
        (stats.clientesPorEmpresa[cliente.empresa_responsavel] || 0) + 1;
      
      if (cliente.regime_tributacao) {
        stats.clientesPorTributacao[cliente.regime_tributacao] = 
          (stats.clientesPorTributacao[cliente.regime_tributacao] || 0) + 1;
      }
      
      ['vencimento_iss', 'prazo_efd_reinf', 'prazo_fechamento'].forEach(campo => {
        if (cliente[campo]) {
          const vencimento = new Date(cliente[campo]);
          if (vencimento >= hoje && vencimento <= trintaDias) stats.clientesVencimento++;
        }
      });
      
      if (['status_regularidade_federal', 'status_regularidade_municipal', 
           'status_regularidade_estadual', 'status_regularidade_conselho']
          .some(campo => ['PENDENTE', 'IRREGULAR'].includes(cliente[campo]))) {
        stats.clientesPendencia++;
      }
    });

    document.getElementById('totalClientes').textContent = stats.totalClientes;
    document.getElementById('clientesAtivos').textContent = stats.clientesAtivos;
    document.getElementById('clientesVencimento').textContent = stats.clientesVencimento;
    document.getElementById('clientesPendencia').textContent = stats.clientesPendencia;

    let empresaHtml = '<ul class="collection">';
    for (const [empresa, count] of Object.entries(stats.clientesPorEmpresa)) {
      empresaHtml += `<li class="collection-item"><strong>${empresa}:</strong> ${count}</li>`;
    }
    empresaHtml += '</ul>';
    document.getElementById('clientesPorEmpresa').innerHTML = empresaHtml;

    let tributacaoHtml = '<ul class="collection">';
    if (Object.keys(stats.clientesPorTributacao).length > 0) {
      for (const [regime, count] of Object.entries(stats.clientesPorTributacao)) {
        tributacaoHtml += `<li class="collection-item"><strong>${regime}:</strong> ${count}</li>`;
      }
    } else {
      tributacaoHtml += '<li class="collection-item">Nenhum dado disponível</li>';
    }
    tributacaoHtml += '</ul>';
    document.getElementById('clientesPorTributacao').innerHTML = tributacaoHtml;
  } catch (error) {
    console.error('❌ Erro dashboard:', error);
    M.toast({html: 'Erro ao carregar estatísticas', classes: 'red'});
  }
}


// ========================================
// VALIDAÇÃO DE CPF/CNPJ
// ========================================

/**
 * Remove caracteres não numéricos
 */
function limparDocumento(valor) {
  return valor.replace(/\D/g, '');
}

/**
 * Valida CPF
 */
function validarCPF(cpf) {
  cpf = limparDocumento(cpf);
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Verifica sequências inválidas comuns
  const sequenciasInvalidas = [
    '00000000000', '11111111111', '22222222222', '33333333333',
    '44444444444', '55555555555', '66666666666', '77777777777',
    '88888888888', '99999999999', '12345678909'
  ];
  
  if (sequenciasInvalidas.includes(cpf)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

/**
 * Valida CNPJ
 */
function validarCNPJ(cnpj) {
  cnpj = limparDocumento(cnpj);
  
  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  // Verifica sequências inválidas comuns
  const sequenciasInvalidas = [
    '00000000000000', '11111111111111', '22222222222222', '33333333333333',
    '44444444444444', '55555555555555', '66666666666666', '77777777777777',
    '88888888888888', '99999999999999'
  ];
  
  if (sequenciasInvalidas.includes(cnpj)) return false;
  
  // Validação do primeiro dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

/**
 * Valida CPF ou CNPJ automaticamente
 */
function validarCpfCnpj(valor) {
  const limpo = limparDocumento(valor);
  
  if (limpo.length === 11) {
    return validarCPF(limpo);
  } else if (limpo.length === 14) {
    return validarCNPJ(limpo);
  }
  
  return false;
}

/**
 * Formata CPF/CNPJ para exibição
 */
function formatarCpfCnpj(valor) {
  const limpo = limparDocumento(valor);
  
  if (limpo.length === 11) {
    // Formato CPF: 000.000.000-00
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (limpo.length === 14) {
    // Formato CNPJ: 00.000.000/0000-00
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return valor;
}

/**
 * Valida o campo CPF/CNPJ e exibe feedback visual
 */
function validarCampoCpfCnpj(input) {
  const valor = input.value.trim();
  const errorSpan = document.getElementById('cpf_cnpj_error');
  
  if (!valor) {
    input.classList.remove('valid', 'invalid');
    errorSpan.style.display = 'none';
    return false;
  }
  
  const limpo = limparDocumento(valor);
  
  // Verifica padrões inválidos comuns
  const padroesInvalidos = [
    /^x+$/i,  // xxx...
    /^0+$/,   // 000...
    /^1+$/,   // 111...
    /^9+$/    // 999...
  ];
  
  for (const padrao of padroesInvalidos) {
    if (padrao.test(limpo)) {
      input.classList.remove('valid');
      input.classList.add('invalid');
      errorSpan.textContent = 'CPF/CNPJ inválido. Digite um documento válido.';
      errorSpan.style.display = 'block';
      return false;
    }
  }
  
  // Valida CPF ou CNPJ
  if (validarCpfCnpj(valor)) {
    input.classList.remove('invalid');
    input.classList.add('valid');
    errorSpan.style.display = 'none';
    // Formata o campo
    input.value = formatarCpfCnpj(valor);
    return true;
  } else {
    input.classList.remove('valid');
    input.classList.add('invalid');
    
    if (limpo.length === 11) {
      errorSpan.textContent = 'CPF inválido. Verifique os dígitos.';
    } else if (limpo.length === 14) {
      errorSpan.textContent = 'CNPJ inválido. Verifique os dígitos.';
    } else {
      errorSpan.textContent = 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.';
    }
    
    errorSpan.style.display = 'block';
    return false;
  }
}


// ========================================
// CLIENTES - CRUD
// ========================================
async function loadClientes() {
  try {
    console.log('👥 Carregando clientes...');
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .order('id_cliente', { ascending: true });
    
    if (error) throw error;
    console.log(`✅ ${data.length} clientes carregados`);
    
    appState.clientes.todos = data;
    appState.paginacao.atual = 1;
    processarClientes();
    renderClientes();
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao carregar clientes', classes: 'red'});
  }
}

function renderClientes() {
  const tbody = document.getElementById('clientesTableBody');
  if (!tbody) return;
  
  const clientes = appState.clientes.filtrados;
  
  tbody.innerHTML = '';
  
  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="center-align">Nenhum cliente encontrado</td></tr>';
    document.getElementById('paginacao').innerHTML = '';
    document.getElementById('infoPaginacao').textContent = '';
    return;
  }
  
  // Calcular paginação
  const inicio = (appState.paginacao.atual - 1) * appState.paginacao.porPagina;
  const fim = inicio + appState.paginacao.porPagina;
  const clientesPagina = clientes.slice(inicio, fim);
  
  appState.clientes.exibidos = clientesPagina;
  
  clientesPagina.forEach(cliente => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${cliente.id_cliente}</td>
      <td>${cliente.razao_social || '-'}</td>
      <td>${cliente.cpf_cnpj || '-'}</td>
      <td>${cliente.uf || '-'}</td>
      <td>${cliente.situacao || '-'}</td>
      <td>${cliente.empresa_responsavel ? `<span class="badge-empresa ${getBadgeEmpresaClass(cliente.empresa_responsavel)}">${cliente.empresa_responsavel}</span>` : '-'}</td>
      <td>${cliente.regime_tributacao || '-'}</td>
      <td>
        <a href="#!" class="btn-small blue tooltipped" data-position="top" data-tooltip="Visualizar" onclick="viewCliente(${cliente.id_cliente})">
          <i class="material-icons">visibility</i>
        </a>
      </td>
    `;
  });
  
  renderPaginacao();
  M.Tooltip.init(document.querySelectorAll('.tooltipped'));
}

function renderPaginacao() {
  const paginacaoEl = document.getElementById('paginacao');
  const infoPaginacaoEl = document.getElementById('infoPaginacao');
  const totalClientes = appState.clientes.filtrados.length;
  const totalPaginas = appState.paginacao.total;
  const paginaAtual = appState.paginacao.atual;
  
  if (totalPaginas <= 1) {
    paginacaoEl.innerHTML = '';
    infoPaginacaoEl.textContent = `Mostrando ${totalClientes} cliente(s)`;
    return;
  }
  
  let html = '';
  
  html += `<li class="${paginaAtual === 1 ? 'disabled' : 'waves-effect'}">
    <a href="#!" onclick="mudarPagina(${paginaAtual - 1})"><i class="material-icons">chevron_left</i></a>
  </li>`;
  
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || (i >= paginaAtual - 2 && i <= paginaAtual + 2)) {
      html += `<li class="${i === paginaAtual ? 'active blue' : 'waves-effect'}">
        <a href="#!" onclick="mudarPagina(${i})">${i}</a>
      </li>`;
    } else if (i === paginaAtual - 3 || i === paginaAtual + 3) {
      html += `<li class="disabled"><a href="#!">...</a></li>`;
    }
  }
  
  html += `<li class="${paginaAtual === totalPaginas ? 'disabled' : 'waves-effect'}">
    <a href="#!" onclick="mudarPagina(${paginaAtual + 1})"><i class="material-icons">chevron_right</i></a>
  </li>`;
  
  paginacaoEl.innerHTML = html;
  
  const inicio = (paginaAtual - 1) * appState.paginacao.porPagina + 1;
  const fim = Math.min(paginaAtual * appState.paginacao.porPagina, totalClientes);
  infoPaginacaoEl.textContent = `Mostrando ${inicio} a ${fim} de ${totalClientes} cliente(s) | Página ${paginaAtual} de ${totalPaginas}`;
}

function mudarPagina(novaPagina) {
  if (novaPagina < 1 || novaPagina > appState.paginacao.total) return;
  
  appState.paginacao.atual = novaPagina;
  renderClientes();
  
  document.getElementById('clientesTable').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Função de busca com debounce
const filterClientesDebounced = debounce(function() {
  appState.filtros.busca = document.getElementById('searchCliente').value;
  appState.paginacao.atual = 1;
  processarClientes();
  renderClientes();
}, 300);

function filterClientes() {
  filterClientesDebounced();
}

function openNovoClienteModal() {
  console.log('➕ Novo cliente');
  appState.ui.editingClienteId = null;
  resetClienteForm();
  document.getElementById('clienteModalTitle').textContent = 'Novo Cliente';
  setTimeout(() => {
    M.FormSelect.init(document.querySelectorAll('select'));
    M.updateTextFields();
  }, 100);
  if (appState.modals.cliente) appState.modals.cliente.open();
  setTimeout(() => {
    const modalContent = document.querySelector('#clienteModal .modal-content');
    if (modalContent) modalContent.scrollTop = 0;
  }, 100);
}

async function editCliente(id_cliente) {
  try {
    console.log(`✏️ Editar cliente ${id_cliente}`);
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('id_cliente', id_cliente)
      .single();
    
    if (error) throw error;
    
    // Armazenar dados originais para comparação
    window.dadosOriginaisCliente = { ...data };
    
    appState.ui.editingClienteId = id_cliente;
    document.getElementById('clienteModalTitle').textContent = 'Editar Cliente';
    
    document.getElementById('cliente_id').value = data.id_cliente;
    document.getElementById('empresa_responsavel').value = data.empresa_responsavel || '';
    document.getElementById('squad').value = data.squad || '';
    document.getElementById('razao_social').value = data.razao_social || '';
    document.getElementById('cpf_cnpj').value = data.cpf_cnpj || '';
    document.getElementById('municipio').value = data.municipio || '';
    document.getElementById('uf').value = data.uf || '';
    document.getElementById('situacao').value = data.situacao || '';
    document.getElementById('regime_tributacao').value = data.regime_tributacao || '';
    document.getElementById('faturamento').value = data.faturamento || '';
    document.getElementById('status_parcelamento').value = data.status_parcelamento || '';
    document.getElementById('data_entrada').value = data.data_entrada || '';
    document.getElementById('data_constituicao').value = data.data_constituicao || '';
    document.getElementById('ultima_consulta_fiscal').value = data.ultima_consulta_fiscal || '';
    document.getElementById('vencimento_iss').value = data.vencimento_iss || '';
    document.getElementById('prazo_efd_reinf').value = data.prazo_efd_reinf || '';
    document.getElementById('prazo_fechamento').value = data.prazo_fechamento || '';
    document.getElementById('status_regularidade_federal').value = data.status_regularidade_federal || '';
    document.getElementById('status_regularidade_municipal').value = data.status_regularidade_municipal || '';
    document.getElementById('status_regularidade_estadual').value = data.status_regularidade_estadual || '';
    document.getElementById('status_regularidade_conselho').value = data.status_regularidade_conselho || '';
    document.getElementById('observacoes_regularidade').value = data.observacoes_regularidade || '';
    
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('select'));
      M.updateTextFields();
      M.textareaAutoResize(document.getElementById('observacoes_regularidade'));
    }, 100);
    
    if (appState.modals.cliente) appState.modals.cliente.open();
    setTimeout(() => {
      const modalContent = document.querySelector('#clienteModal .modal-content');
      if (modalContent) modalContent.scrollTop = 0;
    }, 100);
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao carregar cliente', classes: 'red'});
  }
}

async function salvarCliente() {
  try {
    // Validar CPF/CNPJ antes de prosseguir
    const inputCpfCnpj = document.getElementById('cpf_cnpj');
    if (!validarCampoCpfCnpj(inputCpfCnpj)) {
      M.toast({html: 'CPF/CNPJ inválido. Corrija antes de salvar.', classes: 'red'});
      inputCpfCnpj.focus();
      return;
    }
    
    const cpfCnpj = document.getElementById('cpf_cnpj').value.trim();

    // Limpar e validar
    const cpfCnpjLimpo = cpfCnpj.replace(/\s+/g, ''); // Remove espaços

    // SANITIZAR TODOS OS INPUTS ANTES DE PROCESSAR
    const clienteData = {
      empresa_responsavel: sanitizeHTML(document.getElementById('empresa_responsavel').value),
      squad: sanitizeHTML(document.getElementById('squad').value),
      razao_social: sanitizeHTML(document.getElementById('razao_social').value),
      cpf_cnpj: sanitizeAttribute(document.getElementById('cpf_cnpj').value),
      municipio: sanitizeHTML(document.getElementById('municipio').value),
      uf: sanitizeAttribute(document.getElementById('uf').value) || null,
      situacao: sanitizeHTML(document.getElementById('situacao').value),
      regime_tributacao: sanitizeHTML(document.getElementById('regime_tributacao').value) || null,
      faturamento: sanitizeMoney(document.getElementById('faturamento').value),
      status_parcelamento: sanitizeHTML(document.getElementById('status_parcelamento').value) || null,
      data_entrada: document.getElementById('data_entrada').value || null,
      data_constituicao: document.getElementById('data_constituicao').value || null,
      ultima_consulta_fiscal: document.getElementById('ultima_consulta_fiscal').value || null,
      vencimento_iss: document.getElementById('vencimento_iss').value || null,
      prazo_efd_reinf: document.getElementById('prazo_efd_reinf').value || null,
      prazo_fechamento: document.getElementById('prazo_fechamento').value || null,
      status_regularidade_federal: sanitizeHTML(document.getElementById('status_regularidade_federal').value) || null,
      status_regularidade_municipal: sanitizeHTML(document.getElementById('status_regularidade_municipal').value) || null,
      status_regularidade_estadual: sanitizeHTML(document.getElementById('status_regularidade_estadual').value) || null,
      status_regularidade_conselho: sanitizeHTML(document.getElementById('status_regularidade_conselho').value) || null,
      observacoes_regularidade: sanitizeHTML(document.getElementById('observacoes_regularidade').value) || null,
    };

    // Validar campos obrigatórios
    if (!clienteData.empresa_responsavel || !clienteData.razao_social || 
        !clienteData.cpf_cnpj || !clienteData.municipio) {
      M.toast({html: 'Preencha os campos obrigatórios', classes: 'orange'});
      return;
    }
    
    // Validar tamanhos máximos
    if (clienteData.razao_social.length > 255) {
      M.toast({html: 'Razão social muito longa (máx: 255 caracteres)', classes: 'red'});
      return;
    }
    
    if (clienteData.observacoes_regularidade && clienteData.observacoes_regularidade.length > 2000) {
      M.toast({html: 'Observações muito longas (máx: 2000 caracteres)', classes: 'red'});
      return;
    }

    // Resto da função permanece igual...
    if (appState.ui.editingClienteId) {
      const alteracoes = detectarAlteracoes(window.dadosOriginaisCliente, clienteData);
      
      const { error } = await supabaseClient
        .from('clientes')
        .update(clienteData)
        .eq('id_cliente', appState.ui.editingClienteId);
      
      if (error) throw error;
      
      if (Object.keys(alteracoes).length > 0) {
        await registrarHistorico(appState.ui.editingClienteId, 'EDICAO', alteracoes);
      }
      
      await logAuditoria('CLIENTE_ATUALIZADO', appState.ui.editingClienteId, 
        `Cliente ${clienteData.razao_social} atualizado`);
      M.toast({html: 'Cliente atualizado com sucesso!', classes: 'green'});
    } else {
      const { data: novoCliente, error } = await supabaseClient
        .from('clientes')
        .insert([clienteData])
        .select()
        .single();
      
      if (error) throw error;
      
      await registrarHistorico(novoCliente.id_cliente, 'CRIACAO', null, 
        `Cliente criado: ${clienteData.razao_social}`);
      
      await logAuditoria('CLIENTE_CRIADO', novoCliente.id_cliente, 
        `Novo cliente: ${clienteData.razao_social}`);
      M.toast({html: 'Cliente criado com sucesso!', classes: 'green'});
    }

    if (appState.modals.cliente) appState.modals.cliente.close();
    loadClientes();
    verificarNotificacoes();
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    M.toast({html: `Erro: ${error.message}`, classes: 'red'});
  }
}

async function deleteCliente(id_cliente) {
  if (!confirm('Tem certeza que deseja deletar este cliente?')) return;
  
  try {
    // Buscar razão social antes de deletar
    const { data: cliente } = await supabaseClient
      .from('clientes')
      .select('razao_social')
      .eq('id_cliente', id_cliente)
      .single();
    
    // Registrar histórico antes de deletar
    await registrarHistorico(id_cliente, 'EXCLUSAO', null, cliente ? `Cliente deletado: ${cliente.razao_social}` : null);
    
    const { error } = await supabaseClient
      .from('clientes')
      .delete()
      .eq('id_cliente', id_cliente);
    
    if (error) throw error;
    
    M.toast({html: 'Cliente deletado!', classes: 'green'});
    await logAuditoria('CLIENTE_DELETADO', id_cliente, `Cliente ID ${id_cliente} deletado`);
    loadClientes();
    verificarNotificacoes(); // Atualizar notificações
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao deletar', classes: 'red'});
  }
}

async function viewCliente(id_cliente) {
  try {
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('id_cliente', id_cliente)
      .single();
    
    if (error) throw error;
    
    // Armazenar ID globalmente para usar nos botões do modal
    window.currentViewingClienteId = id_cliente;
    
    // Carregar comentários
    const comentarios = await carregarComentarios(id_cliente);
    
    // Carregar parcelamentos
    const parcelamentos = await carregarParcelamentos(id_cliente);

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    };
    
    const formatMoney = (value) => {
      if (!value || value === 0) return 'R$ 0,00';
      return `R$ ${parseFloat(value).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    };
    
    const getSituacaoClass = (situacao) => {
      const classes = {
        'Ativo': 'status-ativo',
        'Inativo': 'status-inativo',
        'Baixada': 'status-baixada'
      };
      return classes[situacao] || 'status-inativo';
    };
    
    const getRegularidadeClass = (status) => {
      const classes = {
        'OK': 'status-ok',
        'PENDENTE': 'status-pendente',
        'IRREGULAR': 'status-irregular'
      };
      return classes[status] || '';
    };
    
       
    const detalhesHtml = `
      <div style="padding: 0;">
        <!-- Cabeçalho -->
        <div style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 30px; margin: -30px -30px 30px -30px; border-radius: 8px 8px 0 0;">
          <h4 style="margin: 0 0 15px 0; font-weight: 500; font-size: 28px;">${data.razao_social}</h4>
          <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
            <span class="status-badge ${getSituacaoClass(data.situacao)}">${data.situacao || '-'}</span>
            <span style="font-size: 16px; opacity: 0.9;"><i class="material-icons tiny" style="vertical-align: middle;">fingerprint</i> Código: #${data.id_cliente}</span>
            <span style="font-size: 16px; opacity: 0.9;"><i class="material-icons tiny" style="vertical-align: middle;">business</i> ${data.empresa_responsavel || '-'}</span>
          </div>
        </div>
        
        <!-- Grid de 2 colunas -->
        <div class="row" style="margin-bottom: 0;">
          <div class="col s12 l6">
            <!-- Informações Básicas -->
            <div class="info-section">
              <h6><i class="material-icons tiny" style="vertical-align: middle;">business</i> Informações Básicas</h6>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">badge</i>CPF/CNPJ:</span>
                <span class="info-value">${data.cpf_cnpj || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">location_on</i>Município:</span>
                <span class="info-value">${data.municipio || '-'}${data.uf ? ' / ' + data.uf : ''}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">group</i>Squad:</span>
                <span class="info-value">${data.squad || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">attach_money</i>Faturamento:</span>
                <span class="info-value" style="font-weight: 600; color: #2e7d32;">${formatMoney(data.faturamento)}</span>
              </div>
            </div>
            
            <!-- Datas Importantes -->
            <div class="info-section">
              <h6><i class="material-icons tiny" style="vertical-align: middle;">event</i> Datas Importantes</h6>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">login</i>Data de Entrada:</span>
                <span class="info-value">${formatDate(data.data_entrada)}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">calendar_today</i>Data de Constituição:</span>
                <span class="info-value">${formatDate(data.data_constituicao)}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">event_note</i>Vencimento ISS:</span>
                <span class="info-value">${formatDate(data.vencimento_iss)}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">assignment</i>Prazo EFD-Reinf:</span>
                <span class="info-value">${formatDate(data.prazo_efd_reinf)}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">event_available</i>Prazo Fechamento:</span>
                <span class="info-value">${formatDate(data.prazo_fechamento)}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">search</i>Última Consulta Fiscal:</span>
                <span class="info-value">${formatDate(data.ultima_consulta_fiscal)}</span>
              </div>
            </div>
          </div>
          
          <div class="col s12 l6">
            <!-- Informações Fiscais -->
            <div class="info-section">
              <h6><i class="material-icons tiny" style="vertical-align: middle;">account_balance</i> Informações Fiscais</h6>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">gavel</i>Regime de Tributação:</span>
                <span class="info-value" style="font-weight: 600;">${data.regime_tributacao || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">payment</i>Status Parcelamento:</span>
                <span class="info-value">${data.status_parcelamento || '-'}</span>
              </div>
            </div>
            
            <!-- Status de Regularidade -->
            <div class="info-section">
              <h6><i class="material-icons tiny" style="vertical-align: middle;">verified_user</i> Status de Regularidade</h6>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">account_balance</i>Federal:</span>
                <span class="info-value">
                  <span class="status-badge ${getRegularidadeClass(data.status_regularidade_federal)}">
                    ${data.status_regularidade_federal || '-'}
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">location_city</i>Municipal:</span>
                <span class="info-value">
                  <span class="status-badge ${getRegularidadeClass(data.status_regularidade_municipal)}">
                    ${data.status_regularidade_municipal || '-'}
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">map</i>Estadual:</span>
                <span class="info-value">
                  <span class="status-badge ${getRegularidadeClass(data.status_regularidade_estadual)}">
                    ${data.status_regularidade_estadual || '-'}
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label"><i class="material-icons">work</i>Conselho:</span>
                <span class="info-value">
                  <span class="status-badge ${getRegularidadeClass(data.status_regularidade_conselho)}">
                    ${data.status_regularidade_conselho || '-'}
                  </span>
                </span>
              </div>
              ${data.observacoes_regularidade ? `
                <div class="alert-box">
                  <strong><i class="material-icons tiny" style="vertical-align: middle;">warning</i> Observações de Regularidade:</strong>
                  <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${sanitizeHTML(data.observacoes_regularidade)}</p>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <!-- Seção de Comentários -->
        <div id="comentariosContainer"></div>

        <!-- Seção de Parcelamentos -->
        <div id="parcelamentosContainer"></div>

      </div>
    `;
    
    document.getElementById('clienteDetalhes').innerHTML = detalhesHtml;
    renderComentarios(comentarios, id_cliente);
    renderParcelamentos(parcelamentos, id_cliente);
    if (appState.modals.viewCliente) appState.modals.viewCliente.open();
    setTimeout(() => {
      const modalContent = document.querySelector('#viewClienteModal .modal-content');
      if (modalContent) modalContent.scrollTop = 0;
    }, 100);
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao visualizar', classes: 'red'});
  }
}

// Funções para os botões do modal de visualização
function editarClienteDoModal() {
  if (window.currentViewingClienteId) {
    if (appState.modals.viewCliente) appState.modals.viewCliente.close();
    editCliente(window.currentViewingClienteId);
  }
}

function deletarClienteDoModal() {
  if (window.currentViewingClienteId) {
    if (appState.modals.viewCliente) appState.modals.viewCliente.close();
    deleteCliente(window.currentViewingClienteId);
  }
}

function resetClienteForm() {
  document.getElementById('clienteForm').reset();
  appState.ui.editingClienteId = null;
  window.dadosOriginaisCliente = null;
  M.updateTextFields();
}

function toggleFiltros() {
  const filtrosPanel = document.getElementById('filtrosAvancados');
  if (filtrosPanel.style.display === 'none') {
    filtrosPanel.style.display = 'block';
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('#filtrosAvancados select'));
    }, 100);
  } else {
    filtrosPanel.style.display = 'none';
  }
}

function aplicarFiltros() {
  appState.filtros.empresa = document.getElementById('filtroEmpresa').value;
  appState.filtros.situacao = document.getElementById('filtroSituacao').value;
  appState.filtros.tributacao = document.getElementById('filtroTributacao').value;
  appState.filtros.uf = document.getElementById('filtroUF').value;
  appState.filtros.busca = document.getElementById('searchCliente').value;
  
  appState.paginacao.atual = 1;
  processarClientes();
  renderClientes();
}

function limparFiltros() {
  document.getElementById('filtroEmpresa').value = '';
  document.getElementById('filtroSituacao').value = '';
  document.getElementById('filtroTributacao').value = '';
  document.getElementById('filtroUF').value = '';
  document.getElementById('searchCliente').value = '';
  
  appState.filtros = {
    busca: '',
    empresa: '',
    situacao: '',
    tributacao: '',
    uf: ''
  };
  
  M.FormSelect.init(document.querySelectorAll('#filtrosAvancados select'));
  M.updateTextFields();
  
  appState.paginacao.atual = 1;
  processarClientes();
  renderClientes();
}

// ========================================
// ORDENAÇÃO
// ========================================
function ordenarPor(campo) {
  if (appState.ordenacao.campo === campo) {
    appState.ordenacao.direcao = appState.ordenacao.direcao === 'asc' ? 'desc' : 'asc';
  } else {
    appState.ordenacao.campo = campo;
    appState.ordenacao.direcao = 'asc';
  }
  
  appState.paginacao.atual = 1;
  processarClientes();
  renderClientes();
}

// ========================================
// EXPORTAÇÃO DE DADOS
// ========================================
function exportarCSV() {
  try {
    const tbody = document.getElementById('clientesTableBody');
    const clientesFiltrados = [];
    
    const rows = tbody.getElementsByTagName('tr');
    if (rows.length > 0 && rows[0].cells.length > 1) {
      for (let row of rows) {
        const id = parseInt(row.cells[0].textContent);
        const cliente = appState.clientes.todos.find(c => c.id_cliente === id);
        if (cliente) clientesFiltrados.push(cliente);
      }
    }
    
    const dadosExportar = clientesFiltrados.length > 0 ? clientesFiltrados : appState.clientes.todos;
    
    if (dadosExportar.length === 0) {
      M.toast({html: 'Nenhum cliente para exportar', classes: 'orange'});
      return;
    }
    
    const headers = [
      'Código', 'Razão Social', 'CPF/CNPJ', 'Município', 'UF', 'Situação',
      'Empresa Responsável', 'Squad', 'Regime de Tributação', 'Faturamento',
      'Status Parcelamento', 'Data Entrada', 'Data Constituição', 'Vencimento ISS',
      'Prazo EFD-Reinf', 'Prazo Fechamento', 'Última Consulta Fiscal',
      'Regularidade Federal', 'Regularidade Municipal', 'Regularidade Estadual',
      'Regularidade Conselho', 'Observações'
    ];
    
    let csv = headers.join(';') + '\n';
    
    dadosExportar.forEach(cliente => {
      const row = [
        cliente.id_cliente,
        `"${(cliente.razao_social || '').replace(/"/g, '""')}"`,
        cliente.cpf_cnpj || '',
        `"${(cliente.municipio || '').replace(/"/g, '""')}"`,
        cliente.uf || '',
        cliente.situacao || '',
        cliente.empresa_responsavel || '',
        cliente.squad || '',
        cliente.regime_tributacao || '',
        cliente.faturamento || '0',
        cliente.status_parcelamento || '',
        cliente.data_entrada || '',
        cliente.data_constituicao || '',
        cliente.vencimento_iss || '',
        cliente.prazo_efd_reinf || '',
        cliente.prazo_fechamento || '',
        cliente.ultima_consulta_fiscal || '',
        cliente.status_regularidade_federal || '',
        cliente.status_regularidade_municipal || '',
        cliente.status_regularidade_estadual || '',
        cliente.status_regularidade_conselho || '',
        `"${(cliente.observacoes || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(';') + '\n';
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    M.toast({html: `${dadosExportar.length} clientes exportados!`, classes: 'green'});
    logAuditoria('EXPORTAR_CSV', null, `Exportados ${dadosExportar.length} clientes em CSV`);
  } catch (error) {
    console.error('❌ Erro ao exportar CSV:', error);
    M.toast({html: 'Erro ao exportar CSV', classes: 'red'});
  }
}

function exportarExcel() {
  try {
    const tbody = document.getElementById('clientesTableBody');
    const clientesFiltrados = [];
    
    const rows = tbody.getElementsByTagName('tr');
    if (rows.length > 0 && rows[0].cells.length > 1) {
      for (let row of rows) {
        const id = parseInt(row.cells[0].textContent);
        const cliente = appState.clientes.todos.find(c => c.id_cliente === id);
        if (cliente) clientesFiltrados.push(cliente);
      }
    }
    
    const dadosExportar = clientesFiltrados.length > 0 ? clientesFiltrados : appState.clientes.todos;
    
    if (dadosExportar.length === 0) {
      M.toast({html: 'Nenhum cliente para exportar', classes: 'orange'});
      return;
    }
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1976d2; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Razão Social</th><th>CPF/CNPJ</th><th>Município</th><th>UF</th>
              <th>Situação</th><th>Empresa</th><th>Squad</th><th>Regime Tributação</th><th>Faturamento</th>
              <th>Status Parcelamento</th><th>Data Entrada</th><th>Data Constituição</th><th>Vencimento ISS</th>
              <th>Prazo EFD-Reinf</th><th>Prazo Fechamento</th><th>Última Consulta Fiscal</th>
              <th>Reg. Federal</th><th>Reg. Municipal</th><th>Reg. Estadual</th><th>Reg. Conselho</th><th>Observações</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    dadosExportar.forEach(cliente => {
      html += `
        <tr>
          <td>${cliente.id_cliente}</td>
          <td>${cliente.razao_social || ''}</td>
          <td>${cliente.cpf_cnpj || ''}</td>
          <td>${cliente.municipio || ''}</td>
          <td>${cliente.uf || ''}</td>
          <td>${cliente.situacao || ''}</td>
          <td>${cliente.empresa_responsavel || ''}</td>
          <td>${cliente.squad || ''}</td>
          <td>${cliente.regime_tributacao || ''}</td>
          <td>${cliente.faturamento || '0'}</td>
          <td>${cliente.status_parcelamento || ''}</td>
          <td>${cliente.data_entrada || ''}</td>
          <td>${cliente.data_constituicao || ''}</td>
          <td>${cliente.vencimento_iss || ''}</td>
          <td>${cliente.prazo_efd_reinf || ''}</td>
          <td>${cliente.prazo_fechamento || ''}</td>
          <td>${cliente.ultima_consulta_fiscal || ''}</td>
          <td>${cliente.status_regularidade_federal || ''}</td>
          <td>${cliente.status_regularidade_municipal || ''}</td>
          <td>${cliente.status_regularidade_estadual || ''}</td>
          <td>${cliente.status_regularidade_conselho || ''}</td>
          <td>${(cliente.observacoes || '').replace(/\n/g, ' ')}</td>
        </tr>
      `;
    });
    
    html += `</tbody></table></body></html>`;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    M.toast({html: `${dadosExportar.length} clientes exportados!`, classes: 'green'});
    logAuditoria('EXPORTAR_EXCEL', null, `Exportados ${dadosExportar.length} clientes em Excel`);
  } catch (error) {
    console.error('❌ Erro ao exportar Excel:', error);
    M.toast({html: 'Erro ao exportar Excel', classes: 'red'});
  }
}

// ========================================
// USUÁRIOS
// ========================================
async function loadUsuarios() {
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .order('email', { ascending: true });
    
    if (error) throw error;
    
    todosUsuarios = data;
    const tbody = document.getElementById('usuariosTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="center-align">Nenhum usuário cadastrado</td></tr>';
      return;
    }
    
    data.forEach(usuario => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${usuario.email}</td>
        <td>${usuario.nome}</td>
        <td>${usuario.empresa}</td>
        <td>${usuario.papel}</td>
        <td>
          <span class="status-badge ${usuario.ativo ? 'status-ativo' : 'status-inativo'}">
            ${usuario.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <a href="#!" class="btn-small green" onclick="editUsuario('${usuario.email}')"><i class="material-icons">edit</i></a>
          <a href="#!" class="btn-small red" onclick="deleteUsuario('${usuario.email}')"><i class="material-icons">delete</i></a>
        </td>
      `;
    });
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao carregar usuários', classes: 'red'});
  }
}

// Filtro de usuários com debounce
let todosUsuarios = [];
let usuariosTimeout = null;

// Modal de usuário
let usuarioModal = null;

// Modal de trocar senha
let trocarSenhaModal = null;

// Auditoria
let todosLogsAuditoria = [];
let logsAuditoriaFiltrados = [];
let auditoriaOrdenacao = {
  campo: 'timestamp',
  direcao: 'desc'
};

function filterUsuarios() {
  clearTimeout(usuariosTimeout);
  usuariosTimeout = setTimeout(() => {
    const searchTerm = document.getElementById('searchUsuario').value.toLowerCase();
    const tbody = document.getElementById('usuariosTableBody');
    
    let usuariosFiltrados = todosUsuarios;
    
    if (searchTerm) {
      usuariosFiltrados = todosUsuarios.filter(usuario => 
        (usuario.email && usuario.email.toLowerCase().includes(searchTerm)) ||
        (usuario.nome && usuario.nome.toLowerCase().includes(searchTerm))
      );
    }
    
    tbody.innerHTML = '';
    
    if (usuariosFiltrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="center-align">Nenhum usuário encontrado</td></tr>';
      return;
    }
    
    usuariosFiltrados.forEach(usuario => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${usuario.email}</td>
        <td>${usuario.nome}</td>
        <td>${usuario.empresa}</td>
        <td>${usuario.papel}</td>
        <td>${usuario.ativo ? 'Sim' : 'Não'}</td>
        <td>
          <a href="#!" class="btn-small green" onclick="editUsuario('${usuario.email}')"><i class="material-icons">edit</i></a>
          <a href="#!" class="btn-small red" onclick="deleteUsuario('${usuario.email}')"><i class="material-icons">delete</i></a>
        </td>
      `;
    });
  }, 300);
}

/**
 * Abre modal para criar novo usuário
 */
function openNovoUsuarioModal() {
  console.log('➕ Novo usuário');
  document.getElementById('usuario_modo_edicao').value = 'false';
  resetUsuarioForm();
  document.getElementById('usuarioModalTitle').textContent = 'Novo Usuário';
  document.getElementById('usuario_email').disabled = false;
  document.getElementById('senhaSection').style.display = 'none';
  document.getElementById('btnTrocarSenha').style.display = 'none';
  
  setTimeout(() => {
    M.FormSelect.init(document.querySelectorAll('#usuarioModal select'));
    M.updateTextFields();
  }, 100);
  
  if (usuarioModal) usuarioModal.open();
  
  setTimeout(() => {
    const modalContent = document.querySelector('#usuarioModal .modal-content');
    if (modalContent) modalContent.scrollTop = 0;
  }, 100);
}

/**
 * Abre modal para editar usuário existente
 */
async function editUsuario(email) {
  try {
    console.log(`✏️ Editar usuário ${email}`);
    
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    
    document.getElementById('usuario_modo_edicao').value = 'true';
    document.getElementById('usuarioModalTitle').textContent = 'Editar Usuário';
    
    document.getElementById('usuario_email').value = data.email;
    document.getElementById('usuario_email').disabled = true;
    document.getElementById('usuario_email_original').value = data.email;
    document.getElementById('usuario_nome').value = data.nome || '';
    document.getElementById('usuario_empresa').value = data.empresa || '';
    document.getElementById('usuario_papel').value = data.papel || '';
    document.getElementById('usuario_status').value = data.ativo ? 'true' : 'false';
    
    // Mostrar seção de senha com botão
    document.getElementById('senhaSection').style.display = 'block';
    document.getElementById('btnTrocarSenha').style.display = 'inline-block';
    document.getElementById('btnTrocarSenha').setAttribute('data-email', data.email);
    
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('#usuarioModal select'));
      M.updateTextFields();
    }, 100);
    
    if (usuarioModal) usuarioModal.open();
    
    setTimeout(() => {
      const modalContent = document.querySelector('#usuarioModal .modal-content');
      if (modalContent) modalContent.scrollTop = 0;
    }, 100);
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao carregar usuário', classes: 'red'});
  }
}

/**
 * Salva usuário (criar ou atualizar)
 */
async function salvarUsuario() {
  try {
    const modoEdicao = document.getElementById('usuario_modo_edicao').value === 'true';
    const email = document.getElementById('usuario_email').value.trim();
    const nome = document.getElementById('usuario_nome').value.trim();
    const empresa = document.getElementById('usuario_empresa').value;
    const papel = document.getElementById('usuario_papel').value;
    const statusNovo = document.getElementById('usuario_status').value === 'true';
    
    if (!email || !nome || !empresa || !papel) {
      M.toast({html: 'Preencha todos os campos obrigatórios', classes: 'orange'});
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      M.toast({html: 'Email inválido', classes: 'red'});
      return;
    }
    
    if (modoEdicao) {
      const emailOriginal = document.getElementById('usuario_email_original').value;
      
      const { data: usuarioAtual } = await supabaseClient
        .from('usuarios')
        .select('ativo, nome')
        .eq('email', emailOriginal)
        .single();
      
      if (usuarioAtual && usuarioAtual.ativo !== statusNovo) {
        const mensagem = statusNovo 
          ? `Tem certeza que deseja ATIVAR o usuário "${usuarioAtual.nome}"?\n\nO usuário poderá acessar o sistema novamente.`
          : `Tem certeza que deseja INATIVAR o usuário "${usuarioAtual.nome}"?\n\nO usuário não poderá mais acessar o sistema.`;
        
        if (!confirm(mensagem)) return;
      }
    }
    
    const usuarioData = {
      email: email,
      nome: nome,
      empresa: empresa,
      papel: papel,
      ativo: statusNovo
    };
    
    if (modoEdicao) {
      const emailOriginal = document.getElementById('usuario_email_original').value;
      
      const { error } = await supabaseClient
        .from('usuarios')
        .update(usuarioData)
        .eq('email', emailOriginal);
      
      if (error) throw error;
      
      const statusMensagem = statusNovo ? 'ativado' : 'inativado';
      await logAuditoria('USUARIO_ATUALIZADO', null, `Usuário ${email} atualizado - Status: ${statusMensagem}`);
      M.toast({html: 'Usuário atualizado com sucesso!', classes: 'green'});
    } else {
      const { data: existente } = await supabaseClient
        .from('usuarios')
        .select('email')
        .eq('email', email)
        .single();
      
      if (existente) {
        M.toast({html: 'Email já cadastrado', classes: 'red'});
        return;
      }
      
      // Senha padrão temporária para novo usuário
      usuarioData.senha = 'temp123456';
      
      const { error } = await supabaseClient
        .from('usuarios')
        .insert([usuarioData]);
      
      if (error) throw error;
      
      await logAuditoria('USUARIO_CRIADO', null, `Novo usuário: ${email}`);
      M.toast({html: 'Usuário criado com sucesso! Senha temporária: temp123456', classes: 'green', displayLength: 6000});
    }
    
    if (usuarioModal) usuarioModal.close();
    loadUsuarios();
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    M.toast({html: `Erro: ${error.message}`, classes: 'red'});
  }
}

/**
 * Abre o modal de trocar senha
 */
function abrirModalTrocarSenha() {
  const email = document.getElementById('usuario_email_original').value;
  const nome = document.getElementById('usuario_nome').value;
  
  document.getElementById('trocarSenhaUsuarioEmail').textContent = `${nome} (${email})`;
  document.getElementById('trocar_senha_email_usuario').value = email;
  document.getElementById('trocar_senha_nova').value = '';
  document.getElementById('trocar_senha_confirmar').value = '';
  
  setTimeout(() => {
    M.updateTextFields();
  }, 100);
  
  if (trocarSenhaModal) trocarSenhaModal.open();
}

/**
 * Salva a nova senha do usuário
 */
async function salvarNovaSenha() {
  try {
    const email = document.getElementById('trocar_senha_email_usuario').value;
    const novaSenha = document.getElementById('trocar_senha_nova').value;
    const confirmarSenha = document.getElementById('trocar_senha_confirmar').value;
    
    if (!novaSenha || novaSenha.length < 6) {
      M.toast({html: 'A senha deve ter no mínimo 6 caracteres', classes: 'orange'});
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      M.toast({html: 'As senhas não coincidem', classes: 'red'});
      return;
    }
    
    const { error } = await supabaseClient
      .from('usuarios')
      .update({ senha: novaSenha })
      .eq('email', email);
    
    if (error) throw error;
    
    await logAuditoria('USUARIO_SENHA_ALTERADA', null, `Senha alterada para usuário ${email}`);
    M.toast({html: 'Senha alterada com sucesso!', classes: 'green'});
    
    if (trocarSenhaModal) trocarSenhaModal.close();
  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    M.toast({html: `Erro: ${error.message}`, classes: 'red'});
  }
}

/**
 * Reseta o formulário de trocar senha
 */
function resetTrocarSenhaForm() {
  document.getElementById('trocarSenhaForm').reset();
  document.getElementById('trocar_senha_email_usuario').value = '';
  M.updateTextFields();
}

/**
 * Deleta usuário
 */
async function deleteUsuario(email) {
  if (appState.user && appState.user.email === email) {
    M.toast({html: 'Você não pode excluir seu próprio usuário', classes: 'red'});
    return;
  }
  
  if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) return;
  
  try {
    const { error } = await supabaseClient
      .from('usuarios')
      .delete()
      .eq('email', email);
    
    if (error) throw error;
    
    M.toast({html: 'Usuário excluído!', classes: 'green'});
    await logAuditoria('USUARIO_DELETADO', null, `Usuário ${email} deletado`);
    loadUsuarios();
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao excluir usuário', classes: 'red'});
  }
}

/**
 * Reseta o formulário de usuário
 */
function resetUsuarioForm() {
  document.getElementById('usuarioForm').reset();
  document.getElementById('usuario_modo_edicao').value = 'false';
  document.getElementById('usuario_email_original').value = '';
  document.getElementById('usuario_email').disabled = false;
  document.getElementById('senhaSection').style.display = 'none';
  document.getElementById('btnTrocarSenha').style.display = 'none';
  M.updateTextFields();
}


/// ========================================
// AUDITORIA
// ========================================
async function loadAuditoria() {
  try {
    const { data, error } = await supabaseClient
      .from('auditoria')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500); // Limitar para performance
    
    if (error) throw error;
    
    todosLogsAuditoria = data;
    logsAuditoriaFiltrados = data;
    renderAuditoria();
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao carregar auditoria', classes: 'red'});
  }
}

async function logAuditoria(acao, id_cliente_afetado, detalhes) {
  try {
    if (!appState.user) return;
    const { error } = await supabaseClient.from('auditoria').insert([{
      email_usuario: appState.user.email,
      acao: acao,
      id_cliente_afetado: id_cliente_afetado,
      detalhes: detalhes
    }]);
    if (error) throw error;
  } catch (error) {
    console.error('❌ Erro auditoria:', error);
  }
}

/**
 * Toggle do painel de filtros de auditoria
 */
function toggleFiltrosAuditoria() {
  const filtrosPanel = document.getElementById('filtrosAuditoria');
  if (filtrosPanel.style.display === 'none') {
    filtrosPanel.style.display = 'block';
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('#filtrosAuditoria select'));
    }, 100);
  } else {
    filtrosPanel.style.display = 'none';
  }
}

/**
 * Aplica filtros na auditoria
 */
function aplicarFiltrosAuditoria() {
  const dataInicio = document.getElementById('filtroAuditoriaDataInicio').value;
  const dataFim = document.getElementById('filtroAuditoriaDataFim').value;
  const usuario = document.getElementById('filtroAuditoriaUsuario').value.toLowerCase().trim();
  const acao = document.getElementById('filtroAuditoriaAcao').value;
  const id_cliente = document.getElementById('filtroAuditoriaCliente').value.trim();
  
  logsAuditoriaFiltrados = todosLogsAuditoria.filter(log => {
    // Filtro de data início
    if (dataInicio) {
      const logData = new Date(log.timestamp);
      const filtroData = new Date(dataInicio);
      if (logData < filtroData) return false;
    }
    
    // Filtro de data fim
    if (dataFim) {
      const logData = new Date(log.timestamp);
      const filtroData = new Date(dataFim);
      filtroData.setHours(23, 59, 59, 999); // Incluir todo o dia
      if (logData > filtroData) return false;
    }
    
    // Filtro de usuário
    if (usuario && !log.email_usuario.toLowerCase().includes(usuario)) {
      return false;
    }
    
    // Filtro de ação
    if (acao && log.acao !== acao) {
      return false;
    }
    
    // Filtro de ID cliente
    if (id_cliente && log.id_cliente_afetado != id_cliente) {
      return false;
    }
    
    return true;
  });
  
  renderAuditoria();
}

/**
 * Limpa filtros de auditoria
 */
function limparFiltrosAuditoria() {
  document.getElementById('filtroAuditoriaDataInicio').value = '';
  document.getElementById('filtroAuditoriaDataFim').value = '';
  document.getElementById('filtroAuditoriaUsuario').value = '';
  document.getElementById('filtroAuditoriaAcao').value = '';
  document.getElementById('filtroAuditoriaCliente').value = '';
  
  M.FormSelect.init(document.querySelectorAll('#filtrosAuditoria select'));
  M.updateTextFields();
  
  logsAuditoriaFiltrados = todosLogsAuditoria;
  renderAuditoria();
}

/**
 * Ordena logs de auditoria
 */
function ordenarAuditoria(campo) {
  if (auditoriaOrdenacao.campo === campo) {
    auditoriaOrdenacao.direcao = auditoriaOrdenacao.direcao === 'asc' ? 'desc' : 'asc';
  } else {
    auditoriaOrdenacao.campo = campo;
    auditoriaOrdenacao.direcao = 'asc';
  }
  
  renderAuditoria();
}

/**
 * Renderiza tabela de auditoria
 */
function renderAuditoria() {
  const tbody = document.getElementById('auditoriaTableBody');
  const infoAuditoria = document.getElementById('infoAuditoria');
  
  // Aplicar ordenação
  const logsOrdenados = [...logsAuditoriaFiltrados].sort((a, b) => {
    let valorA = a[auditoriaOrdenacao.campo];
    let valorB = b[auditoriaOrdenacao.campo];
    
    if (valorA === null || valorA === undefined) valorA = '';
    if (valorB === null || valorB === undefined) valorB = '';
    
    // Para timestamps, comparar como datas
    if (auditoriaOrdenacao.campo === 'timestamp') {
      valorA = new Date(valorA);
      valorB = new Date(valorB);
    } else {
      valorA = String(valorA).toLowerCase();
      valorB = String(valorB).toLowerCase();
    }
    
    if (auditoriaOrdenacao.direcao === 'asc') {
      return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
    } else {
      return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
    }
  });
  
  tbody.innerHTML = '';
  
  if (logsOrdenados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="center-align">Nenhum registro de auditoria encontrado</td></tr>';
    if (infoAuditoria) infoAuditoria.textContent = 'Nenhum registro encontrado';
    return;
  }
  
  logsOrdenados.forEach(log => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${new Date(log.timestamp).toLocaleString('pt-BR')}</td>
      <td>${log.email_usuario}</td>
      <td><span class="badge blue white-text">${log.acao}</span></td>
      <td>${log.id_cliente_afetado || '-'}</td>
      <td>${log.detalhes}</td>
    `;
  });
  
  if (infoAuditoria) {
    infoAuditoria.textContent = `Exibindo ${logsOrdenados.length} de ${todosLogsAuditoria.length} registros`;
  }
}

console.log('✅ app.js carregado!');