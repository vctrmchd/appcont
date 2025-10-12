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
    
    if (error) {
      console.error('Erro ao buscar usuário:', error);
      throw error;
    }
    
    currentUser = data;
    document.getElementById('userEmailDisplay').textContent = `${data.email} (${data.papel})`;
    
    console.log('✅ Usuário carregado:', currentUser.email);
    
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
    console.log('👤 Mostrando Usuários');
    hideAllSections();
    document.getElementById('usuariosSection').classList.remove('hidden');
    loadUsuarios();
  } else {
    M.toast({html: 'Você não tem permissão para acessar esta seção.', classes: 'red'});
  }
}

function showAuditoria() {
  if (currentUser && currentUser.papel === 'Administrador') {
    console.log('📋 Mostrando Auditoria');
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
    console.log('📈 Carregando estatísticas do dashboard...');
    
    const { data: clientes, error } = await supabaseClient
      .from('clientes')
      .select('*');
    
    if (error) throw error;
    
    console.log(`✅ ${clientes.length} clientes carregados`);

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

    console.log('✅ Dashboard atualizado');

  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
    M.toast({html: 'Erro ao carregar estatísticas', classes: 'red'});
  }
}

// ========================================
// CLIENTES
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
    console.error('❌ Erro ao carregar clientes:', error);
    M.toast({html: 'Erro ao carregar clientes', classes: 'red'});
  }
}

function renderClientes(clientes) {
  const tbody = document.getElementById('clientesTableBody');
  if (!tbody) {
    console.error('❌ Elemento clientesTableBody não encontrado');
    return;
  }
  
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
  
  console.log(`✅ ${clientes.length} clientes renderizados`);
}

function filterClientes() {
  const searchTerm = document.getElementById('searchCliente').value.toLowerCase();
  console.log(`🔍 Buscando por: "${searchTerm}"`);
  
  const filteredClientes = allClientes.filter(cliente => 
    (cliente.razao_social && cliente.razao_social.toLowerCase().includes(searchTerm)) || 
    (cliente.cpf_cnpj && cliente.cpf_cnpj.toLowerCase().includes(searchTerm))
  );
  
  console.log(`✅ ${filteredClientes.length} clientes encontrados`);
  renderClientes(filteredClientes);
}

async function viewCliente(id_cliente) {
  try {
    console.log(`👁️ Visualizando cliente ${id_cliente}`);
    
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('id_cliente', id_cliente)
      .single();
    
    if (error) throw error;
    
    const detalhes = `
Detalhes do Cliente:

Razão Social: ${data.razao_social}
CPF/CNPJ: ${data.cpf_cnpj}
Município: ${data.municipio}
Situação: ${data.situacao}
Regime de Tributação: ${data.regime_tributacao || '-'}
Faturamento: ${data.faturamento ? `R$ ${data.faturamento.toLocaleString('pt-BR')}` : '-'}
Empresa Responsável: ${data.empresa_responsavel}
    `;
    
    alert(detalhes);
  } catch (error) {
    console.error('❌ Erro ao visualizar cliente:', error);
    M.toast({html: 'Cliente não encontrado', classes: 'red'});
  }
}

function editCliente(id_cliente) {
  console.log(`✏️ Editar cliente ${id_cliente} - Em desenvolvimento`);
  M.toast({html: 'Funcionalidade de edição em desenvolvimento.', classes: 'blue'});
}

async function deleteCliente(id_cliente) {
  if (!confirm('Tem certeza que deseja deletar este cliente?')) {
    console.log('❌ Deleção cancelada pelo usuário');
    return;
  }
  
  try {
    console.log(`🗑️ Deletando cliente ${id_cliente}...`);
    
    const { error } = await supabaseClient
      .from('clientes')
      .delete()
      .eq('id_cliente', id_cliente);
    
    if (error) throw error;
    
    console.log('✅ Cliente deletado com sucesso');
    M.toast({html: 'Cliente deletado com sucesso!', classes: 'green'});
    
    // Registrar na auditoria
    await logAuditoria('CLIENTE_DELETADO', id_cliente, `Cliente com ID ${id_cliente} deletado.`);
    
    loadClientes();
  } catch (error) {
    console.error('❌ Erro ao deletar cliente:', error);
    M.toast({html: 'Erro ao deletar cliente', classes: 'red'});
  }
}

