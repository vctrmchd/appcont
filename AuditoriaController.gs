var AuditoriaController = {
  logAction: function(acao, id_cliente_afetado, detalhes) {
    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("AUDITORIA");
    var userEmail = Session.getActiveUser().getEmail();
    var timestamp = new Date();
    sheet.appendRow([timestamp, userEmail, acao, id_cliente_afetado, detalhes]);
  },

  getAuditoriaLogs: function() {
    var user = getLoggedUser();
    if (!UsuarioController.checkPermission(user.email, "admin", null)) {
      throw new Error("Permissão negada para visualizar logs de auditoria.");
    }

    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName("AUDITORIA");
    var data = sheet.getDataRange().getValues();
    var headers = data.shift();
    var logs = [];

    for (var i = 0; i < data.length; i++) {
      var logEntry = {};
      for (var j = 0; j < headers.length; j++) {
        logEntry[headers[j]] = data[i][j];
      }
      logs.push(logEntry);
    }
    return logs.reverse(); // Mostrar os logs mais recentes primeiro
  }
};
