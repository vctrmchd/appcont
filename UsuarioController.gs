var UsuarioController = {
  getUsuarios: function() {
    var user = getLoggedUser();
    if (!this.checkPermission(user.email, "admin", null)) {
      throw new Error("Permissão negada para visualizar usuários.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("USUARIOS");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();
    var usuarios = [];

    for (var i = 0; i < data.length; i++) {
      var usuario = {};
      for (var j = 0; j < headers.length; j++) {
        usuario[headers[j]] = data[i][j];
      }
      usuarios.push(usuario);
    }
    return usuarios;
  },

  getUsuarioByEmail: function(email) {
    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("USUARIOS");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == email) {
        var usuario = {};
        for (var j = 0; j < headers.length; j++) {
          usuario[headers[j]] = data[i][j];
        }
        return usuario;
      }
    }
    return null;
  },

  createUsuario: function(usuarioData) {
    var user = getLoggedUser();
    if (!this.checkPermission(user.email, "admin", null)) {
      throw new Error("Permissão negada para criar usuários.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("USUARIOS");
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newRow = [];

    for (var i = 0; i < headers.length; i++) {
      newRow.push(usuarioData[headers[i]] || "");
    }
    sheet.appendRow(newRow);
    AuditoriaController.logAction("USUARIO_CRIADO", null, "Novo usuário: " + usuarioData.email + " - Papel: " + usuarioData.papel);
    return usuarioData;
  },

  updateUsuario: function(email, usuarioData) {
    var user = getLoggedUser();
    if (!this.checkPermission(user.email, "admin", null)) {
      throw new Error("Permissão negada para atualizar usuários.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("USUARIOS");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == email) {
        var oldUsuarioData = {};
        for (var k = 0; k < headers.length; k++) {
          oldUsuarioData[headers[k]] = data[i][k];
        }

        var changes = [];
        for (var j = 0; j < headers.length; j++) {
          var header = headers[j];
          if (usuarioData.hasOwnProperty(header) && usuarioData[header] !== oldUsuarioData[header]) {
            data[i][j] = usuarioData[header];
            changes.push(header + ": \'" + oldUsuarioData[header] + "\' para \'" + usuarioData[header] + "\'");
          }
        }
        sheet.getRange(i + 2, 1, 1, headers.length).setValues([data[i]]);
        AuditoriaController.logAction("USUARIO_ATUALIZADO", null, "Usuário " + email + " atualizado. Alterações: " + changes.join(", "));
        return this.getUsuarioByEmail(email);
      }
    }
    return null;
  },

  deleteUsuario: function(email) {
    var user = getLoggedUser();
    if (!this.checkPermission(user.email, "admin", null)) {
      throw new Error("Permissão negada para deletar usuários.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("USUARIOS");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] == email) {
        sheet.deleteRow(i + 2);
        AuditoriaController.logAction("USUARIO_DELETADO", null, "Usuário " + email + " deletado.");
        return true;
      }
    }
    return false;
  },

  checkPermission: function(userEmail, requiredRole, targetEmpresa) {
    var user = this.getUsuarioByEmail(userEmail);
    if (!user || !user.ativo) {
      return false; // Usuário não encontrado ou inativo
    }

    // Administradores têm acesso total
    if (user.papel === "Administrador") {
      return true;
    }

    // Gerentes e Atendentes só podem ver clientes da sua empresa
    if (targetEmpresa && user.empresa !== targetEmpresa) {
      return false;
    }

    // Lógica de permissão mais granular
    if (requiredRole === "view") {
      return user.papel === "Gerente" || user.papel === "Atendente";
    } else if (requiredRole === "edit") {
      return user.papel === "Gerente"; // Apenas gerentes podem editar tudo
    } else if (requiredRole === "admin") {
      return user.papel === "Administrador";
    }
    return false;
  }
};
