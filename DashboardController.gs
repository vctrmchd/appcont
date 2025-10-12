var DashboardController = {
  getDashboardStats: function() {
    var user = getLoggedUser();
    if (!user.ativo) throw new Error("Usuário não autorizado.");

    var spreadsheet = getSpreadsheet();
    var sheetClientes = spreadsheet.getSheetByName("CLIENTES");
    var dataClientes = sheetClientes.getDataRange().getValues();
    var headersClientes = dataClientes.shift();

    var stats = {
      totalClientes: dataClientes.length,
      clientesPorEmpresa: { Sorria: 0, Medic: 0 },
      clientesPorSituacao: { Ativo: 0, Baixada: 0, Inativo: 0 },
      clientesPorTributacao: {},
      clientesVencimentoProximo: 0,
      clientesComPendenciaFiscal: 0
    };

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    for (var i = 0; i < dataClientes.length; i++) {
      var cliente = {};
      for (var j = 0; j < headersClientes.length; j++) {
        cliente[headersClientes[j]] = dataClientes[i][j];
      }

      // Filtrar clientes pela empresa do usuário, se não for administrador
      if (user.papel !== "Administrador" && cliente.empresa_responsavel !== user.empresa) {
        continue; // Pula clientes que o usuário não tem permissão de ver
      }

      // Clientes por Empresa
      if (cliente.empresa_responsavel === "Sorria") {
        stats.clientesPorEmpresa.Sorria++;
      } else if (cliente.empresa_responsavel === "Medic") {
        stats.clientesPorEmpresa.Medic++;
      }

      // Clientes por Situação
      if (cliente.situacao in stats.clientesPorSituacao) {
        stats.clientesPorSituacao[cliente.situacao]++;
      } else {
        stats.clientesPorSituacao[cliente.situacao] = 1;
      }

      // Clientes por Tributação
      if (cliente.regime_tributacao in stats.clientesPorTributacao) {
        stats.clientesPorTributacao[cliente.regime_tributacao]++;
      } else {
        stats.clientesPorTributacao[cliente.regime_tributacao] = 1;
      }

      // Clientes com vencimento próximo (ex: próximos 30 dias para ISS, EFD-Reinf, Fechamento)
      var vencimentoIss = cliente.vencimento_iss ? new Date(cliente.vencimento_iss) : null;
      var prazoEfdReinf = cliente.prazo_efd_reinf ? new Date(cliente.prazo_efd_reinf) : null;
      var prazoFechamento = cliente.prazo_fechamento ? new Date(cliente.prazo_fechamento) : null;

      var thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      if (vencimentoIss && vencimentoIss >= today && vencimentoIss <= thirtyDaysFromNow) {
        stats.clientesVencimentoProximo++;
      }
      if (prazoEfdReinf && prazoEfdReinf >= today && prazoEfdReinf <= thirtyDaysFromNow) {
        stats.clientesVencimentoProximo++;
      }
      if (prazoFechamento && prazoFechamento >= today && prazoFechamento <= thirtyDaysFromNow) {
        stats.clientesVencimentoProximo++;
      }

      // Clientes com pendência fiscal
      if (cliente.status_regularidade_federal === "PENDENTE" || cliente.status_regularidade_federal === "IRREGULAR" ||
          cliente.status_regularidade_municipal === "PENDENTE" || cliente.status_regularidade_municipal === "IRREGULAR" ||
          cliente.status_regularidade_estadual === "PENDENTE" || cliente.status_regularidade_estadual === "IRREGULAR" ||
          cliente.status_regularidade_conselho === "PENDENTE" || cliente.status_regularidade_conselho === "IRREGULAR") {
        stats.clientesComPendenciaFiscal++;
      }
    }

    // Contar atividades de usuários (últimos 30 dias)
    var sheetAuditoria = spreadsheet.getSheetByName("AUDITORIA");
    var dataAuditoria = sheetAuditoria.getDataRange().getValues();
    var headersAuditoria = dataAuditoria.shift();
    var userActivity = {};

    var thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    for (var i = 0; i < dataAuditoria.length; i++) {
      var logEntry = {};
      for (var j = 0; j < headersAuditoria.length; j++) {
        logEntry[headersAuditoria[j]] = dataAuditoria[i][j];
      }
      var logDate = new Date(logEntry.timestamp);
      if (logDate >= thirtyDaysAgo) { // Ajuste para 30 dias atrás
        var email = logEntry.email_usuario;
        if (email in userActivity) {
          userActivity[email]++;
        } else {
          userActivity[email] = 1;
        }
      }
    }
    stats.userActivity = userActivity;

    return stats;
  }
};