function openNovoClienteModal() {
  console.log('➕ Abrir modal de novo cliente - Em desenvolvimento');
  M.toast({html: 'Funcionalidade em desenvolvimento', classes: 'blue'});
}

// ========================================
// USUÁRIOS
// ========================================
async function loadUsuarios() {
  try {
    console.log('👤 Carregando usuários...');
    
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .order('email', { ascending: true });
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} usuários carregados`);
    
    const tbody = document.getElementById('usuariosTableBody');
    if (!tbody) {
      console.error('❌ Elemento usuariosTableBody não encontrado');
      return;
    }
    
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
          <a href="#!" class="btn-small waves-effect waves-light green" onclick="editUsuario('${usuario.email}')" title="Editar">
            <i class="material-icons">edit</i>
          </a>
          <a href="#!" class="btn-small waves-effect waves-light red" onclick="deleteUsuario('${usuario.email}')" title="Deletar">
            <i class="material-icons">delete</i>
          </a>
        </td>
      `;
    });
  } catch (error) {
    console.error('❌ Erro ao carregar usuários:', error);
    M.toast({html: 'Erro ao carregar usuários', classes: 'red'});
  }
}

function editUsuario(email) {
  console.log(`✏️ Editar usuário ${email} - Em desenvolvimento`);
  M.toast({html: 'Funcionalidade em desenvolvimento', classes: 'blue'});
}

async function deleteUsuario(email) {
  if (!confirm('Tem certeza que deseja deletar este usuário?')) {
    console.log('❌ Deleção cancelada pelo usuário');
    return;
  }
  
  try {
    console.log(`🗑️ Deletando usuário ${email}...`);
    
    const { error } = await supabaseClient
      .from('usuarios')
      .delete()
      .eq('email', email);
    
    if (error) throw error;
    
    console.log('✅ Usuário deletado com sucesso');
    M.toast({html: 'Usuário deletado com sucesso!', classes: 'green'});
    
    await logAuditoria('USUARIO_DELETADO', null, `Usuário ${email} deletado.`);
    
    loadUsuarios();
  } catch (error) {
    console.error('❌ Erro ao deletar usuário:', error);
    M.toast({html: 'Erro ao deletar usuário', classes: 'red'});
  }
}

function openNovoUsuarioModal() {
  console.log('➕ Abrir modal de novo usuário - Em desenvolvimento');
  M.toast({html: 'Funcionalidade em desenvolvimento', classes: 'blue'});
}

// ========================================
// AUDITORIA
// ========================================
async function loadAuditoria() {
  try {
    console.log('📋 Carregando auditoria...');
    
    const { data, error } = await supabaseClient
      .from('auditoria')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    console.log(`✅ ${data.length} logs de auditoria carregados`);
    
    const tbody = document.getElementById('auditoriaTableBody');
    if (!tbody) {
      console.error('❌ Elemento auditoriaTableBody não encontrado');
      return;
    }
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="center-align">Nenhum log de auditoria</td></tr>';
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
    console.error('❌ Erro ao carregar auditoria:', error);
    M.toast({html: 'Erro ao carregar auditoria', classes: 'red'});
  }
}

// Função auxiliar para registrar na auditoria
async function logAuditoria(acao, id_cliente_afetado, detalhes) {
  try {
    if (!currentUser) return;
    
    const { error } = await supabaseClient
      .from('auditoria')
      .insert([{
        email_usuario: currentUser.email,
        acao: acao,
        id_cliente_afetado: id_cliente_afetado,
        detalhes: detalhes
      }]);
    
    if (error) throw error;
    console.log('✅ Log de auditoria registrado:', acao);
  } catch (error) {
    console.error('❌ Erro ao registrar auditoria:', error);
  }
}

console.log('✅ app.js carregado com sucesso!');
