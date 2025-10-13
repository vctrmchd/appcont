// app.js - Lógica completa da aplicação
let currentUser = null;
let allClientes = [];
let clienteModalInstance = null;
let viewClienteModalInstance = null;
let editingClienteId = null;

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando aplicação...');
  M.AutoInit();
  
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
  
  M.FormSelect.init(document.querySelectorAll('select'));
  
  loadUser();
  showDashboard();
});

// ========================================
// GERENCIAMENTO DE USUÁRIO
// ========================================
async function loadUser() {
  try {
    console.log('📧 Carregando usuário...');
    
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('email', 'admin@sorria.com.br')
      .single();
    
    if (error) throw error;
    
    currentUser = data;
    document.getElementById('userEmailDisplay').textContent = `${data.email} (${data.papel})`;
    console.log('✅ Usuário carregado:', currentUser.email);
    
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
  if (currentUser && currentUser.papel === 'Administrador') {
    hideAllSections();
    document.getElementById('usuariosSection').classList.remove('hidden');
    loadUsuarios();
  } else {
    M.toast({html: 'Você não tem permissão.', classes: 'red'});
  }
}

function showAuditoria() {
  if (currentUser && currentUser.papel === 'Administrador') {
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
    allClientes = data;
    renderClientes(data);
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao carregar clientes', classes: 'red'});
  }
}

function renderClientes(clientes) {
  const tbody = document.getElementById('clientesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="center-align">Nenhum cliente</td></tr>';
    return;
  }
  
  clientes.forEach(cliente => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${cliente.id_cliente}</td>
      <td>${cliente.razao_social || '-'}</td>
      <td>${cliente.cpf_cnpj || '-'}</td>
      <td>${cliente.municipio || '-'}</td>
      <td>${cliente.situacao || '-'}</td>
      <td>${cliente.empresa_responsavel || '-'}</td>
      <td>
        <a href="#!" class="btn-small blue" onclick="viewCliente(${cliente.id_cliente})"><i class="material-icons">visibility</i></a>
        <a href="#!" class="btn-small green" onclick="editCliente(${cliente.id_cliente})"><i class="material-icons">edit</i></a>
        <a href="#!" class="btn-small red" onclick="deleteCliente(${cliente.id_cliente})"><i class="material-icons">delete</i></a>
      </td>
    `;
  });
}

function filterClientes() {
  aplicarFiltros(); // Usar a função de filtros avançados
}

function openNovoClienteModal() {
  console.log('➕ Novo cliente');
  editingClienteId = null;
  resetClienteForm();
  document.getElementById('clienteModalTitle').textContent = 'Novo Cliente';
  setTimeout(() => {
    M.FormSelect.init(document.querySelectorAll('select'));
    M.updateTextFields();
  }, 100);
  if (clienteModalInstance) clienteModalInstance.open();
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
    
    editingClienteId = id_cliente;
    document.getElementById('clienteModalTitle').textContent = 'Editar Cliente';
    
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
    
    if (clienteModalInstance) clienteModalInstance.open();
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
      situacao: document.getElementById('situacao').value,
      regime_tributacao: document.getElementById('regime_tributacao').value || null,
      faturamento: parseFloat(document.getElementById('faturamento').value) || 0,
      data_entrada: document.getElementById('data_entrada').value || null,
      data_constituicao: document.getElementById('data_constituicao').value || null,
      ultima_consulta_fiscal: document.getElementById('ultima_consulta_fiscal').value || null,
      observacoes: document.getElementById('observacoes').value || null
    };

    if (!clienteData.empresa_responsavel || !clienteData.razao_social || !clienteData.cpf_cnpj) {
      M.toast({html: 'Preencha os campos obrigatórios', classes: 'orange'});
      return;
    }

    if (editingClienteId) {
      const { error } = await supabaseClient
        .from('clientes')
        .update(clienteData)
        .eq('id_cliente', editingClienteId);
      
      if (error) throw error;
      
      await logAuditoria('CLIENTE_ATUALIZADO', editingClienteId, `Cliente ${clienteData.razao_social} atualizado`);
      M.toast({html: 'Cliente atualizado!', classes: 'green'});
    } else {
      const { error } = await supabaseClient
        .from('clientes')
        .insert([clienteData]);
      
      if (error) throw error;
      
      await logAuditoria('CLIENTE_CRIADO', null, `Novo cliente: ${clienteData.razao_social}`);
      M.toast({html: 'Cliente criado!', classes: 'green'});
    }

    if (clienteModalInstance) clienteModalInstance.close();
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
    
    // Função auxiliar para formatar datas
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    };
    
    // Função auxiliar para formatar valores monetários
    const formatMoney = (value) => {
      if (!value || value === 0) return 'R$ 0,00';
      return `R$ ${parseFloat(value).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    };
    
    // Cor da badge de situação
    const situacaoColor = {
      'Ativo': 'green',
      'Inativo': 'orange',
      'Baixada': 'red'
    };
    
    const detalhesHtml = `
      <div style="padding: 10px 0;">
        <!-- Cabeçalho com nome e situação -->
        <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;">
          <h5 style="margin: 0 0 10px 0; color: #1976d2; font-weight: 500;">${data.razao_social}</h5>
          <span class="new badge ${situacaoColor[data.situacao] || 'grey'}" data-badge-caption="${data.situacao}" style="font-size: 14px; padding: 5px 12px;"></span>
        </div>
        
        <!-- Informações Básicas -->
        <div style="margin-bottom: 25px;">
          <h6 style="color: #424242; font-weight: 500; margin-bottom: 15px; font-size: 16px;">
            <i class="material-icons tiny" style="vertical-align: middle;">business</i> Informações Básicas
          </h6>
          <div class="row" style="margin-bottom: 10px;">
            <div class="col s12 m6">
              <p style="margin: 8px 0;"><strong>Código:</strong> #${data.id_cliente}</p>
              <p style="margin: 8px 0;"><strong>CPF/CNPJ:</strong> ${data.cpf_cnpj || '-'}</p>
              <p style="margin: 8px 0;"><strong>Município:</strong> ${data.municipio || '-'}</p>
            </div>
            <div class="col s12 m6">
              <p style="margin: 8px 0;"><strong>Empresa Responsável:</strong> ${data.empresa_responsavel || '-'}</p>
              <p style="margin: 8px 0;"><strong>Squad:</strong> ${data.squad || '-'}</p>
              <p style="margin: 8px 0;"><strong>Faturamento:</strong> ${formatMoney(data.faturamento)}</p>
            </div>
          </div>
        </div>
        
        <!-- Informações Fiscais -->
        <div style="margin-bottom: 25px;">
          <h6 style="color: #424242; font-weight: 500; margin-bottom: 15px; font-size: 16px;">
            <i class="material-icons tiny" style="vertical-align: middle;">account_balance</i> Informações Fiscais
          </h6>
          <div class="row" style="margin-bottom: 10px;">
            <div class="col s12 m6">
              <p style="margin: 8px 0;"><strong>Regime de Tributação:</strong> ${data.regime_tributacao || '-'}</p>
              <p style="margin: 8px 0;"><strong>Status Parcelamento:</strong> ${data.status_parcelamento || '-'}</p>
            </div>
            <div class="col s12 m6">
              <p style="margin: 8px 0;"><strong>Última Consulta Fiscal:</strong> ${formatDate(data.ultima_consulta_fiscal)}</p>
            </div>
          </div>
        </div>
        
        <!-- Datas Importantes -->
        <div style="margin-bottom: 25px;">
          <h6 style="color: #424242; font-weight: 500; margin-bottom: 15px; font-size: 16px;">
            <i class="material-icons tiny" style="vertical-align: middle;">event</i> Datas Importantes
          </h6>
          <div class="row" style="margin-bottom: 10px;">
            <div class="col s12 m6">
              <p style="margin: 8px 0;"><strong>Data de Entrada:</strong> ${formatDate(data.data_entrada)}</p>
              <p style="margin: 8px 0;"><strong>Data de Constituição:</strong> ${formatDate(data.data_constituicao)}</p>
              <p style="margin: 8px 0;"><strong>Vencimento ISS:</strong> ${formatDate(data.vencimento_iss)}</p>
            </div>
            <div class="col s12 m6">
              <p style="margin: 8px 0;"><strong>Prazo EFD-Reinf:</strong> ${formatDate(data.prazo_efd_reinf)}</p>
              <p style="margin: 8px 0;"><strong>Prazo Fechamento:</strong> ${formatDate(data.prazo_fechamento)}</p>
            </div>
          </div>
        </div>
        
        <!-- Regularidade -->
        <div style="margin-bottom: 25px;">
          <h6 style="color: #424242; font-weight: 500; margin-bottom: 15px; font-size: 16px;">
            <i class="material-icons tiny" style="vertical-align: middle;">verified_user</i> Status de Regularidade
          </h6>
          <div class="row" style="margin-bottom: 10px;">
            <div class="col s12 m6">
              <p style="margin: 8px 0;">
                <strong>Federal:</strong> 
                <span class="badge ${data.status_regularidade_federal === 'OK' ? 'green' : data.status_regularidade_federal === 'PENDENTE' ? 'orange' : 'red'} white-text" style="margin-left: 10px; padding: 4px 10px;">
                  ${data.status_regularidade_federal || '-'}
                </span>
              </p>
              <p style="margin: 8px 0;">
                <strong>Municipal:</strong> 
                <span class="badge ${data.status_regularidade_municipal === 'OK' ? 'green' : data.status_regularidade_municipal === 'PENDENTE' ? 'orange' : 'red'} white-text" style="margin-left: 10px; padding: 4px 10px;">
                  ${data.status_regularidade_municipal || '-'}
                </span>
              </p>
            </div>
            <div class="col s12 m6">
              <p style="margin: 8px 0;">
                <strong>Estadual:</strong> 
                <span class="badge ${data.status_regularidade_estadual === 'OK' ? 'green' : data.status_regularidade_estadual === 'PENDENTE' ? 'orange' : 'red'} white-text" style="margin-left: 10px; padding: 4px 10px;">
                  ${data.status_regularidade_estadual || '-'}
                </span>
              </p>
              <p style="margin: 8px 0;">
                <strong>Conselho:</strong> 
                <span class="badge ${data.status_regularidade_conselho === 'OK' ? 'green' : data.status_regularidade_conselho === 'PENDENTE' ? 'orange' : 'red'} white-text" style="margin-left: 10px; padding: 4px 10px;">
                  ${data.status_regularidade_conselho || '-'}
                </span>
              </p>
            </div>
          </div>
          ${data.observacoes_regularidade ? `
            <div style="margin-top: 15px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
              <p style="margin: 0; color: #856404;"><strong>Observações:</strong> ${data.observacoes_regularidade}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Observações Gerais -->
        ${data.observacoes ? `
        <div style="margin-bottom: 15px;">
          <h6 style="color: #424242; font-weight: 500; margin-bottom: 15px; font-size: 16px;">
            <i class="material-icons tiny" style="vertical-align: middle;">description</i> Observações
          </h6>
          <div style="padding: 15px; background: #f5f5f5; border-radius: 4px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; white-space: pre-wrap;">${data.observacoes}</p>
          </div>
        </div>
        ` : ''}
      </div>
    `;
    
    document.getElementById('clienteDetalhes').innerHTML = detalhesHtml;
    if (viewClienteModalInstance) viewClienteModalInstance.open();
  } catch (error) {
    console.error('❌ Erro:', error);
    M.toast({html: 'Erro ao visualizar', classes: 'red'});
  }
}

function resetClienteForm() {
  document.getElementById('clienteForm').reset();
  editingClienteId = null;
  M.updateTextFields();
}

function toggleFiltros() {
  const filtrosPanel = document.getElementById('filtrosAvancados');
  if (filtrosPanel.style.display === 'none') {
    filtrosPanel.style.display = 'block';
    // Reinicializar selects
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('#filtrosAvancados select'));
    }, 100);
  } else {
    filtrosPanel.style.display = 'none';
  }
}

function aplicarFiltros() {
  const filtroEmpresa = document.getElementById('filtroEmpresa').value;
  const filtroSituacao = document.getElementById('filtroSituacao').value;
  const filtroTributacao = document.getElementById('filtroTributacao').value;
  const searchTerm = document.getElementById('searchCliente').value.toLowerCase();
  
  let filtered = allClientes.filter(cliente => {
    let match = true;
    
    // Filtro de busca textual
    if (searchTerm) {
      match = match && (
        (cliente.razao_social && cliente.razao_social.toLowerCase().includes(searchTerm)) ||
        (cliente.cpf_cnpj && cliente.cpf_cnpj.toLowerCase().includes(searchTerm))
      );
    }
    
    // Filtro de empresa
    if (filtroEmpresa) {
      match = match && cliente.empresa_responsavel === filtroEmpresa;
    }
    
    // Filtro de situação
    if (filtroSituacao) {
      match = match && cliente.situacao === filtroSituacao;
    }
    
    // Filtro de tributação
    if (filtroTributacao) {
      match = match && cliente.regime_tributacao === filtroTributacao;
    }
    
    return match;
  });
  
  renderClientes(filtered);
  M.toast({html: `${filtered.length} cliente(s) encontrado(s)`, classes: 'blue'});
}

function limparFiltros() {
  document.getElementById('filtroEmpresa').value = '';
  document.getElementById('filtroSituacao').value = '';
  document.getElementById('filtroTributacao').value = '';
  document.getElementById('searchCliente').value = '';
  
  // Reinicializar selects
  M.FormSelect.init(document.querySelectorAll('#filtrosAvancados select'));
  M.updateTextFields();
  
  renderClientes(allClientes);
  M.toast({html: 'Filtros limpos', classes: 'blue'});
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
    if (!currentUser) return;
    const { error } = await supabaseClient.from('auditoria').insert([{
      email_usuario: currentUser.email,
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
