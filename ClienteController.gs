var ClienteController = {
  getClientes: function() {
    var user = getLoggedUser();
    if (!user.ativo) throw new Error("Usuário não autorizado.");

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("CLIENTES");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift(); // Remove o cabeçalho e o armazena
    var clientes = [];

    for (var i = 0; i < data.length; i++) {
      var cliente = {};
      for (var j = 0; j < headers.length; j++) {
        cliente[headers[j]] = data[i][j];
      }
      // Filtrar clientes pela empresa do usuário, se não for administrador
      if (user.papel === "Administrador" || cliente.empresa_responsavel === user.empresa) {
        clientes.push(cliente);
      }
    }
    return clientes;
  },

  getClienteById: function(id_cliente) {
    var user = getLoggedUser();
    if (!user.ativo) throw new Error("Usuário não autorizado.");

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("CLIENTES");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id_cliente) {
        var cliente = {};
        for (var j = 0; j < headers.length; j++) {
          cliente[headers[j]] = data[i][j];
        }
        // Verificar permissão para o cliente específico
        if (user.papel === "Administrador" || cliente.empresa_responsavel === user.empresa) {
          return cliente;
        } else {
          throw new Error("Permissão negada para visualizar este cliente.");
        }
      }
    }
    return null;
  },

  createCliente: function(clienteData) {
    var user = getLoggedUser();
    if (!UsuarioController.checkPermission(user.email, "edit", clienteData.empresa_responsavel)) {
      throw new Error("Permissão negada para criar clientes.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("CLIENTES");
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];

    // Gerar um novo id_cliente (simples auto-incremento)
    var lastRow = sheet.getLastRow();
    var newId = 1;
    if (lastRow > 1) { // Se já houver dados além do cabeçalho
      newId = sheet.getRange(lastRow, 1).getValue() + 1;
    }
    clienteData.id_cliente = newId;

    for (var i = 0; i < headers.length; i++) {
      newRow.push(clienteData[headers[i]] || ""); // Adiciona o valor ou string vazia se não existir
    }
    sheet.appendRow(newRow);
    AuditoriaController.logAction("CLIENTE_CRIADO", newId, "Novo cliente: " + clienteData.razao_social);
    return clienteData;
  },

  updateCliente: function(id_cliente, clienteData) {
    var user = getLoggedUser();
    // Primeiro, obtenha o cliente para verificar a empresa_responsavel
    var existingCliente = this.getClienteById(id_cliente);
    if (!existingCliente) {
      throw new Error("Cliente não encontrado.");
    }
    if (!UsuarioController.checkPermission(user.email, "edit", existingCliente.empresa_responsavel)) {
      throw new Error("Permissão negada para atualizar este cliente.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("CLIENTES");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id_cliente) {
        var oldClienteData = {};
        for (var k = 0; k < headers.length; k++) {
          oldClienteData[headers[k]] = data[i][k];
        }

        var changes = [];
        for (var j = 0; j < headers.length; j++) {
          var header = headers[j];
          if (clienteData.hasOwnProperty(header) && clienteData[header] !== oldClienteData[header]) {
            data[i][j] = clienteData[header];
            changes.push(header + ": \'" + oldClienteData[header] + "\' para \'" + clienteData[header] + "\'");
          }
        }
        sheet.getRange(i + 2, 1, 1, headers.length).setValues([data[i]]); // +2 porque o cabeçalho foi removido e a indexação começa em 1
        AuditoriaController.logAction("CLIENTE_ATUALIZADO", id_cliente, "Alterações: " + changes.join(", "));
        return this.getClienteById(id_cliente);
      }
    }
    return null;
  },

  deleteCliente: function(id_cliente) {
    var user = getLoggedUser();
    // Primeiro, obtenha o cliente para verificar a empresa_responsavel
    var existingCliente = this.getClienteById(id_cliente);
    if (!existingCliente) {
      throw new Error("Cliente não encontrado.");
    }
    if (!UsuarioController.checkPermission(user.email, "edit", existingCliente.empresa_responsavel)) {
      throw new Error("Permissão negada para deletar este cliente.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("CLIENTES");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == id_cliente) {
        sheet.deleteRow(i + 2); // +2 porque o cabeçalho foi removido e a indexação começa em 1
        AuditoriaController.logAction("CLIENTE_DELETADO", id_cliente, "Cliente com ID " + id_cliente + " deletado.");
        return true;
      }
    }
    return false;
  }
};
