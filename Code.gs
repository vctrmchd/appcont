function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('Gestão de Clientes - Sorria/Medic')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Função central para obter o objeto da planilha
function getSpreadsheet() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SCRIPT_PROP_DB_ID');
  if (!spreadsheetId) {
    throw new Error('A propriedade SCRIPT_PROP_DB_ID não está configurada. Por favor, adicione o ID da sua planilha DB_CLIENTES nas propriedades do script.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function getLoggedUser() {
  var email = Session.getActiveUser().getEmail();
  var user = UsuarioController.getUsuarioByEmail(email);
  if (user && user.ativo) {
    return user;
  } else {
    return { email: email, nome: 'Usuário Não Cadastrado', empresa: 'N/A', papel: 'Nenhum', ativo: false };
  }
}

function inicializarPlanilha() {
  var spreadsheet = getSpreadsheet();
  var sheetNames = ['CLIENTES', 'SENHAS', 'USUARIOS', 'AUDITORIA'];
  var headers = {
    'CLIENTES': ['id_cliente', 'empresa_responsavel', 'squad', 'data_entrada', 'razao_social', 'cpf_cnpj', 'data_constituicao', 'municipio', 'situacao', 'regime_tributacao', 'faturamento', 'vencimento_iss', 'prazo_efd_reinf', 'prazo_fechamento', 'status_parcelamento', 'observacoes', 'ultima_consulta_fiscal', 'status_regularidade_federal', 'status_regularidade_municipal', 'status_regularidade_estadual', 'status_regularidade_conselho', 'observacoes_regularidade'],
    'SENHAS': ['id_cliente', 'servico', 'usuario', 'senha_criptografada'],
    'USUARIOS': ['email', 'nome', 'empresa', 'papel', 'ativo'],
    'AUDITORIA': ['timestamp', 'email_usuario', 'acao', 'id_cliente_afetado', 'detalhes']
  };

  sheetNames.forEach(function(name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      sheet.appendRow(headers[name]);
    }
  });
}

function onOpen() {
  inicializarPlanilha();
}

function setup() {
  inicializarPlanilha();
  var spreadsheet = getSpreadsheet();
  var sheetUsuarios = spreadsheet.getSheetByName("USUARIOS");
  if (sheetUsuarios.getLastRow() == 1) { // Apenas o cabeçalho existe
    var adminEmail = Session.getEffectiveUser().getEmail(); // Pega o e-mail do dono do script
    sheetUsuarios.appendRow([adminEmail, "Administrador Padrão", "Sorria", "Administrador", true]);
    AuditoriaController.logAction("USUARIO_CRIADO", null, "Usuário administrador " + adminEmail + " foi configurado com sucesso.");
  }
}
