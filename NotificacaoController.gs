var NotificacaoController = {
  verificarVencimentos: function() {
    var spreadsheet = getSpreadsheet();
    var sheetClientes = spreadsheet.getSheetByName("CLIENTES");
    var dataClientes = sheetClientes.getDataRange().getValues();
    var headersClientes = dataClientes.shift();

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    var notificacoes = [];

    for (var i = 0; i < dataClientes.length; i++) {
      var cliente = {};
      for (var j = 0; j < headersClientes.length; j++) {
        cliente[headersClientes[j]] = dataClientes[i][j];
      }

      var vencimentoIss = cliente.vencimento_iss ? new Date(cliente.vencimento_iss) : null;
      var prazoEfdReinf = cliente.prazo_efd_reinf ? new Date(cliente.prazo_efd_reinf) : null;
      var prazoFechamento = cliente.prazo_fechamento ? new Date(cliente.prazo_fechamento) : null;

      if (vencimentoIss && vencimentoIss >= today && vencimentoIss <= sevenDaysFromNow) {
        notificacoes.push("Vencimento de ISS para " + cliente.razao_social + " em " + Utilities.formatDate(vencimentoIss, Session.getScriptTimeZone(), "dd/MM/yyyy"));
      }
      if (prazoEfdReinf && prazoEfdReinf >= today && prazoEfdReinf <= sevenDaysFromNow) {
        notificacoes.push("Prazo de EFD-Reinf para " + cliente.razao_social + " em " + Utilities.formatDate(prazoEfdReinf, Session.getScriptTimeZone(), "dd/MM/yyyy"));
      }
      if (prazoFechamento && prazoFechamento >= today && prazoFechamento <= sevenDaysFromNow) {
        notificacoes.push("Prazo de Fechamento para " + cliente.razao_social + " em " + Utilities.formatDate(prazoFechamento, Session.getScriptTimeZone(), "dd/MM/yyyy"));
      }

      // Verificar pendências fiscais
      if (cliente.status_regularidade_federal === "PENDENTE" || cliente.status_regularidade_federal === "IRREGULAR" ||
          cliente.status_regularidade_municipal === "PENDENTE" || cliente.status_regularidade_municipal === "IRREGULAR" ||
          cliente.status_regularidade_estadual === "PENDENTE" || cliente.status_regularidade_estadual === "IRREGULAR" ||
          cliente.status_regularidade_conselho === "PENDENTE" || cliente.status_regularidade_conselho === "IRREGULAR") {
        notificacoes.push("Pendência fiscal para " + cliente.razao_social + ". Verificar regularidade.");
      }
    }

    if (notificacoes.length > 0) {
      // Enviar e-mail para administradores ou responsáveis
      var adminEmails = this.getAdminEmails(); // Chama a função interna do objeto
      if (adminEmails.length > 0) {
        MailApp.sendEmail({
          to: adminEmails.join(","),
          subject: "Notificações de Vencimentos e Pendências - Gestão de Clientes",
          htmlBody: "<p>Prezados administradores,</p>" +
                    "<p>As seguintes notificações foram geradas:</p>" +
                    "<ul><li>" + notificacoes.join("</li><li>") + "</li></ul>" +
                    "<p>Por favor, verifiquem o sistema para mais detalhes.</p>"
        });
      }
    }
    return notificacoes;
  },

  getAdminEmails: function() {
    var spreadsheet = getSpreadsheet();
    var sheetUsuarios = spreadsheet.getSheetByName("USUARIOS");
    var dataUsuarios = sheetUsuarios.getDataRange().getValues();
    var headersUsuarios = dataUsuarios.shift();
    var adminEmails = [];

    for (var i = 0; i < dataUsuarios.length; i++) {
      var usuario = {};
      for (var j = 0; j < headersUsuarios.length; j++) {
        usuario[headersUsuarios[j]] = dataUsuarios[i][j];
      }
      if (usuario.papel === "Administrador" && usuario.ativo === true) {
        adminEmails.push(usuario.email);
      }
    }
    return adminEmails;
  },

  // Configurar um gatilho diário para verificar vencimentos
  criarGatilhoDiario: function() {
    ScriptApp.newTrigger("NotificacaoController.verificarVencimentos") // Referência à função dentro do objeto
        .timeBased()
        .everyDays(1)
        .atHour(8) // Executar todos os dias às 8h da manhã
        .create();
  }
};
