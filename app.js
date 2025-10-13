// app.js - Versão Otimizada com todas as melhorias
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
// ESTADO DA APLICAÇÃO
// ========================================
const appState = {
  currentUser: null,
  allClientes: [],
  clienteModalInstance: null,
  viewClienteModalInstance: null,
  editingClienteId: null,
  selectInstances: {},
  paginaAtual: 1,
  isLoading: false
};

// ========================================
// UTILITÁRIOS GERAIS
// ========================================
const utils = {
  getValor(id, trim = true) {
    const el = document.getElementById(id);
    if (!el) return '';
    return trim ? el.value.trim() : el.value;
  },

  setValor(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor || '';
  },

  showToast(mensagem, tipo = 'info') {
    const classes = {
      success: 'green',
      error: 'red',
      warning: 'orange',
      info: 'blue'
    };
    M.toast({ html: mensagem, classes: classes[tipo] || 'blue' });
  },

  showLoading(mensagem = 'Carregando...') {
    if (appState.isLoading) return;
    appState.isLoading = true;
    
    const loader = document.getElementById('globalLoader');
    if (!loader) {
      const loaderHtml = `
        <div id="globalLoader" class="loader-overlay">
          <div class="preloader-wrapper big active">
            <div class="spinner-layer spinner-blue-only">
              <div class="circle-clipper left">
                <div class="circle"></div>
              </div>
              <div class="gap-patch">
                <div class="circle"></div>
              </div>
              <div class="circle-clipper right">
                <div class="circle"></div>
              </div>
            </div>
          </div>
          <p id="loaderMessage" class="loader-message">${mensagem}</p>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', loaderHtml);
    } else {
      document.getElementById('loaderMessage').textContent = mensagem;
      loader.classList.remove('hidden');
    }
  },

  hideLoading() {
    appState.isLoading = false;
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.add('hidden');
  },

  confirmar(mensagem) {
    return confirm(mensagem);
  }
};

// ========================================
// VALIDAÇÕES
// ========================================
const validacoes = {
  validarCPF(cpf) {
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
  },

  validarCNPJ(cnpj) {
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
  },

  validarCpfCnpj(valor) {
    const apenasNumeros = valor.replace(/[^\d]/g, '');
    
    if (apenasNumeros.length === CONFIG.CPF_LENGTH) {
      return this.validarCPF(valor);
    } else if (apenasNumeros.length === CONFIG.CNPJ_LENGTH) {
      return this.validarCNPJ(valor);
    }
    
    return false;
  },

  validarData(data, permiteFutura = false) {
    if (!data) return { valido: true }; // Campo opcional
    
    const dataObj = new Date(data);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (isNaN(dataObj.getTime())) {
      return { valido: false, erro: 'Data inválida' };
    }
    
    if (!permiteFutura && dataObj > hoje) {
      return { valido: false, erro: 'Data não pode ser futura' };
    }
    
    return { valido: true };
  },

  validarFaturamento(valor) {
    if (!valor) return { valido: true };
    
    const numero = parseFloat(valor);
    if (isNaN(numero) || numero < 0) {
      return { valido: false, erro: 'Faturamento inválido' };
    }
    
    return { valido: true };
  }
};

// ========================================
// FORMATADORES
// ========================================
const formatadores = {
  formatarCpfCnpj(valor) {
    const apenasNumeros = valor.replace(/[^\d]/g, '');
    
    if (apenasNumeros.length === CONFIG.CPF_LENGTH) {
      return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (apenasNumeros.length === CONFIG.CNPJ_LENGTH) {
      return apenasNumeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return valor;
  },

  formatarMoeda(valor) {
    if (!valor) return '-';
    return 'R$ ' + parseFloat(valor).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  },

  moedaParaNumero(valor) {
    if (!valor) return null;
    return parseFloat(valor.replace(/[^0-9,-]/g, '').replace(',', '.'));
  }
};

// ========================================
// MÁSCARAS DE INPUT
// ========================================
const mascaras = {
  aplicarMascaraCpfCnpj() {
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

    // Validação em tempo real
    input.addEventListener('blur', function(e) {
      const valor = e.target.value;
      if (valor && !validacoes.validarCpfCnpj(valor)) {
        e.target.classList.add('invalid');
        utils.showToast('CPF/CNPJ inválido', 'error');
      } else {
        e.target.classList.remove('invalid');
      }
    });
  },

  aplicarMascaraFaturamento() {
    const input = document.getElementById('faturamento');
    if (!input) return;
    
    input.addEventListener('input', function(e) {
      let valor = e.target.value.replace(/\D/g, '');
      valor = (parseInt(valor || 0) / 100).toFixed(2);
      e.target.value = valor;
    });
  }
};

// ========================================
// GERENCIAMENTO DE MATERIALIZE
// ========================================
const materialize = {
  initSelects() {
    const selects = document.querySelectorAll('select');
    selects.forEach(el => {
      if (el.id && !appState.selectInstances[el.id]) {
        appState.selectInstances[el.id] = M.FormSelect.init(el);
      } else if (!el.id) {
        M.FormSelect.init(el);
      }
    });
  },

  updateTextFields() {
    M.updateTextFields();
  },

  destroySelects() {
    Object.values(appState.selectInstances).forEach(instance => {
      if (instance && instance.destroy) {
        instance.destroy();
      }
    });
    appState.selectInstances = {};
  }
};

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  logger.info('Inicializando aplicação...');
  
  // Adicionar CSS do loader
  const style = document.createElement('style');
  style.textContent = `
    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    .loader-overlay.hidden {
      display: none;
    }
    .loader-message {
      color: white;
      margin-top: 20px;
      font-size: 18px;
    }
  `;
  document.head.appendChild(style);
  
  // Inicializar Materialize
  M.AutoInit();
  
  // Inicializar modais
  const clienteModalEl = document.getElementById('clienteModal');
  const viewClienteModalEl = document.getElementById('viewClienteModal');
  
  if (clienteModalEl) {
    appState.clienteModalInstance = M.Modal.init(clienteModalEl, {
      dismissible: true,
      onCloseEnd: clienteModule.resetForm
    });
  }
  
  if (viewClienteModalEl) {
    appState.viewClienteModalInstance = M.Modal.init(viewClienteModalEl);
  }
  
  // Aplicar máscaras
  mascaras.aplicarMascaraCpfCnpj();
  mascaras.aplicarMascaraFaturamento();
  
  // Detectar conexão offline
  window.addEventListener('online', () => {
    utils.showToast('Conexão restaurada!', 'success');
  });

  window.addEventListener('offline', () => {
    utils.showToast('Sem conexão com internet', 'error');
  });
  
  userModule.load();
  navegacao.showDashboard();
});

// ========================================
// MÓDULO DE USUÁRIO
// ========================================
const userModule = {
  async load() {
    try {
      logger.info('Carregando usuário...');
      
      const { data, error } = await supabaseClient
        .from('usuarios')
        .select('email, nome, empresa, papel, ativo')
        .eq('email', 'admin@sorria.com.br')
        .single();
      
      if (error) throw error;
      
      appState.currentUser = data;
      document.getElementById('userEmailDisplay').textContent = 
        `${data.email} (${data.papel})`;
      
      logger.success('Usuário carregado:', appState.currentUser.email);
      
      this.ajustarPermissoes();
    } catch (error) {
      logger.error('Erro ao carregar usuário:', error);
      utils.showToast('Erro ao carregar usuário', 'error');
    }
  },

  ajustarPermissoes() {
    if (appState.currentUser.papel !== 'Administrador') {
      const elementos = [
        'usuariosSection',
        'auditoriaSection',
        document.querySelector('a[onclick="showUsuarios()"]')?.parentElement,
        document.querySelector('a[onclick="showAuditoria()"]')?.parentElement
      ];
      
      elementos.forEach(el => {
        if (el) el.classList.add('hidden');
      });
    }
  },

  verificarPermissao(permissaoNecessaria = 'Administrador') {
    if (!appState.currentUser || appState.currentUser.papel !== permissaoNecessaria) {
      utils.showToast('Você não tem permissão para acessar esta seção.', 'error');
      return false;
    }
    return true;
  }
};

// ========================================
// NAVEGAÇÃO
// ========================================
const navegacao = {
  showDashboard() {
    logger.info('Mostrando Dashboard');
    this.hideAllSections();
    document.getElementById('dashboardSection').classList.remove('hidden');
    dashboardModule.loadStats();
  },

  showClientes() {
    logger.info('Mostrando Clientes');
    this.hideAllSections();
    document.getElementById('clientesSection').classList.remove('hidden');
    clienteModule.load();
  },

  showUsuarios() {
    if (!userModule.verificarPermissao()) return;
    
    logger.info('Mostrando Usuários');
    this.hideAllSections();
    document.getElementById('usuariosSection').classList.remove('hidden');
    usuarioModule.load();
  },

  showAuditoria() {
    if (!userModule.verificarPermissao()) return;
    
    logger.info('Mostrando Auditoria');
    this.hideAllSections();
    document.getElementById('auditoriaSection').classList.remove('hidden');
    auditoriaModule.load();
  },

  hideAllSections() {
    ['dashboardSection', 'clientesSection', 'usuariosSection', 'auditoriaSection']
      .forEach(id => {
        const section = document.getElementById(id);
        if (section) section.classList.add('hidden');
      });
  }
};

// Funções globais para navegação (chamadas pelo HTML)
function showDashboard() { navegacao.showDashboard(); }
function showClientes() { navegacao.showClientes(); }
function showUsuarios() { navegacao.showUsuarios(); }
function showAuditoria() { navegacao.showAuditoria(); }

// ========================================
// MÓDULO DE DASHBOARD
// ========================================
const dashboardModule = {
  async loadStats() {
    try {
      logger.info('Carregando estatísticas do dashboard...');
      utils.showLoading('Carregando estatísticas...');
      
      const { data: clientes, error } = await supabaseClient
        .from('clientes')
        .select('situacao, empresa_responsavel, regime_tributacao, vencimento_iss, prazo_efd_reinf, prazo_fechamento, status_regularidade_federal, status_regularidade_municipal, status_regularidade_estadual, status_regularidade_conselho');
      
      if (error) throw error;
      
      logger.success(`${clientes.length} clientes carregados`);

      const stats = this.calcularEstatisticas(clientes);
      this.renderizarEstatisticas(stats);

      logger.success('Dashboard atualizado');
    } catch (error) {
      logger.error('Erro ao carregar dashboard:', error);
      utils.showToast('Erro ao carregar estatísticas', 'error');
    } finally {
      utils.hideLoading();
    }
  },

  calcularEstatisticas(clientes) {
    const stats = {
      totalClientes: clientes.length,
      clientesAtivos: 0,
      clientesVencimento: 0,
      clientesPendencia: 0,
      clientesPorEmpresa: {},
      clientesPorTributacao: {}
    };

    const hoje = new Date();
    const dataLimite = new Date(hoje.getTime() + (CONFIG.DIAS_ALERTA_VENCIMENTO * 24 * 60 * 60 * 1000));

    clientes.forEach(cliente => {
      if (cliente.situacao === 'Ativo') stats.clientesAtivos++;
      
      stats.clientesPorEmpresa[cliente.empresa_responsavel] = 
        (stats.clientesPorEmpresa[cliente.empresa_responsavel] || 0) + 1;
      
      if (cliente.regime_tributacao) {
        stats.clientesPorTributacao[cliente.regime_tributacao] = 
          (stats.clientesPorTributacao[cliente.regime_tributacao] || 0) + 1;
      }
      
      const camposVencimento = ['vencimento_iss', 'prazo_efd_reinf', 'prazo_fechamento'];
      if (camposVencimento.some(campo => {
        if (!cliente[campo]) return false;
        const vencimento = new Date(cliente[campo]);
        return vencimento >= hoje && vencimento <= dataLimite;
      })) {
        stats.clientesVencimento++;
      }
      
      const camposRegularidade = [
        'status_regularidade_federal',
        'status_regularidade_municipal', 
        'status_regularidade_estadual',
        'status_regularidade_conselho'
      ];
      
      if (camposRegularidade.some(campo => 
        ['PENDENTE', 'IRREGULAR'].includes(cliente[campo])
      )) {
        stats.clientesPendencia++;
      }
    });

    return stats;
  },

  renderizarEstatisticas(stats) {
    document.getElementById('totalClientes').textContent = stats.totalClientes;
    document.getElementById('clientesAtivos').textContent = stats.clientesAtivos;
    document.getElementById('clientesVencimento').textContent = stats.clientesVencimento;
    document.getElementById('clientesPendencia').textContent = stats.clientesPendencia;

    this.renderizarLista('clientesPorEmpresa', stats.clientesPorEmpresa);
    this.renderizarLista('clientesPorTributacao', stats.clientesPorTributacao);
  },

  renderizarLista(elementId, dados) {
    const element = document.getElementById(elementId);
    if (!element) return;

    let html = '<ul class="collection">';
    
    if (Object.keys(dados).length > 0) {
      for (const [chave, valor] of Object.entries(dados)) {
        html += `<li class="collection-item"><strong>${chave}:</strong> ${valor}</li>`;
      }
    } else {
      html += '<li class="collection-item">Nenhum dado disponível</li>';
    }
    
    html += '</ul>';
    element.innerHTML = html;
  }
};

// ========================================
// MÓDULO DE CLIENTES
// ========================================
const clienteModule = {
  async load(pagina = 1) {
    try {
      logger.info('Carregando clientes...');
      utils.showLoading('Carregando clientes...');
      
      const { data, error } = await supabaseClient
        .from('clientes')
        .select('id_cliente, razao_social, cpf_cnpj, municipio, situacao, empresa_responsavel')
        .order('id_cliente', { ascending: true });
      
      if (error) throw error;
      
      logger.success(`${data.length} clientes carregados`);
      
      appState.allClientes = data;
      appState.paginaAtual = pagina;
      this.render(data);
    } catch (error) {
      logger.error('Erro ao carregar clientes:', error);
      utils.showToast('Erro ao carregar clientes', 'error');
    } finally {
      utils.hideLoading();
    }
  },

  render(clientes) {
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
  },

  filter() {
    const searchTerm = utils.getValor('searchCliente').toLowerCase();
    const filteredClientes = appState.allClientes.filter(cliente => 
      (cliente.razao_social && cliente.razao_social.toLowerCase().includes(searchTerm)) || 
      (cliente.cpf_cnpj && cliente.cpf_cnpj.toLowerCase().includes(searchTerm))
    );
    this.render(filteredClientes);
  },

  openNovoModal() {
    logger.info('Abrir modal de novo cliente');
    appState.editingClienteId = null;
    this.resetForm();
    document.getElementById('clienteModalTitle').textContent = 'Novo Cliente';
    
    setTimeout(() => {
      materialize.initSelects();
      materialize.updateTextFields();
    }, 100);
    
    if (appState.clienteModalInstance) {
      appState.clienteModalInstance.open();
    }
  },

  async edit(id_cliente) {
    try {
      logger.info(`Editar cliente ${id_cliente}`);
      utils.showLoading('Carregando dados do cliente...');
      
      const { data, error } = await supabaseClient
        .from('clientes')
        .select('*')
        .eq('id_cliente', id_cliente)
        .single();
      
      if (error) throw error;
      
      appState.editingClienteId = id_cliente;
      document.getElementById('clienteModalTitle').textContent = 'Editar Cliente';
      
      this.preencherFormulario(data);
      
      setTimeout(() => {
        materialize.initSelects();
        materialize.updateTextFields();
        M.textareaAutoResize(document.getElementById('observacoes'));
      }, 100);
      
      if (appState.clienteModalInstance) {
        appState.clienteModalInstance.open();
      }
    } catch (error) {
      logger.error('Erro ao carregar cliente para edição:', error);
      utils.showToast('Erro ao carregar cliente', 'error');
    } finally {
      utils.hideLoading();
    }
  },

  preencherFormulario(data) {
    const campos = [
      'cliente_id', 'empresa_responsavel', 'squad', 'razao_social', 
      'cpf_cnpj', 'municipio', 'situacao', 'regime_tributacao', 
      'faturamento', 'data_entrada', 'data_constituicao', 
      'ultima_consulta_fiscal', 'observacoes'
    ];
    
    campos.forEach(campo => {
      utils.setValor(campo, data[campo]);
    });
  },

  async view(id_cliente) {
    try {
      logger.info(`Visualizando cliente ${id_cliente}`);
      utils.showLoading('Carregando detalhes...');
      
      const { data, error } = await supabaseClient
        .from('clientes')
        .select('*')
        .eq('id_cliente', id_cliente)
        .single();
      
      if (error) throw error;
      
      this.renderizarDetalhes(data);
      
      if (appState.viewClienteModalInstance) {
        appState.viewClienteModalInstance.open();
      }
    } catch (error) {
      logger.error('Erro ao visualizar cliente:', error);
      utils.showToast('Erro ao carregar detalhes do cliente', 'error');
    } finally {
      utils.hideLoading();
    }
  },

  renderizarDetalhes(data) {
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
          <p><strong>Faturamento:</strong> ${formatadores.formatarMoeda(data.faturamento)}</p>
        </div>
      </div>
      
      <div class="row">
        <div class="col s12 m4">
          <p><strong>Data de Entrada:</strong> ${formatadores.formatarData(data.data_entrada)}</p>
        </div>
        <div class="col s12 m4">
          <p><strong>Data de Constituição:</strong> ${formatadores.formatarData(data.data_constituicao)}</p>
        </div>
        <div class="col s12 m4">
          <p><strong>Última Consulta Fiscal:</strong> ${formatadores.formatarData(data.ultima_consulta_fiscal)}</p>
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
  },

  async delete(id_cliente) {
    if (!utils.confirmar('Tem certeza que deseja deletar este cliente? Esta ação não pode ser desfeita.')) {
      logger.info('Deleção cancelada
