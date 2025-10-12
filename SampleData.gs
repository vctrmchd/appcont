var SampleData = {
  createSampleData: function() {
    var spreadsheet = getSpreadsheet();

    // Limpar dados existentes (manter cabeçalhos)
    var sheetClientes = spreadsheet.getSheetByName('CLIENTES');
    if (sheetClientes && sheetClientes.getLastRow() > 1) sheetClientes.deleteRows(2, sheetClientes.getLastRow() - 1);
    var sheetSenhas = spreadsheet.getSheetByName('SENHAS');
    if (sheetSenhas && sheetSenhas.getLastRow() > 1) sheetSenhas.deleteRows(2, sheetSenhas.getLastRow() - 1);
    var sheetUsuarios = spreadsheet.getSheetByName('USUARIOS');
    if (sheetUsuarios && sheetUsuarios.getLastRow() > 1) sheetUsuarios.deleteRows(2, sheetUsuarios.getLastRow() - 1);
    var sheetAuditoria = spreadsheet.getSheetByName('AUDITORIA');
    if (sheetAuditoria && sheetAuditoria.getLastRow() > 1) sheetAuditoria.deleteRows(2, sheetAuditoria.getLastRow() - 1);

    // Dados de Usuários
    var sampleUsers = [
      ['admin@sorria.com.br', 'Admin Sorria', 'Sorria', 'Administrador', true],
      ['gerente@sorria.com.br', 'Gerente Sorria', 'Sorria', 'Gerente', true],
      ['atendente@sorria.com.br', 'Atendente Sorria', 'Sorria', 'Atendente', true],
      ['admin@medic.com.br', 'Admin Medic', 'Medic', 'Administrador', true],
      ['gerente@medic.com.br', 'Gerente Medic', 'Medic', 'Gerente', true],
      ['atendente@medic.com.br', 'Atendente Medic', 'Medic', 'Atendente', true],
      ['inativo@sorria.com.br', 'Usuário Inativo', 'Sorria', 'Atendente', false]
    ];
    sheetUsuarios.getRange(sheetUsuarios.getLastRow() + 1, 1, sampleUsers.length, sampleUsers[0].length).setValues(sampleUsers);

    // Dados de Clientes
    var sampleClients = [
      [1, 'Sorria', '1', new Date('2023-01-15'), 'Cliente Alpha Ltda', '11.111.111/0001-11', new Date('2022-03-10'), 'São Paulo/SP', 'Ativo', 'Simples Nacional', 150000.00, new Date('2025-10-20'), new Date('2025-10-25'), new Date('2025-10-30'), 'NÃO', 'Observação Alpha', new Date('2025-09-01'), 'OK', 'OK', 'OK', 'OK', ''],
      [2, 'Medic', '2', new Date('2023-02-01'), 'Clínica Beta S.A.', '22.222.222/0001-22', new Date('2021-05-20'), 'Rio de Janeiro/RJ', 'Ativo', 'Lucro Presumido', 250000.00, new Date('2025-11-10'), new Date('2025-11-15'), new Date('2025-11-20'), 'SIM', 'Observação Beta', new Date('2025-09-05'), 'PENDENTE', 'OK', 'OK', 'OK', 'Pendência Federal'],
      [3, 'Sorria', '1', new Date('2023-03-10'), 'Consultoria Gama', '33.333.333/0001-33', new Date('2020-01-01'), 'Belo Horizonte/MG', 'Ativo', 'Simples Nacional', 80000.00, new Date('2025-10-18'), new Date('2025-10-22'), new Date('2025-10-28'), 'NÃO', 'Observação Gama', new Date('2025-09-10'), 'OK', 'PENDENTE', 'OK', 'OK', 'Pendência Municipal'],
      [4, 'Medic', '2', new Date('2023-04-05'), 'Laboratório Delta', '44.444.444/0001-44', new Date('2019-07-01'), 'Porto Alegre/RS', 'Baixada', 'Lucro Real', 0.00, new Date('2024-01-01'), new Date('2024-01-05'), new Date('2024-01-10'), 'NÃO', 'Empresa baixada', new Date('2025-08-01'), 'OK', 'OK', 'OK', 'OK', ''],
      [5, 'Sorria', '1', new Date('2023-05-20'), 'Comércio Epsilon', '55.555.555/0001-55', new Date('2023-02-14'), 'Curitiba/PR', 'Ativo', 'Simples Nacional', 120000.00, new Date('2025-10-25'), new Date('2025-10-30'), new Date('2025-11-05'), 'SIM', 'Observação Epsilon', new Date('2025-09-15'), 'OK', 'OK', 'IRREGULAR', 'OK', 'Irregularidade Estadual']
    ];
    sheetClientes.getRange(sheetClientes.getLastRow() + 1, 1, sampleClients.length, sampleClients[0].length).setValues(sampleClients);

    // Dados de Senhas
    var samplePasswords = [
      [1, 'Prefeitura SP', 'user_alpha', Utilities.base64Encode('senhaAlpha123!')],
      [1, 'Simples Nacional', 'cnpj_alpha', Utilities.base64Encode('simplesAlpha@2025')],
      [2, 'Receita Federal', 'user_beta', Utilities.base64Encode('senhaBeta456#')],
      [3, 'Prefeitura BH', 'user_gama', Utilities.base64Encode('senhaGama789$')],
      [5, 'SEFAZ PR', 'user_epsilon', Utilities.base64Encode('senhaEpsilon%2025')]
    ];
    sheetSenhas.getRange(sheetSenhas.getLastRow() + 1, 1, samplePasswords.length, samplePasswords[0].length).setValues(samplePasswords);

    // Dados de Auditoria
    var now = new Date();
    var yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    var twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

    var sampleAuditLogs = [
      [twoDaysAgo, 'admin@sorria.com.br', 'CLIENTE_CRIADO', 1, 'Novo cliente: Cliente Alpha Ltda'],
      [yesterday, 'gerente@sorria.com.br', 'CLIENTE_ATUALIZADO', 1, "Alterações: situação: 'Ativo' para 'Ativo'"],
      [now, 'atendente@sorria.com.br', 'SENHA_ACESSADA', 1, "Senha do serviço 'Prefeitura SP' acessada."],
      [now, 'admin@medic.com.br', 'USUARIO_CRIADO', null, 'Novo usuário: gerente@medic.com.br - Papel: Gerente']
    ];
    sheetAuditoria.getRange(sheetAuditoria.getLastRow() + 1, 1, sampleAuditLogs.length, sampleAuditLogs[0].length).setValues(sampleAuditLogs);
  }
};
