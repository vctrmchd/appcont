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
    viewCliente: null
  },
  ui: {
    editingClienteId: null
  }
};

// Variável auxiliar para debounce
let buscaTimeout = null;

// ========================================
// UTILITÁRIOS
// ========================================

/**
 * Função de debounce - evita execuções repetidas
 * @param {Function} func - Função a ser executada
 * @param {Number} delay - Tempo de espera em ms
 */
function debounce(func, delay = 300) {
  return function(...args) {
    clearTimeout(buscaTimeout);
    buscaTimeout = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Atualiza o estado e renderiza
 */
function atualizarEstado(atualizacao) {
  Object.assign(appState, atualizacao);
  renderClientes();
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

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando aplicação...');
  M.AutoInit();
  
  const clienteModalEl = document.getElementById('clienteModal');
  const viewClienteModalEl = document.getElementById('viewClienteModal');
  
  if (clienteModalEl) {
    appState.modals.cliente = M.Modal.init(clienteModalEl, {
      dismissible: true,
      onCloseEnd: resetClienteForm
    });
  }
  
  if (viewClienteModalEl) {
    appState.modals.viewCliente = M.Modal.init(viewClienteModalEl);
  }
  
  M.FormSelect.init(document.querySelectorAll('select'));
  
  // Inicializar dropdown de exportação
  const dropdowns = document.querySelectorAll('.dropdown-trigger');
  M.Dropdown.init(dropdowns, {
    coverTrigger: false,
    constrainWidth: false
  });
  
  loadUser();
  showDashboard();
});

// ========================================
// GERENCIAMENTO DE USUÁRIO
// ========================================
async function loadUser() {
  try {
    console.log('🔧 Carregando usuário...');
    
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('email', 'admin@sorria.com.br')
      .single();
    
    if (error) throw error;
    
    appState.user = data;
    document.getElementById('userEmailDisplay').textContent = `${data.email} (${data.papel})`;
    console.log('✅ Usuário carregado:', appState.user.email);
    
    if (data.papel !== 'Administrador') {
      const usuariosSection = document.getElementById('usuariosSection');
      const auditoriaSection = document.getElementById('auditoriaSection');
      if (usuariosSection) usuariosSection.classList.add('hidden');
      if (auditoriaSection) auditoriaSection.classList.add('hidden');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar usuário:', error);
    M.toast({html: 'Erro ao carregar usuário', classes: 'red'});
  }
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
    .forEach(id => document.getElementById(id)?.classList.add('hidden'));
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
      <td>${cliente.empresa_responsavel || '-'}</td>
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
    document.getElementById('observacoes').value = data.observacoes || '';
    
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('select'));
      M.updateTextFields();
      M.textareaAutoResize(document.getElementById('observacoes'));
      M.textareaAutoResize(document.getElementById('observacoes_regularidade'));
    }, 100);
    
    if (appState.modals.cliente) appState.modals.cliente.open();
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao carregar cliente', classes: 'red'});
  }
}

