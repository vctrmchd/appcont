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
  
  // Aplicar máscaras
  aplicarMascaraCpfCnpj();
  
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
  
  console.log(`✅ ${clientes.length} clientes renderizados`);
}

function filterClientes() {
  const searchTerm = document.getElementById('searchCliente').value.toLowerCase();
  const filteredClientes = allClientes.filter(cliente => 
    (cliente.razao_social && cliente.razao_social.toLowerCase().includes(searchTerm)) || 
    (cliente.cpf_cnpj && cliente.cpf_cnpj.toLowerCase().includes(searchTerm))
  );
  renderClientes(filteredClientes);
}

// Abrir modal para NOVO cliente
function openNovoClienteModal() {
  console.log('➕ Abrir modal de novo cliente');
  editingClienteId = null;
  resetClienteForm();
  document.getElementById('clienteModalTitle').textContent = 'Novo Cliente';
  
  // Reinicializar selects
  setTimeout(() => {
    M.FormSelect.init(document.querySelectorAll('select'));
    M.updateTextFields();
  }, 100);
  
  if (clienteModalInstance) {
    clienteModalInstance.open();
  }
}

// Abrir modal para EDITAR cliente
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
    
    // Reinicializar Materialize
    setTimeout(() => {
      M.FormSelect.init(document.querySelectorAll('select'));
      M.updateTextFields();
      M.textareaAutoResize(document.getElementById('observacoes'));
    }, 100);
    
    if (clienteModalInstance) {
      clienteModalInstance.open();
    }
  } catch (error) {
    console.error('❌ Erro ao carregar cliente para edição:', error);
    M.toast({html: 'Erro ao carregar cliente', classes: 'red'});
  }
}

// Visualizar cliente
async function viewCliente(id_cliente) {
  try {
    console.log(`👁️ Visualizando cliente ${id_cliente}`);
    
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('id_cliente', id_cliente)
      .single();
    
    if (error) throw error;
    
    // Montar HTML com detalhes
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
          <p><strong>Faturamento:</strong> ${data.faturamento ? 'R$ ' + parseFloat(data.faturamento).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '-'}</p>
        </div>
      </div>
      
      <div class="row">
        <div class="col s12 m4">
          <p><strong>Data de Entrada:</strong> ${data.data_entrada ? new Date(data.data_entrada).toLocaleDateString('pt-BR') : '-'}</p>
        </div>
        <div class="col s12 m4">
          <p><strong>Data de Constituição:</strong> ${data.data_constituicao ? new Date(data.data_constituicao).toLocaleDateString('pt-BR') : '-'}</p>
        </div>
        <div class="col s12 m4">
          <p><strong>Última Consulta Fiscal:</strong> ${data.ultima_consulta_fiscal ? new Date(data.ultima_consulta_fiscal).toLocaleDateString('pt-BR') : '-'}</p>
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
    console.error('❌ Erro ao visualizar cliente:', error);
    M.toast({html: 'Erro ao carregar detalhes do cliente', classes: 'red'});
  }
}

// Deletar cliente
async function deleteCliente(id_cliente) {
  if (!confirm('Tem certeza que deseja deletar este cliente? Esta ação não pode ser desfeita.')) {
    console.log('❌ Deleção cancelada pelo usuário');
    return;
  }
  
  try {
    console.log(`🗑️ Deletando cliente ${id_cliente}...`);
    
    // Buscar nome do cliente antes de deletar
    const { data: clienteData } = await supabaseClient
      .from('clientes')
      .select('razao_social')
      .eq('id_cliente', id_cliente)
      .single();
    
    const nomeCliente = clienteData ? clienteData.razao_social : `ID ${id_cliente}`;
    
    // Deletar cliente
    const { error } = await supabaseClient
      .from('clientes')
      .delete()
      .eq('id_cliente', id_cliente);
    
    if (error) throw error;
    
    console.log('✅ Cliente deletado com sucesso');
    M.toast({html: 'Cliente deletado com sucesso!', classes: 'green'});
    
    // Registrar na auditoria
    await logAuditoria('CLIENTE_DELETADO', id_cliente, `Cliente ${nomeCliente} deletado`);
    
    // Recarregar lista
    loadClientes();
    
  } catch (error) {
    console.error('❌ Erro ao deletar cliente:', error);
    M.toast({html: 'Erro ao deletar cliente', classes: 'red'});
  }
}

// Resetar formulário
function resetClienteForm() {
  console.log('🔄 Resetando formulário de cliente');
  
  const form = document.getElementById('clienteForm');
  if (form) {
    form.reset();
  }
  
  document.getElementById('cliente_id').value = '';
  editingClienteId = null;
  
  // Reinicializar Materialize
  setTimeout(() => {
    M.FormSelect.init(document.querySelectorAll('select'));
    M.updateTextFields();
  }, 100);
}

