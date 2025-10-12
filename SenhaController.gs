var SenhaController = {
  getSenhasByClienteId: function(id_cliente) {
    var user = getLoggedUser();
    if (!user.ativo) throw new Error("Usuário não autorizado.");

    var cliente = ClienteController.getClienteById(id_cliente);
    if (!cliente) throw new Error("Cliente não encontrado.");

    if (!UsuarioController.checkPermission(user.email, "view", cliente.empresa_responsavel)) {
      throw new Error("Permissão negada para visualizar senhas deste cliente.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("SENHAS");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();
    var senhas = [];

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id_cliente) {
        var senha = {};
        for (var j = 0; j < headers.length; j++) {
          senha[headers[j]] = data[i][j];
        }
        senhas.push(senha);
      }
    }
    return senhas;
  },

  getSenhaCopiada: function(id_cliente, servico) {
    var user = getLoggedUser();
    if (!user.ativo) throw new Error("Usuário não autorizado.");

    var cliente = ClienteController.getClienteById(id_cliente);
    if (!cliente) throw new Error("Cliente não encontrado.");

    if (!UsuarioController.checkPermission(user.email, "view", cliente.empresa_responsavel)) {
      throw new Error("Permissão negada para acessar senhas deste cliente.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("SENHAS");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id_cliente && data[i][1] == servico) {
        AuditoriaController.logAction("SENHA_ACESSADA", id_cliente, "Senha do serviço \'" + servico + "\' acessada.");
        return Utilities.base64Decode(data[i][3]).toString(); // Retorna a senha descriptografada
      }
    }
    return null;
  },

  createSenha: function(senhaData) {
    var user = getLoggedUser();
    var cliente = ClienteController.getClienteById(senhaData.id_cliente);
    if (!cliente) throw new Error("Cliente não encontrado.");

    if (!UsuarioController.checkPermission(user.email, "edit", cliente.empresa_responsavel)) {
      throw new Error("Permissão negada para criar senhas para este cliente.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("SENHAS");
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];

    senhaData.senha_criptografada = Utilities.base64Encode(senhaData.senha_criptografada); // Criptografa a senha

    for (var i = 0; i < headers.length; i++) {
      newRow.push(senhaData[headers[i]] || "");
    }
    sheet.appendRow(newRow);
    AuditoriaController.logAction("SENHA_CRIADA", senhaData.id_cliente, "Nova senha para o serviço \'" + senhaData.servico + "\' criada.");
    return senhaData;
  },

  updateSenha: function(id_cliente, servico, senhaData) {
    var user = getLoggedUser();
    var cliente = ClienteController.getClienteById(id_cliente);
    if (!cliente) throw new Error("Cliente não encontrado.");

    if (!UsuarioController.checkPermission(user.email, "edit", cliente.empresa_responsavel)) {
      throw new Error("Permissão negada para atualizar senhas deste cliente.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("SENHAS");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id_cliente && data[i][1] == servico) {
        var oldSenhaData = {};
        for (var k = 0; k < headers.length; k++) {
          oldSenhaData[headers[k]] = data[i][k];
        }

        var changes = [];
        for (var j = 0; j < headers.length; j++) {
          var header = headers[j];
          if (senhaData.hasOwnProperty(header) && senhaData[header] !== oldSenhaData[header]) {
            if (header === "senha_criptografada") {
              data[i][j] = Utilities.base64Encode(senhaData[header]); // Criptografa a nova senha
              changes.push(header + ": \'*****\' para \'*****\'"); // Não expõe a senha no log
            } else {
              data[i][j] = senhaData[header];
              changes.push(header + ": \'" + oldSenhaData[header] + "\' para \'" + senhaData[header] + "\'");
            }
          }
        }
        sheet.getRange(i + 2, 1, 1, headers.length).setValues([data[i]]);
        AuditoriaController.logAction("SENHA_ATUALIZADA", id_cliente, "Senha do serviço \'" + servico + "\' atualizada. Alterações: " + changes.join(", "));
        return this.getSenhasByClienteId(id_cliente).find(s => s.servico === servico);
      }
    }
    return null;
  },

  deleteSenha: function(id_cliente, servico) {
    var user = getLoggedUser();
    var cliente = ClienteController.getClienteById(id_cliente);
    if (!cliente) throw new Error("Cliente não encontrado.");

    if (!UsuarioController.checkPermission(user.email, "edit", cliente.empresa_responsavel)) {
      throw new Error("Permissão negada para deletar senhas deste cliente.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("SENHAS");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id_cliente && data[i][1] == servico) {
        sheet.deleteRow(i + 2);
        AuditoriaController.logAction("SENHA_DELETADA", id_cliente, "Senha do serviço \'" + servico + "\' deletada.");
        return true;
      }
    }
    return false;
  }
};
