// app.js - Versão Otimizada e Totalmente Compatível
// ========================================
// CONSTANTES E CONFIGURAÇÕES
// ========================================
const CONFIG = {
  DEBUG: true, // Mude para false em produção
  ITEMS_POR_PAGINA: 50,
  DIAS_ALERTA_VENCIMENTO: 30,
  CPF_LENGTH: 11,
  CNPJ_LENGTH: 14
};

// Logger condicional
const logger = {
  info: (...args) => CONFIG.DEBUG && console.log('ℹ️', ...args),
  error: (...args) => console.error('❌', ...args),
  success: (...args) => CONFIG.DEBUG && console.log('✅', ...args),
  warn: (...args) => CONFIG.DEBUG && console.warn('⚠️', ...args)
};

// ========================================
// VARIÁVEIS GLOBAIS (compatibilidade)
// ========================================
let currentUser = null;
let allClientes = [];
let clienteModalInstance = null;
let viewClienteModalInstance = null;
let editingClienteId = null;
let selectInstances = {};
let isLoading = false;

// ========================================
// UTILITÁRIOS
// ========================================
function showLoading(mensagem = 'Carregando...') {
  if (isLoading) return;
  isLoading = true;
  
  let loader = document.getElementById('globalLoader');
  if (!loader) {
    const loaderHtml = `
      <div id="globalLoader" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 9999;">
        <div class="preloader-wrapper big active">
          <div class="spinner-layer spinner-blue-only">
            <div class="circle-clipper left"><div class="circle"></div></div>
            <div class="gap-patch"><div class="circle"></div></div>
            <div class="circle-clipper right"><div class="circle"></div></div>
          </div>
        </div>
        <p id="loaderMessage" style="color: white; margin-top: 20px; font-size: 18px;">${mensagem}</p>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loaderHtml);
  } else {
    document.getElementById('loaderMessage').textContent = mensagem;
    loader.style.display = 'flex';
  }
}

function hideLoading() {
  isLoading = false;
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'none';
}

// ========================================
// VALIDAÇÕES
// ========================================
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== CONFIG.CPF_LENGTH) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let soma = 0;
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== CONFIG.CNPJ_LENGTH) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
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
  if (resultado != digitos.charAt(0)) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(1)) return false;
  
  return true;
}

function validarCpfCnpj(valor) {
  const apenasNumeros = valor.replace(/[^\d]/g, '');
  
  if (apenasNumeros.length === CONFIG.CPF_LENGTH) {
    return validarCPF(valor);
  } else if (apenasNumeros.length === CONFIG.CNPJ_LENGTH) {
    return validarCNPJ(valor);
  }
  
  return false;
}

function formatarCpfCnpj(valor) {
  const apenasNumeros = valor.replace(/[^\d]/g, '');
  
  if (apenasNumeros.length === CONFIG.CPF_LENGTH) {
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (apenasNumeros.length === CONFIG.CNPJ_LENGTH) {
    return apenasNumeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return valor;
}

function validarFormularioCliente() {
  const erros = [];
  
  const empresaResponsavel = document.getElementById('empresa_responsavel').value.trim();
  const squad = document.getElementById('squad').value.trim();
  const razaoSocial = document.getElementById('razao_social').value.trim();
  const cpfCnpj = document.getElementById('cpf_cnpj').value.trim();
  const municipio = document.getElementById('municipio').value.trim();
  const situacao = document.getElementById('situacao').value.trim();
  
  if (!empresaResponsavel) erros.push('Empresa Responsável é obrigatória');
  if (!squad) erros.push('Squad é obrigatório');
  if (!razaoSocial) erros.push('Razão Social é obrigatória');
  if (!cpfCnpj) {
    erros.push('CPF/CNPJ é obrigatório');
  } else if (!validarCpfCnpj(cpfCnpj)) {
    erros.push('CPF/CNPJ inválido');
  }
  if (!municipio) erros.push('Município é obrigatório');
  if (!situacao) erros.push('Situação é obrigatória');
  
  const faturamento = document.getElementById('faturamento').value;
  if (faturamento && parseFloat(faturamento) < 0) {
    erros.push('Faturamento não pode ser negativo');
  }
  
  return erros;
}

// ========================================
// MÁSCARAS
// ========================================
function aplicarMascaraCpfCnpj() {
  const input = document.getElementById('cpf_cnpj');
  if (!input) return;
  
  input.addEventListener('input', function(e) {
    let valor = e.target.value.replace(/[^\d]/g, '');
    
    if (valor.length <= CONFIG.CPF_LENGTH) {
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      valor = valor.substring(0, CONFIG.CNPJ_LENGTH);
      valor = valor.replace(/(\d{2})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1/$2');
      valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    e.target.value = valor;
  });

  input.addEventListener('blur', function(e) {
    const valor = e.target.value;
    if (valor && !validarCpfCnpj(valor)) {
      e.target.classList.add('invalid');
      M.toast({html: 'CPF/CNPJ inválido', classes: 'red'});
    } else {
      e.target.classList.remove('invalid');
    }
  });
}

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  logger.info('Inicializando aplicação...');
  
  // Inicializar Materialize
  M.AutoInit();
  
  // Inicializar modais
  const clienteModalEl = document.getElementById('clienteModal');
  const viewClienteModalEl = document.getElementById('viewClienteModal');
  
  if (clienteModalEl) {
    clienteModalInstance = M.Modal.init(clienteModalEl, {
      dismissible: true,
      onCloseEnd: resetClienteForm
    });
  }
  
  if (viewClienteModalEl) {
    viewClienteModalInstance = M.Modal.init(viewClienteModalEl);
  }
  
  // Inicializar selects
  M.FormSelect.init(document.querySelectorAll('select'));
  
  // Aplicar máscaras
  aplicarMascaraCpfCnpj();
  
  // Detectar conexão offline
  window.addEventListener('online', () => {
    M.toast({html: 'Conexão restaurada!', classes: 'green'});
  });

  window.addEventListener('offline', () => {
    M.toast({html: 'Sem conexão com internet', classes: 'red'});
  });
  
  loadUser();
  showDashboard();
});

// ========================================
// GERENCIAMENTO DE USUÁRIO
// ========================================
async function loadUser() {
  try {
    logger.info('Carregando usuário...');
    
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('email, nome, empresa, papel, ativo')
      .eq('email', 'admin@sorria.com.br')
      .single();
    
    if (error) throw error;
    
    currentUser = data;
    document.getElementById('userEmailDisplay').textContent = `${data.email} (${data.papel})`;
    
    logger.success('Usuário carregado:', currentUser.email);
    
    if (data.papel !== 'Administrador') {
      const usuariosSection = document.getElementById('usuariosSection');
      const auditoriaSection = document.getElementById('auditoriaSection');
      
      if (usuariosSection) usuariosSection.classList.add('hidden');
      if (auditoriaSection) auditoriaSection.classList.add('hidden');
      
      const usuariosLink = document.querySelector('a[onclick="showUsuarios()"]');
      const auditoriaLink = document.querySelector('a[onclick="showAuditoria()"]');
      
      if (usuariosLink) usuariosLink.parentElement.classList.add('hidden');
      if (auditoriaLink) auditoriaLink.parentElement.classList.add('hidden');
    }
  } catch (error) {
    logger.error('Erro ao carregar usuário:', error);
    M.toast({html: 'Erro ao carregar usuário', classes: 'red'});
  }
}

// ========================================
// NAVEGAÇÃO
// ========================================
function showDashboard() {
  logger.info('Mostrando Dashboard');
  hideAllSections();
  document.getElementById('dashboardSection').classList.remove('hidden');
  loadDashboardStats();
}

function showClientes() {
  logger.info('Mostrando Clientes');
  hideAllSections();
  document.getElementById('clientesSection').classList.remove('hidden');
  loadClientes();
}

function showUsuarios() {
  if (currentUser && currentUser.papel === 'Administrador') {
    logger.info('Mostrando Usuários');
    hideAllSections();
    document.getElementById('usuariosSection').classList.remove('hidden');
    loadUsuarios();
  } else {
    M.toast({html: 'Você não tem permissão para acessar esta seção.', classes: 'red'});
  }
}

function showAuditoria() {
  if (currentUser && currentUser.papel === 'Administrador') {
    logger.info('Mostrando Auditoria');
    hideAllSections();
    document.getElementById('auditoriaSection').classList.remove('hidden');
    loadAuditoria();
  } else {
    M.toast({html: 'Você não tem permissão para acessar esta seção.', classes: 'red'});
  }
}

function hideAllSections() {
  ['dashboardSection', 'clientesSection', 'usuariosSection', 'auditoriaSection']
    .forEach(id => {
      const section = document.getElementById(id);
      if (section) section.classList.add('hidden');
    });
}

// ========================================
// DASHBOARD
// ========================================
async function loadDashboardStats() {
  try {
    logger.info('Carregando estatísticas do dashboard...');
    showLoading('Carregando estatísticas...');
    
    const { data: clientes, error } = await supabaseClient
      .from('clientes')
      .select('situacao, empresa_responsavel, regime_tributacao, vencimento_iss, prazo_efd_reinf, prazo_fechamento, status_regularidade_federal, status_regularidade_municipal, status_regularidade_estadual, status_regularidade_conselho');
    
    if (error) throw error;
    
    logger.success(`${clientes.length} clientes carregados`);

    const stats = {
      totalClientes: clientes.length,
      clientesAtivos: 0,
      clientesVencimento: 0,
      clientesPendencia: 0,
      clientesPorEmpresa: {},
      clientesPorTributacao: {}
    };

    const hoje = new Date();
    const trintaDias = new Date(hoje.getTime() + (CONFIG.DIAS_ALERTA_VENCIMENTO * 24 * 60 * 60 * 1000));

    clientes.forEach(cliente => {
      if (cliente.situacao === 'Ativo') stats.clientesAtivos++;
      
      stats.clientesPorEmpresa[cliente.empresa_responsavel] = 
        (stats.clientesPorEmpresa[cliente.empresa_responsavel] || 0) + 1;
      
      if (cliente.regime_tributacao) {
        stats.clientesPorTributacao[cliente.regime_tributacao] = 
          (stats.clientesPorTributacao[cliente.regime_tributacao] || 0) + 1;
      }
      
      ['vencimento_iss', 'prazo_efd_reinf', 'prazo_fechamento'].forEach(campo => {
        if (cliente[campo]) {
          const vencimento = new Date(cliente[campo]);
          if (vencimento >= hoje && vencimento <= trintaDias) {
            stats.clientesVencimento++;
          }
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

    logger.success('Dashboard atualizado');

  } catch (error) {
    logger.error('Erro ao carregar dashboard:', error);
    M.toast({html: 'Erro ao carregar estatísticas', classes: 'red'});
  } finally {
    hideLoading();
  }
}

// ========================================
// CLIENTES
// ========================================
async function loadClientes() {
  try {
    logger.info('Carregando clientes...');
    showLoading('Carregando clientes...');
    
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('id_cliente, razao_social, cpf_cnpj, municipio, situacao, empresa_responsavel')
      .order('id_cliente', { ascending: true });
    
    if (error) throw error;
    
    logger.success(`${data.length} clientes carregados`);
    
    allClientes = data;
    renderClientes(data);
  } catch (error) {
    logger.error('Erro ao carregar clientes:', error);
    M.toast({html: 'Erro ao carregar clientes', classes: 'red'});
  } finally {
    hideLoading();
  }
}

function renderClientes(clientes) {
  const tbody = document.getElementById('clientesTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="center-align">Nenhum cliente cadastrado</td></tr>';
    return;
  }
  
  clientes.forEach(cliente => {
    const row = tbody.insertRow();
    row.className = 'cliente-row';
    row.innerHTML = `
      <td>${cliente.id_cliente}</td>
      <td>${cliente.razao_social || '-'}</td>
      <td>${cliente.cpf_cnpj || '-'}</td>
      <td>${cliente.municipio || '-'}</td>
      <td>${cliente.situacao || '-'}</td>
      <td>${cliente.empresa_responsavel || '-'}</td>
      <td>
        <a href="#!" class="btn-small waves-effect waves-light blue" onclick="viewCliente(${cliente.id_cliente})" title="Visualizar">
          <i class="material-icons">visibility</i>
        </a>
        <a href="#!" class="btn-small waves-effect waves-light green" onclick="editCliente(${cliente.id_cliente})" title="Editar">
          <i class="material-icons">edit</i>
        </a>
        <a href="#!" class="btn-small waves-effect waves-light red" onclick="deleteCliente(${cliente.id_cliente})" title="Deletar">
          <i class="material-icons">delete</i>
        </a>
      </td>
    `;
  });
  
  logger.success(`${clientes.length} clientes renderizados`);
}

function filterClientes() {
  const searchTerm = document.getElementById('searchCliente').value.toLowerCase();
  const filteredClientes = allClientes.filter(cliente => 
    (cliente.razao_social && cliente.razao_social.toLowerCase().includes(searchTerm)) || 
    (cliente.cpf_cnpj && cliente.cpf_cnpj.toLowerCase().includes(searchTerm))
  );
  renderClientes(filteredClientes);
}

function openNovoClienteModal() {
  logger.info('Abrir modal de novo cliente');
  editingClienteId = null;
  resetClienteForm();
  document.getElementById('clienteModalTitle').textContent = 'Novo Cliente';
  
  setTimeout(() => {
    M.FormSelect.init(document.querySelectorAll('select'));
    M.updateTextFields();
  }, 100);
  
  if (clienteModalInstance) {
    clienteModalInstance.open();
  }
}

async function editCliente(id_cliente) {
  try {
    logger.info(`Editar cliente ${id_cliente}`);
    showLoading('Carregando dados do cliente...');
    
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('id_cliente', id_cliente)
      .single();
    
    if (error) throw error;
    
    editingClienteId = id_cliente;
    document.getElementById('clienteModalTitle').textContent = 'Editar Cliente';
    
    // Preencher formulário
    document.getElementById('cliente_id').value = data.id_cliente;
    document.getElementById('empresa_responsavel').value = data.empresa_responsavel || '';
    document.getElementById('squad').value = data.squad || '';
    document.getElementById('razao_social').value = data.razao_social || '';
    document.getElementById('cpf_cnpj').value = data.cpf_cnpj || '';
    document.getElementById('municipio').value = data.municipio || '';
    document.getElementById('situacao').value = data.situacao || '';
    document.getElementById('regime_tributacao').value = data.regime_tributacao || '';
    document.getElementById('faturamento').value = data.faturamento || '';
    document.getElementById('data_entrada').value = data.data_entrada || '';
    document.getElementById('data_constituicao').value = data.data_constituicao || '';
    document.getElementById('ultima_consulta_fiscal').value = data.ultima_consulta_fiscal || '';
    document.getElementById('observacoes').value = data.observacoes || '';
    
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('select'));
      M.updateTextFields();
      M.textareaAutoResize(document.getElementById('observacoes'));
    }, 100);
    
    if (clienteModalInstance) {
      clienteModalInstance.open();
    }
  } catch (error) {
    logger.error('Erro ao carregar cliente para edição:', error);
    M.toast({html: 'Erro ao carregar cliente', classes: 'red'});
  } finally {
    hideLoading();
  }
}

async function viewCliente(id_cliente) {
  try {
    logger.info(`Visualizando cliente ${id_cliente}`);
    showLoading('Carregando detalhes...');
    
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('id_cliente', id_cliente)
      .single();
    
    if (error) throw error;
    
    const formatarMoeda = (valor) => {
      if (!valor) return '-';
      return 'R$ ' + parseFloat(valor).toLocaleString('pt-BR', {minimumFractionDigits: 2});
    };
    
    const formatarData = (data) => {
      if (!data) return '-';
      return new Date(data).toLocaleDateString('pt-BR');
    };
    
    const detalhesHtml = `
      <div class="row">
        <div class="col s12">
          <h5>${data.razao_social}</h5>
        </div>
      </div>
      
      <div class="row">
        <div class="col s12 m6">
          <p><strong>Código:</strong> ${data.id_cliente}</p>
          <p><strong>CPF/CNPJ:</strong> ${data.cpf_cnpj || '-'}</p>
          <p><strong>Município:</strong> ${data.municipio || '-'}</p>
          <p><strong>Situação:</strong> ${data.situacao || '-'}</p>
        </div>
        <div class="col s12 m6">
          <p><strong>Empresa Responsável:</strong> ${data.empresa_responsavel || '-'}</p>
          <p><strong>Squad:</strong> ${data.squad || '-'}</p>
          <p><strong>Regime de Tributação:</strong> ${data.regime_tributacao || '-'}</p>
          <p><strong>Faturamento:</strong> ${formatarMoeda(data.faturamento)}</p>
        </div>
      </div>
      
      <div class="row">
        <div class="col s12 m4">
          <p><strong>Data de Entrada:</strong> ${formatarData(data.data_entrada)}</p>
        </div>
        <div class="col s12 m4">
          <p><strong>Data de Constituição:</strong> ${formatarData(data.data_constituicao)}</p>
        </div>
        <div class="col s12 m4">
          <p><strong>Última Consulta Fiscal:</strong> ${formatarData(data.ultima_consulta_fiscal)}</p>
        </div>
      </div>
      
      ${data.observacoes ? `
      <div class="row">
        <div class="col s12">
          <p><strong>Observações:</strong></p>
          <p>${data.observacoes}</p>
        </div>
      </div>
      ` : ''}
    `;
    
    document.getElementById('clienteDetalhes').innerHTML = detalhesHtml;
    
    if (viewClienteModalInstance) {
      viewClienteModalInstance.open();
    }
    
  } catch (error) {
    logger.error('Erro ao visualizar cliente:', error);
    M.toast({html: 'Erro ao carregar detalhes do cliente', classes: 'red'});
  } finally {
    hideLoading();
  }
}

async function deleteCliente(id_cliente) {
  if (!confirm('Tem certeza que deseja deletar este cliente? Esta ação não pode ser desfeita.')) {
    logger.info('Deleção cancelada pelo usuário');
    return;
  }
  
  try {
    logger.info(`Deletando cliente ${id_cliente}...`);
    showLoading('Deletando cliente...');
    
    const clienteNome = allClientes.find(c => c.id_cliente === id_cliente)?.razao_social || `ID ${id_cliente}`;
    
    const { error } = await supabaseClient
      .from('clientes')
      .delete()
      .eq('id_cliente', id_cliente);
    
    if (error) throw error;
    
    logger.success('Cliente deletado com sucesso');
    M.toast({html: 'Cliente deletado com sucesso!', classes: 'green'});
    
    await logAuditoria('CLIENTE_DELETADO', id_cliente, `Cliente ${clienteNome} deletado`);
    
    // Atualizar lista localmente (otimização)
    allClientes = allClientes.filter(c => c.id_cliente !== id_cliente);
    renderClientes(allClientes);
    
  } catch (error) {
    logger.error('Erro ao deletar cliente:', error);
    M.toast({html: 'Erro ao deletar cliente', classes: 'red'});
  } finally {
    hideLoading();
  }
}

function resetClienteForm() {
  logger.info('Resetando formulário de cliente');
  
  const form = document.getElementById('clienteForm');
  if (form) form.reset();
  
  document.getElementById('cliente_id').value = '';
  editingClienteId = null;
  
  setTimeout(() => {
    M.FormSelect.init(document.querySelectorAll('select'));
    M.updateTextFields();
  }, 100);

// ========================================
// FILTROS AVANÇADOS - Adicionar ao app.js
// ========================================

function aplicarFiltrosAvancados() {
  const filtros = {
    empresa: document.getElementById('filtroEmpresa')?.value || '',
    squad: document.getElementById('filtroSquad')?.value || '',
    regime: document.getElementById('filtroRegime')?.value || '',
    situacao: document.getElementById('filtroSituacao')?.value || '',
    faturamentoMin: parseFloat(document.getElementById('filtroFatMin')?.value) || 0,
    faturamentoMax: parseFloat(document.getElementById('filtroFatMax')?.value) || Infinity,
    dataEntradaInicio: document.getElementById('filtroDataEntradaInicio')?.value || '',
    dataEntradaFim: document.getElementById('filtroDataEntradaFim')?.value || '',
    dataConstituicaoInicio: document.getElementById('filtroDataConstInicio')?.value || '',
    dataConstituicaoFim: document.getElementById('filtroDataConstFim')?.value || '',
    dataConsultaInicio: document.getElementById('filtroDataConsultaInicio')?.value || '',
    dataConsultaFim: document.getElementById('filtroDataConsultaFim')?.value || ''
  };

  const filtrados = allClientes.filter(cliente => {
    if (filtros.empresa && cliente.empresa_responsavel !== filtros.empresa) return false;
    if (filtros.squad && cliente.squad !== filtros.squad) return false;
    if (filtros.regime && cliente.regime_tributacao !== filtros.regime) return false;
    if (filtros.situacao && cliente.situacao !== filtros.situacao) return false;
    
    if (cliente.faturamento) {
      const fat = parseFloat(cliente.faturamento);
      if (fat < filtros.faturamentoMin || fat > filtros.faturamentoMax) return false;
    }
    
    if (filtros.dataEntradaInicio && cliente.data_entrada < filtros.dataEntradaInicio) return false;
    if (filtros.dataEntradaFim && cliente.data_entrada > filtros.dataEntradaFim) return false;
    
    if (filtros.dataConstituicaoInicio && cliente.data_constituicao < filtros.dataConstituicaoInicio) return false;
    if (filtros.dataConstituicaoFim && cliente.data_constituicao > filtros.dataConstituicaoFim) return false;
    
    if (filtros.dataConsultaInicio && cliente.ultima_consulta_fiscal < filtros.dataConsultaInicio) return false;
    if (filtros.dataConsultaFim && cliente.ultima_consulta_fiscal > filtros.dataConsultaFim) return false;
    
    return true;
  });

  renderClientes(filtrados);
  M.toast({html: `${filtrados.length} cliente(s) encontrado(s)`, classes: 'blue'});
}

function limparFiltros() {
  ['filtroEmpresa', 'filtroSquad', 'filtroRegime', 'filtroSituacao', 
   'filtroFatMin', 'filtroFatMax', 'filtroDataEntradaInicio', 'filtroDataEntradaFim',
   'filtroDataConstInicio', 'filtroDataConstFim', 'filtroDataConsultaInicio', 'filtroDataConsultaFim']
  .forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  M.FormSelect.init(document.querySelectorAll('select'));
  renderClientes(allClientes);
  M.toast({html: 'Filtros limpos', classes: 'green'});
}

function toggleFiltros() {
  const filtrosDiv = document.getElementById('filtrosAvancados');
  if (filtrosDiv) {
    filtrosDiv.classList.toggle('hidden');
  }
  setTimeout(() => M.FormSelect.init(document.querySelectorAll('select')), 100);
}
}