// Salvar cliente (criar ou editar)
async function salvarCliente() {
  try {
    console.log('💾 Salvando cliente...');
    
    // Validar formulário
    const erros = validarFormularioCliente();
    if (erros.length > 0) {
      M.toast({html: `Erros: ${erros.join(', ')}`, classes: 'red', displayLength: 6000});
      return;
    }
    
    // Coletar dados do formulário
    const clienteData = {
      empresa_responsavel: document.getElementById('empresa_responsavel').value.trim(),
      squad: document.getElementById('squad').value.trim(),
      razao_social: document.getElementById('razao_social').value.trim(),
      cpf_cnpj: formatarCpfCnpj(document.getElementById('cpf_cnpj').value.trim()),
      municipio: document.getElementById('municipio').value.trim(),
      situacao: document.getElementById('situacao').value.trim(),
      regime_tributacao: document.getElementById('regime_tributacao').value.trim() || null,
      faturamento: document.getElementById('faturamento').value ? parseFloat(document.getElementById('faturamento').value) : null,
      data_entrada: document.getElementById('data_entrada').value || null,
      data_constituicao: document.getElementById('data_constituicao').value || null,
      ultima_consulta_fiscal: document.getElementById('ultima_consulta_fiscal').value || null,
      observacoes: document.getElementById('observacoes').value.trim() || null
    };
    
    let result;
    let acao;
    
    if (editingClienteId) {
      // EDITAR cliente existente
      console.log(`📝 Editando cliente ID ${editingClienteId}`);
      
      result = await supabaseClient
        .from('clientes')
        .update(clienteData)
        .eq('id_cliente', editingClienteId);
      
      acao = 'CLIENTE_EDITADO';
      
      if (result.error) throw result.error;
      
      M.toast({html: 'Cliente atualizado com sucesso!', classes: 'green'});
      console.log('✅ Cliente editado com sucesso');
      
    } else {
      // CRIAR novo cliente
      console.log('➕ Criando novo cliente');
      
      result = await supabaseClient
        .from('clientes')
        .insert([clienteData])
        .select();
      
      acao = 'CLIENTE_CRIADO';
      
      if (result.error) throw result.error;
      
      M.toast({html: 'Cliente cadastrado com sucesso!', classes: 'green'});
      console.log('✅ Cliente criado com sucesso');
    }
    
    // Registrar na auditoria
    const idCliente = editingClienteId || (result.data && result.data[0] ? result.data[0].id_cliente : null);
    await logAuditoria(acao, idCliente, `Cliente ${clienteData.razao_social} - ${acao.toLowerCase().replace('_', ' ')}`);
    
    // Fechar modal e recarregar lista
    if (clienteModalInstance) {
      clienteModalInstance.close();
    }
    
    loadClientes();
    
  } catch (error) {
    console.error('❌ Erro ao salvar cliente:', error);
    
    if (error.message && error.message.includes('duplicate key')) {
      M.toast({html: 'CPF/CNPJ já cadastrado no sistema', classes: 'red'});
    } else {
      M.toast({html: 'Erro ao salvar cliente. Verifique os dados.', classes: 'red'});
    }
  }
}

// ========================================
// VALIDAÇÕES
// ========================================

// Validar CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
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

// Validar CNPJ
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
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

// Validar CPF ou CNPJ
function validarCpfCnpj(valor) {
  const apenasNumeros = valor.replace(/[^\d]/g, '');
  
  if (apenasNumeros.length === 11) {
    return validarCPF(valor);
  } else if (apenasNumeros.length === 14) {
    return validarCNPJ(valor);
  }
  
  return false;
}

// Formatar CPF/CNPJ
function formatarCpfCnpj(valor) {
  const apenasNumeros = valor.replace(/[^\d]/g, '');
  
  if (apenasNumeros.length === 11) {
    // CPF: 000.000.000-00
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (apenasNumeros.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return apenasNumeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return valor;
}

// Validar formulário de cliente
function validarFormularioCliente() {
  const erros = [];
  
  // Campos obrigatórios
  const empresaResponsavel = document.getElementById('empresa_responsavel').value.trim();
  const squad = document.getElementById('squad').value.trim();
  const razaoSocial = document.getElementById('razao_social').value.trim();
  const cpfCnpj = document.getElementById('cpf_cnpj').value.trim();
  const municipio = document.getElementById('municipio').value.trim();
  const situacao = document.getElementById('situacao').value.trim();
  
  if (!empresaResponsavel) {
    erros.push('Empresa Responsável é obrigatória');
  }
  
  if (!squad) {
    erros.push('Squad é obrigatório');
  }
  
  if (!razaoSocial) {
    erros.push('Razão Social é obrigatória');
  }
  
  if (!cpfCnpj) {
    erros.push('CPF/CNPJ é obrigatório');
  } else if (!validarCpfCnpj(cpfCnpj)) {
    erros.push('CPF/CNPJ inválido');
  }
  
  if (!municipio) {
    erros.push('Município é obrigatório');
  }
  
  if (!situacao) {
    erros.push('Situação é obrigatória');
  }
  
  // Validar faturamento (se preenchido)
  const faturamento = document.getElementById('faturamento').value;
  if (faturamento && parseFloat(faturamento) < 0) {
    erros.push('Faturamento não pode ser negativo');
  }
  
  return erros;
}

// Aplicar máscara de CPF/CNPJ automaticamente
function aplicarMascaraCpfCnpj() {
  const input = document.getElementById('cpf_cnpj');
  if (!input) return;
  
  input.addEventListener('input', function(e) {
    let valor = e.target.value.replace(/[^\d]/g, '');
    
    if (valor.length <= 11) {
      // Máscara CPF: 000.000.000-00
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // Máscara CNPJ: 00.000.000/0000-00
      valor = valor.substring(0, 14);
      valor = valor.replace(/(\d{2})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1/$2');
      valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    e.target.value = valor;
  });
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

