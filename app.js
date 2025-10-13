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
    
    const detalhesHtml = `
      <table class="striped">
        <tr><th>Código:</th><td>${data.id_cliente}</td></tr>
        <tr><th>Razão Social:</th><td>${data.razao_social}</td></tr>
        <tr><th>CPF/CNPJ:</th><td>${data.cpf_cnpj}</td></tr>
        <tr><th>Município:</th><td>${data.municipio}</td></tr>
        <tr><th>Situação:</th><td>${data.situacao}</td></tr>
        <tr><th>Empresa:</th><td>${data.empresa_responsavel}</td></tr>
        <tr><th>Regime:</th><td>${data.regime_tributacao || '-'}</td></tr>
        <tr><th>Faturamento:</th><td>R$ ${(data.faturamento || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td></tr>
        <tr><th>Observações:</th><td>${data.observacoes || '-'}</td></tr>
      </table>
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