async function salvarCliente() {
  try {
    const clienteData = {
      empresa_responsavel: document.getElementById('empresa_responsavel').value,
      squad: document.getElementById('squad').value,
      razao_social: document.getElementById('razao_social').value,
      cpf_cnpj: document.getElementById('cpf_cnpj').value,
      municipio: document.getElementById('municipio').value,
      uf: document.getElementById('uf').value || null,
      situacao: document.getElementById('situacao').value,
      regime_tributacao: document.getElementById('regime_tributacao').value || null,
      faturamento: parseFloat(document.getElementById('faturamento').value) || 0,
      status_parcelamento: document.getElementById('status_parcelamento').value || null,
      data_entrada: document.getElementById('data_entrada').value || null,
      data_constituicao: document.getElementById('data_constituicao').value || null,
      ultima_consulta_fiscal: document.getElementById('ultima_consulta_fiscal').value || null,
      vencimento_iss: document.getElementById('vencimento_iss').value || null,
      prazo_efd_reinf: document.getElementById('prazo_efd_reinf').value || null,
      prazo_fechamento: document.getElementById('prazo_fechamento').value || null,
      status_regularidade_federal: document.getElementById('status_regularidade_federal').value || null,
      status_regularidade_municipal: document.getElementById('status_regularidade_municipal').value || null,
      status_regularidade_estadual: document.getElementById('status_regularidade_estadual').value || null,
      status_regularidade_conselho: document.getElementById('status_regularidade_conselho').value || null,
      observacoes_regularidade: document.getElementById('observacoes_regularidade').value || null,
      observacoes: document.getElementById('observacoes').value || null
    };

    if (!clienteData.empresa_responsavel || !clienteData.razao_social || !clienteData.cpf_cnpj || !clienteData.municipio) {
      M.toast({html: 'Preencha os campos obrigatórios', classes: 'orange'});
      return;
    }

    if (appState.ui.editingClienteId) {
      const { error } = await supabaseClient
        .from('clientes')
        .update(clienteData)
        .eq('id_cliente', appState.ui.editingClienteId);
      
      if (error) throw error;
      
      await logAuditoria('CLIENTE_ATUALIZADO', appState.ui.editingClienteId, `Cliente ${clienteData.razao_social} atualizado`);
      M.toast({html: 'Cliente atualizado com sucesso!', classes: 'green'});
    } else {
      const { error } = await supabaseClient
        .from('clientes')
        .insert([clienteData]);
      
      if (error) throw error;
      
      await logAuditoria('CLIENTE_CRIADO', null, `Novo cliente: ${clienteData.razao_social}`);
      M.toast({html: 'Cliente criado com sucesso!', classes: 'green'});
    }

    if (appState.modals.cliente) appState.modals.cliente.close();
    loadClientes();
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    M.toast({html: `Erro: ${error.message}`, classes: 'red'});
  }
}

async function deleteCliente(id_cliente) {
  if (!confirm('Tem certeza que deseja deletar este cliente?')) return;
  
  try {
    const { error } = await supabaseClient
      .from('clientes')
      .delete()
      .eq('id_cliente', id_cliente);
    
    if (error) throw error;
    
    M.toast({html: 'Cliente deletado!', classes: 'green'});
    await logAuditoria('CLIENTE_DELETADO', id_cliente, `Cliente ID ${id_cliente} deletado`);
    loadClientes();
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
                  <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${data.observacoes_regularidade}</p>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <!-- Observações Gerais (largura total) -->
        ${data.observacoes ? `
        <div class="info-section">
          <h6><i class="material-icons tiny" style="vertical-align: middle;">description</i> Observações Gerais</h6>
          <div class="obs-box">
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${data.observacoes}</p>
          </div>
        </div>
        ` : ''}
      </div>
    `;
    
    document.getElementById('clienteDetalhes').innerHTML = detalhesHtml;
    if (appState.modals.viewCliente) appState.modals.viewCliente.open();
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
        if (cliente) appState.clientes.filtrados.push(cliente);
      }
    }
    
    const dadosExportar = appState.clientes.filtrados.length > 0 ? appState.clientes.filtrados : appState.clientes.todos;
    
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
    
    const tbody = document.getElementById('usuariosTableBody');
    tbody.innerHTML = '';
    
    data.forEach(usuario => {
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
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao carregar usuários', classes: 'red'});
  }
}

function editUsuario(email) {
  M.toast({html: 'Edição de usuário em desenvolvimento', classes: 'blue'});
}

async function deleteUsuario(email) {
  if (!confirm('Deletar este usuário?')) return;
  
  try {
    const { error } = await supabaseClient.from('usuarios').delete().eq('email', email);
    if (error) throw error;
    M.toast({html: 'Usuário deletado!', classes: 'green'});
    await logAuditoria('USUARIO_DELETADO', null, `Usuário ${email} deletado`);
    loadUsuarios();
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao deletar', classes: 'red'});
  }
}

function openNovoUsuarioModal() {
  M.toast({html: 'Criação de usuário em desenvolvimento', classes: 'blue'});
}

// ========================================
// AUDITORIA
// ========================================
async function loadAuditoria() {
  try {
    const { data, error } = await supabaseClient
      .from('auditoria')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    const tbody = document.getElementById('auditoriaTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="center-align">Nenhum log</td></tr>';
      return;
    }
    
    data.forEach(log => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${new Date(log.timestamp).toLocaleString('pt-BR')}</td>
        <td>${log.email_usuario}</td>
        <td>${log.acao}</td>
        <td>${log.id_cliente_afetado || '-'}</td>
        <td>${log.detalhes}</td>
      `;
    });
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

console.log('✅ app.js carregado!');