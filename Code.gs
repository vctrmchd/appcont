/**
 * Aplicativo de Gestão de Clientes - Sorria Contabilidade
 * Framework para Google App Script (Versão Conforme XML Schema)
 */

// ==================== CONFIGURAÇÃO INICIAL ====================

/**
 * Configuração do ID da planilha
 * IMPORTANTE: Substitua pelo ID da sua planilha OU deixe vazio para usar a planilha ativa
 */
const SPREADSHEET_ID = ""; // Deixe vazio para usar a planilha ativa ou insira o ID da sua planilha

// Função principal para servir o aplicativo
function doGet(e) {
  return HtmlService.createTemplateFromFile("Index").evaluate()
    .setTitle("Gestão de Clientes - Sorria Contabilidade")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Função para incluir outros arquivos HTML
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Obtém referência da planilha
 */
function getSpreadsheet() {
  try {
    Logger.log("getSpreadsheet: Tentando obter planilha.");
    // Tenta usar o ID configurado primeiro
    if (SPREADSHEET_ID && SPREADSHEET_ID.length > 0) {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      Logger.log("getSpreadsheet: Planilha obtida por ID: " + ss.getName());
      return ss;
    }
    
    // Fallback: usa a planilha ativa (container-bound script)
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
      Logger.log("getSpreadsheet: Planilha ativa obtida: " + activeSpreadsheet.getName());
      return activeSpreadsheet;
    }
    
    throw new Error("Nenhuma planilha configurada. Configure o SPREADSHEET_ID no Code.gs ou vincule o script a uma planilha.");
  } catch (error) {
    Logger.log("ERRO em getSpreadsheet: " + error.message + " - " + error.stack);
    throw error; // Re-lança o erro para que seja tratado em um nível superior, se necessário
  }
}

/**
 * Obtém uma referência para a aba especificada
 */
function getSheet(sheetName) {
  try {
    Logger.log("getSheet: Tentando obter aba: " + sheetName);
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Se a aba não existe, retorna erro (não cria automaticamente)
    if (!sheet) {
      throw new Error(`Aba \'${sheetName}\' não encontrada. Certifique-se de que ela existe na planilha.`);
    }
    Logger.log("getSheet: Aba " + sheetName + " obtida com sucesso.");
    return sheet;
  } catch (error) {
    Logger.log(`ERRO em getSheet(${sheetName}): ` + error.message + " - " + error.stack);
    throw error; // Re-lança o erro para que seja tratado em um nível superior, se necessário
  }
}

// ==================== FUNÇÕES CRUD PARA CLIENTES ====================

/**
 * Obtém todos os clientes da aba "Clientes"
 * Estrutura conforme XML Schema
 */
function getClientes() {
  try {
    Logger.log("getClientes: Iniciando busca de clientes.");
    const sheet = getSheet("Clientes");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      Logger.log("getClientes: Nenhum cliente encontrado (apenas cabeçalho). Retornando array vazio.");
      return [];
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 9);
    const values = range.getValues();
    
    const clientes = values
      .filter(row => row[0]) // Filtra linhas vazias
      .map(row => {
        return {
          cliente_id: Number(row[0]), // Garante que o ID seja um número
          razao_social: String(row[1] || ""), // Garante que seja string
          cpf_cnpj: String(row[2] || ""),
          constituicao: String(row[3] || ""),
          municipio: String(row[4] || ""),
          situacao: String(row[5] || ""),
          squad: String(row[6] || ""),
          responsavel: String(row[7] || ""),
          data_entrada: Date(row[8] || "")
        };
      });
    
    Logger.log("getClientes: " + clientes.length + " clientes encontrados. Dados retornados: " + JSON.stringify(clientes));
    return clientes;
  } catch (error) {
    Logger.log("ERRO em getClientes: " + error.message + " - " + error.stack);
    return []; // Sempre retorne um array vazio em caso de erro
  }
}

/**
 * Adiciona um novo cliente
 */
function addCliente(clientData) {
  try {
    Logger.log("addCliente: Tentando adicionar cliente: " + JSON.stringify(clientData));
    const sheet = getSheet("Clientes");
    const lastRow = sheet.getLastRow();
    
    // Gera um novo ID
    let newId = 1;
    if (lastRow > 1) {
      const lastId = sheet.getRange(lastRow, 1).getValue();
      newId = Number(lastId) + 1;
    }
    
    const newRow = [
      newId,
      clientData.razao_social || "",
      clientData.cpf_cnpj || "",
      clientData.constituicao || "",
      clientData.municipio || "",
      clientData.situacao || "Ativo",
      clientData.squad || "",
      clientData.responsavel || "",
      clientData.data_entrada || new Date()
    ];
    
    sheet.appendRow(newRow);
    Logger.log("addCliente: Cliente adicionado com sucesso: ID " + newId);
    return true;
  } catch (error) {
    Logger.log("ERRO em addCliente: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Atualiza um cliente existente
 */
function updateCliente(clienteId, clientData) {
  try {
    Logger.log("updateCliente: Tentando atualizar cliente ID " + clienteId + " com dados: " + JSON.stringify(clientData));
    const sheet = getSheet("Clientes");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhum cliente para atualizar");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 9);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == clienteId) {
        const rowIndex = i + 2;
        const updatedRow = [
          clienteId,
          clientData.razao_social !== undefined ? clientData.razao_social : values[i][1],
          clientData.cpf_cnpj !== undefined ? clientData.cpf_cnpj : values[i][2],
          clientData.constituicao !== undefined ? clientData.constituicao : values[i][3],
          clientData.municipio !== undefined ? clientData.municipio : values[i][4],
          clientData.situacao !== undefined ? clientData.situacao : values[i][5],
          clientData.squad !== undefined ? clientData.squad : values[i][6],
          clientData.responsavel !== undefined ? clientData.responsavel : values[i][7],
          values[i][8] // Mantém data original
        ];
        
        sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
        Logger.log("updateCliente: Cliente atualizado: ID " + clienteId);
        return true;
      }
    }
    
    throw new Error("Cliente não encontrado");
  } catch (error) {
    Logger.log("ERRO em updateCliente: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Remove um cliente
 */
function deleteCliente(clienteId) {
  try {
    Logger.log("deleteCliente: Tentando remover cliente ID " + clienteId);
    const sheet = getSheet("Clientes");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhum cliente para remover");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 1);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == clienteId) {
        sheet.deleteRow(i + 2);
        Logger.log("deleteCliente: Cliente removido: ID " + clienteId);
        return true;
      }
    }
    
    throw new Error("Cliente não encontrado");
  } catch (error) {
    Logger.log("ERRO em deleteCliente: " + error.message + " - " + error.stack);
    return false;
  }
}

// ==================== FUNÇÕES PARA DASHBOARD ====================

/**
 * Obtém estatísticas do sistema (total de clientes, ativos, inativos)
 */
function getSystemStats() {
  try {
    Logger.log("getSystemStats: Iniciando coleta de estatísticas do sistema.");
    const clientes = getClientes(); // Reutiliza a função getClientes
    
    const totalClientes = clientes.length;
    const activeClientes = clientes.filter(cliente => cliente.situacao === "Ativo").length;
    const inactiveClientes = totalClientes - activeClientes;
    
    const stats = {
      totalClientes: totalClientes,
      activeClientes: activeClientes,
      inactiveClientes: inactiveClientes
    };
    Logger.log("getSystemStats: Estatísticas coletadas: " + JSON.stringify(stats));
    return stats;
  } catch (error) {
    Logger.log("ERRO em getSystemStats: " + error.message + " - " + error.stack);
    return { totalClientes: 0, activeClientes: 0, inactiveClientes: 0 }; // Retorna objeto padrão em caso de erro
  }
}

// ==================== FUNÇÕES CRUD PARA INFORMAÇÕES FISCAIS ====================

/**
 * Obtém todas as informações fiscais
 * Estrutura conforme XML Schema (19 campos)
 */
function getAllInformacoesFiscais() {
  try {
    Logger.log("getAllInformacoesFiscais: Iniciando busca de todas as informações fiscais.");
    const sheet = getSheet("InformacoesFiscais");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      Logger.log("getAllInformacoesFiscais: Nenhuma informação fiscal encontrada (apenas cabeçalho). Retornando array vazio.");
      return [];
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 19);
    const values = range.getValues();
    
    const informacoesFiscais = values
      .filter(row => row[0]) // Filtra linhas vazias
      .map(row => {
        return {
          fiscal_id: Number(row[0]),
          cliente_id: Number(row[1]),
          tributacao: String(row[2] || ""),
          faturamento: Number(row[3] || 0),
          equiparacao: String(row[4] || ""),
          vct_iss: Date(row[5] || ""),
          iss: String(row[6] || ""),
          efd_reinf: String(row[7] || ""),
          fechamento: String(row[8] || ""),
          enviado: String(row[9] || ""),
          parcelamento: String(row[10] || ""),
          dctf_dstda: String(row[11] || ""),
          sped: String(row[12] || ""),
          ultima_consulta: Date(row[13] || ""),
          federal: String(row[14] || ""),
          municipal: String(row[15] || ""),
          estadual: String(row[16] || ""),
          conselho: String(row[17] || ""),
          observacoes: String(row[18] || "")
        };
      });
    
    Logger.log("getAllInformacoesFiscais: " + informacoesFiscais.length + " informações fiscais encontradas. Dados retornados: " + JSON.stringify(informacoesFiscais));
    return informacoesFiscais;
  } catch (error) {
    Logger.log("ERRO em getAllInformacoesFiscais: " + error.message + " - " + error.stack);
    return [];
  }
}

/**
 * Adiciona novas informações fiscais
 */
function addInformacoesFiscais(fiscalData) {
  try {
    Logger.log("addInformacoesFiscais: Tentando adicionar informações fiscais: " + JSON.stringify(fiscalData));
    const sheet = getSheet("InformacoesFiscais");
    const lastRow = sheet.getLastRow();
    
    let newId = 1;
    if (lastRow > 1) {
      const lastId = sheet.getRange(lastRow, 1).getValue();
      newId = Number(lastId) + 1;
    }
    
    const newRow = [
      newId,
      fiscalData.cliente_id,
      fiscalData.tributacao || "",
      fiscalData.faturamento || 0,
      fiscalData.equiparacao || "",
      fiscalData.vct_iss || "",
      fiscalData.iss || "",
      fiscalData.efd_reinf || "",
      fiscalData.fechamento || "",
      fiscalData.enviado || "",
      fiscalData.parcelamento || "",
      fiscalData.dctf_dstda || "",
      fiscalData.sped || "",
      fiscalData.ultima_consulta || "",
      fiscalData.federal || "",
      fiscalData.municipal || "",
      fiscalData.estadual || "",
      fiscalData.conselho || "",
      fiscalData.observacoes || ""
    ];
    
    sheet.appendRow(newRow);
    Logger.log("addInformacoesFiscais: Informações fiscais adicionadas com sucesso: ID " + newId);
    return true;
  } catch (error) {
    Logger.log("ERRO em addInformacoesFiscais: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Atualiza informações fiscais existentes
 */
function updateInformacoesFiscais(fiscalId, fiscalData) {
  try {
    Logger.log("updateInformacoesFiscais: Tentando atualizar informações fiscais ID " + fiscalId + " com dados: " + JSON.stringify(fiscalData));
    const sheet = getSheet("InformacoesFiscais");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhuma informação fiscal para atualizar");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 19);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == fiscalId) {
        const rowIndex = i + 2;
        const updatedRow = [
          fiscalId,
          fiscalData.cliente_id !== undefined ? fiscalData.cliente_id : values[i][1],
          fiscalData.tributacao !== undefined ? fiscalData.tributacao : values[i][2],
          fiscalData.faturamento !== undefined ? fiscalData.faturamento : values[i][3],
          fiscalData.equiparacao !== undefined ? fiscalData.equiparacao : values[i][4],
          fiscalData.vct_iss !== undefined ? fiscalData.vct_iss : values[i][5],
          fiscalData.iss !== undefined ? fiscalData.iss : values[i][6],
          fiscalData.efd_reinf !== undefined ? fiscalData.efd_reinf : values[i][7],
          fiscalData.fechamento !== undefined ? fiscalData.fechamento : values[i][8],
          fiscalData.enviado !== undefined ? fiscalData.enviado : values[i][9],
          fiscalData.parcelamento !== undefined ? fiscalData.parcelamento : values[i][10],
          fiscalData.dctf_dstda !== undefined ? fiscalData.dctf_dstda : values[i][11],
          fiscalData.sped !== undefined ? fiscalData.sped : values[i][12],
          fiscalData.ultima_consulta !== undefined ? fiscalData.ultima_consulta : values[i][13],
          fiscalData.federal !== undefined ? fiscalData.federal : values[i][14],
          fiscalData.municipal !== undefined ? fiscalData.municipal : values[i][15],
          fiscalData.estadual !== undefined ? fiscalData.estadual : values[i][16],
          fiscalData.conselho !== undefined ? fiscalData.conselho : values[i][17],
          fiscalData.observacoes !== undefined ? fiscalData.observacoes : values[i][18]
        ];
        
        sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
        Logger.log("updateInformacoesFiscais: Informações fiscais atualizadas: ID " + fiscalId);
        return true;
      }
    }
    
    throw new Error("Informação fiscal não encontrada");
  } catch (error) {
    Logger.log("ERRO em updateInformacoesFiscais: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Remove informações fiscais
 */
function deleteInformacoesFiscais(fiscalId) {
  try {
    Logger.log("deleteInformacoesFiscais: Tentando remover informações fiscais ID " + fiscalId);
    const sheet = getSheet("InformacoesFiscais");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhuma informação fiscal para remover");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 1);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == fiscalId) {
        sheet.deleteRow(i + 2);
        Logger.log("deleteInformacoesFiscais: Informações fiscais removidas: ID " + fiscalId);
        return true;
      }
    }
    
    throw new Error("Informação fiscal não encontrada");
  } catch (error) {
    Logger.log("ERRO em deleteInformacoesFiscais: " + error.message + " - " + error.stack);
    return false;
  }
}

// ==================== FUNÇÕES CRUD PARA INFORMAÇÕES DE DP ====================

/**
 * Obtém todas as informações de DP
 * Estrutura conforme XML Schema (27 campos)
 */
function getAllInformacoesDP() {
  try {
    Logger.log("getAllInformacoesDP: Iniciando busca de todas as informações de DP.");
    const sheet = getSheet("InformacoesDP");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      Logger.log("getAllInformacoesDP: Nenhuma informação de DP encontrada (apenas cabeçalho). Retornando array vazio.");
      return [];
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 27);
    const values = range.getValues();
    
    const informacoesDP = values
      .filter(row => row[0]) // Filtra linhas vazias
      .map(row => {
        return {
          dp_id: Number(row[0]),
          cliente_id: Number(row[1]),
          fiscal_faturamento: String(row[2] || ""),
          reinf_06_2025: String(row[3] || ""),
          gfip_13_2025: String(row[4] || ""),
          esocial_15_2025: String(row[5] || ""),
          irrf_20_2025: String(row[6] || ""),
          fgts_07_2025: String(row[7] || ""),
          sindicato: String(row[8] || ""),
          pro_labore_inss_pf: Number(row[9] || 0),
          funcionarios: Number(row[10] || 0),
          data_envio: Date(row[11] || ""),
          responsavel_envio: String(row[12] || ""),
          observacoes: String(row[13] || ""),
          // Campos adicionais para 2026
          reinf_06_2026: String(row[14] || ""),
          gfip_13_2026: String(row[15] || ""),
          esocial_15_2026: String(row[16] || ""),
          irrf_20_2026: String(row[17] || ""),
          fgts_07_2026: String(row[18] || ""),
          sindicato_2026: String(row[19] || ""),
          pro_labore_inss_pf_2026: Number(row[20] || 0),
          funcionarios_2026: Number(row[21] || 0),
          data_envio_2026: Date(row[22] || ""),
          responsavel_envio_2026: String(row[23] || ""),
          observacoes_2026: String(row[24] || ""),
          // Campos adicionais para 2027
          reinf_06_2027: String(row[25] || ""),
          gfip_13_2027: String(row[26] || "")
        };
      });
    
    Logger.log("getAllInformacoesDP: " + informacoesDP.length + " informações de DP encontradas. Dados retornados: " + JSON.stringify(informacoesDP));
    return informacoesDP;
  } catch (error) {
    Logger.log("ERRO em getAllInformacoesDP: " + error.message + " - " + error.stack);
    return [];
  }
}

/**
 * Adiciona novas informações de DP
 */
function addInformacoesDP(dpData) {
  try {
    Logger.log("addInformacoesDP: Tentando adicionar informações de DP: " + JSON.stringify(dpData));
    const sheet = getSheet("InformacoesDP");
    const lastRow = sheet.getLastRow();
    
    let newId = 1;
    if (lastRow > 1) {
      const lastId = sheet.getRange(lastRow, 1).getValue();
      newId = Number(lastId) + 1;
    }
    
    const newRow = [
      newId,
      dpData.cliente_id,
      dpData.fiscal_faturamento || "",
      dpData.reinf_06_2025 || "",
      dpData.gfip_13_2025 || "",
      dpData.esocial_15_2025 || "",
      dpData.irrf_20_2025 || "",
      dpData.fgts_07_2025 || "",
      dpData.sindicato || "",
      dpData.pro_labore_inss_pf || 0,
      dpData.funcionarios || 0,
      dpData.data_envio || "",
      dpData.responsavel_envio || "",
      dpData.observacoes || "",
      // Campos adicionais para 2026
      dpData.reinf_06_2026 || "",
      dpData.gfip_13_2026 || "",
      dpData.esocial_15_2026 || "",
      dpData.irrf_20_2026 || "",
      dpData.fgts_07_2026 || "",
      dpData.sindicato_2026 || "",
      dpData.pro_labore_inss_pf_2026 || 0,
      dpData.funcionarios_2026 || 0,
      dpData.data_envio_2026 || "",
      dpData.responsavel_envio_2026 || "",
      dpData.observacoes_2026 || "",
      // Campos adicionais para 2027
      dpData.reinf_06_2027 || "",
      dpData.gfip_13_2027 || ""
    ];
    
    sheet.appendRow(newRow);
    Logger.log("addInformacoesDP: Informações de DP adicionadas com sucesso: ID " + newId);
    return true;
  } catch (error) {
    Logger.log("ERRO em addInformacoesDP: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Atualiza informações de DP existentes
 */
function updateInformacoesDP(dpId, dpData) {
  try {
    Logger.log("updateInformacoesDP: Tentando atualizar informações de DP ID " + dpId + " com dados: " + JSON.stringify(dpData));
    const sheet = getSheet("InformacoesDP");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhuma informação de DP para atualizar");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 27);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == dpId) {
        const rowIndex = i + 2;
        const updatedRow = [
          dpId,
          dpData.cliente_id !== undefined ? dpData.cliente_id : values[i][1],
          dpData.fiscal_faturamento !== undefined ? dpData.fiscal_faturamento : values[i][2],
          dpData.reinf_06_2025 !== undefined ? dpData.reinf_06_2025 : values[i][3],
          dpData.gfip_13_2025 !== undefined ? dpData.gfip_13_2025 : values[i][4],
          dpData.esocial_15_2025 !== undefined ? dpData.esocial_15_2025 : values[i][5],
          dpData.irrf_20_2025 !== undefined ? dpData.irrf_20_2025 : values[i][6],
          dpData.fgts_07_2025 !== undefined ? dpData.fgts_07_2025 : values[i][7],
          dpData.sindicato !== undefined ? dpData.sindicato : values[i][8],
          dpData.pro_labore_inss_pf !== undefined ? dpData.pro_labore_inss_pf : values[i][9],
          dpData.funcionarios !== undefined ? dpData.funcionarios : values[i][10],
          dpData.data_envio !== undefined ? dpData.data_envio : values[i][11],
          dpData.responsavel_envio !== undefined ? dpData.responsavel_envio : values[i][12],
          dpData.observacoes !== undefined ? dpData.observacoes : values[i][13],
          // Campos adicionais para 2026
          dpData.reinf_06_2026 !== undefined ? dpData.reinf_06_2026 : values[i][14],
          dpData.gfip_13_2026 !== undefined ? dpData.gfip_13_2026 : values[i][15],
          dpData.esocial_15_2026 !== undefined ? dpData.esocial_15_2026 : values[i][16],
          dpData.irrf_20_2026 !== undefined ? dpData.irrf_20_2026 : values[i][17],
          dpData.fgts_07_2026 !== undefined ? dpData.fgts_07_2026 : values[i][18],
          dpData.sindicato_2026 !== undefined ? dpData.sindicato_2026 : values[i][19],
          dpData.pro_labore_inss_pf_2026 !== undefined ? dpData.pro_labore_inss_pf_2026 : values[i][20],
          dpData.funcionarios_2026 !== undefined ? dpData.funcionarios_2026 : values[i][21],
          dpData.data_envio_2026 !== undefined ? dpData.data_envio_2026 : values[i][22],
          dpData.responsavel_envio_2026 !== undefined ? dpData.responsavel_envio_2026 : values[i][23],
          dpData.observacoes_2026 !== undefined ? dpData.observacoes_2026 : values[i][24],
          // Campos adicionais para 2027
          dpData.reinf_06_2027 !== undefined ? dpData.reinf_06_2027 : values[i][25],
          dpData.gfip_13_2027 !== undefined ? dpData.gfip_13_2027 : values[i][26]
        ];
        
        sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
        Logger.log("updateInformacoesDP: Informações de DP atualizadas: ID " + dpId);
        return true;
      }
    }
    
    throw new Error("Informação de DP não encontrada");
  } catch (error) {
    Logger.log("ERRO em updateInformacoesDP: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Remove informações de DP
 */
function deleteInformacoesDP(dpId) {
  try {
    Logger.log("deleteInformacoesDP: Tentando remover informações de DP ID " + dpId);
    const sheet = getSheet("InformacoesDP");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhuma informação de DP para remover");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 1);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == dpId) {
        sheet.deleteRow(i + 2);
        Logger.log("deleteInformacoesDP: Informações de DP removidas: ID " + dpId);
        return true;
      }
    }
    
    throw new Error("Informação de DP não encontrada");
  } catch (error) {
    Logger.log("ERRO em deleteInformacoesDP: " + error.message + " - " + error.stack);
    return false;
  }
}

// ==================== FUNÇÕES CRUD PARA SENHAS ====================

/**
 * Obtém todas as senhas
 * Estrutura conforme XML Schema (6 campos)
 */
function getAllSenhas() {
  try {
    Logger.log("getAllSenhas: Iniciando busca de todas as senhas.");
    const sheet = getSheet("Senhas");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      Logger.log("getAllSenhas: Nenhuma senha encontrada (apenas cabeçalho). Retornando array vazio.");
      return [];
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 6);
    const values = range.getValues();
    
    const senhas = values
      .filter(row => row[0]) // Filtra linhas vazias
      .map(row => {
        return {
          senha_id: Number(row[0]),
          cliente_id: Number(row[1]),
          tipo_senha: String(row[2] || ""),
          gerenciador: String(row[3] || ""),
          login: String(row[4] || ""),
          link_acesso: URL(row[5] || "")
        };
      });
    
    Logger.log("getAllSenhas: " + senhas.length + " senhas encontradas. Dados retornados: " + JSON.stringify(senhas));
    return senhas;
  } catch (error) {
    Logger.log("ERRO em getAllSenhas: " + error.message + " - " + error.stack);
    return [];
  }
}

/**
 * Adiciona uma nova senha
 */
function addSenha(senhaData) {
  try {
    Logger.log("addSenha: Tentando adicionar senha: " + JSON.stringify(senhaData));
    const sheet = getSheet("Senhas");
    const lastRow = sheet.getLastRow();
    
    let newId = 1;
    if (lastRow > 1) {
      const lastId = sheet.getRange(lastRow, 1).getValue();
      newId = Number(lastId) + 1;
    }
    
    const newRow = [
      newId,
      senhaData.cliente_id,
      senhaData.tipo_senha || "",
      senhaData.gerenciador || "",
      senhaData.login || "",
      senhaData.link_acesso || ""
    ];
    
    sheet.appendRow(newRow);
    Logger.log("addSenha: Senha adicionada com sucesso: ID " + newId);
    return true;
  } catch (error) {
    Logger.log("ERRO em addSenha: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Atualiza uma senha existente
 */
function updateSenha(senhaId, senhaData) {
  try {
    Logger.log("updateSenha: Tentando atualizar senha ID " + senhaId + " com dados: " + JSON.stringify(senhaData));
    const sheet = getSheet("Senhas");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhuma senha para atualizar");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 6);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == senhaId) {
        const rowIndex = i + 2;
        const updatedRow = [
          senhaId,
          senhaData.cliente_id !== undefined ? senhaData.cliente_id : values[i][1],
          senhaData.tipo_senha !== undefined ? senhaData.tipo_senha : values[i][2],
          senhaData.gerenciador !== undefined ? senhaData.gerenciador : values[i][3],
          senhaData.login !== undefined ? senhaData.login : values[i][4],
          senhaData.link_acesso !== undefined ? senhaData.link_acesso : values[i][5]
        ];
        
        sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
        Logger.log("updateSenha: Senha atualizada: ID " + senhaId);
        return true;
      }
    }
    
    throw new Error("Senha não encontrada");
  } catch (error) {
    Logger.log("ERRO em updateSenha: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Remove uma senha
 */
function deleteSenha(senhaId) {
  try {
    Logger.log("deleteSenha: Tentando remover senha ID " + senhaId);
    const sheet = getSheet("Senhas");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhuma senha para remover");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 1);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == senhaId) {
        sheet.deleteRow(i + 2);
        Logger.log("deleteSenha: Senha removida: ID " + senhaId);
        return true;
      }
    }
    
    throw new Error("Senha não encontrada");
  } catch (error) {
    Logger.log("ERRO em deleteSenha: " + error.message + " - " + error.stack);
    return false;
  }
}

// ==================== FUNÇÕES CRUD PARA CARNÊ LEÃO ====================

/**
 * Obtém todos os dados de Carnê Leão
 * Estrutura conforme XML Schema (6 campos)
 */
function getAllCarneLeao() {
  try {
    Logger.log("getAllCarneLeao: Iniciando busca de todos os dados de Carnê Leão.");
    const sheet = getSheet("CarneLeao");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      Logger.log("getAllCarneLeao: Nenhum dado de Carnê Leão encontrado (apenas cabeçalho). Retornando array vazio.");
      return [];
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 6);
    const values = range.getValues();
    
    const carneLeao = values
      .filter(row => row[0]) // Filtra linhas vazias
      .map(row => {
        return {
          carne_id: Number(row[0]),
          cliente_id: Number(row[1]),
          mes_ano: String(row[2] || ""),
          valor: Number(row[3] || 0),
          data_pagamento: Date(row[4] || ""),
          situacao: String(row[5] || "")
        };
      });
    
    Logger.log("getAllCarneLeao: " + carneLeao.length + " dados de Carnê Leão encontrados. Dados retornados: " + JSON.stringify(carneLeao));
    return carneLeao;
  } catch (error) {
    Logger.log("ERRO em getAllCarneLeao: " + error.message + " - " + error.stack);
    return [];
  }
}

/**
 * Adiciona novos dados de Carnê Leão
 */
function addCarneLeao(carneLeaoData) {
  try {
    Logger.log("addCarneLeao: Tentando adicionar dados de Carnê Leão: " + JSON.stringify(carneLeaoData));
    const sheet = getSheet("CarneLeao");
    const lastRow = sheet.getLastRow();
    
    let newId = 1;
    if (lastRow > 1) {
      const lastId = sheet.getRange(lastRow, 1).getValue();
      newId = Number(lastId) + 1;
    }
    
    const newRow = [
      newId,
      carneLeaoData.cliente_id,
      carneLeaoData.mes_ano || "",
      carneLeaoData.valor || 0,
      carneLeaoData.data_pagamento || "",
      carneLeaoData.situacao || ""
    ];
    
    sheet.appendRow(newRow);
    Logger.log("addCarneLeao: Dados de Carnê Leão adicionados com sucesso: ID " + newId);
    return true;
  } catch (error) {
    Logger.log("ERRO em addCarneLeao: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Atualiza dados de Carnê Leão existentes
 */
function updateCarneLeao(carneId, carneLeaoData) {
  try {
    Logger.log("updateCarneLeao: Tentando atualizar dados de Carnê Leão ID " + carneId + " com dados: " + JSON.stringify(carneLeaoData));
    const sheet = getSheet("CarneLeao");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhum dado de Carnê Leão para atualizar");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 6);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == carneId) {
        const rowIndex = i + 2;
        const updatedRow = [
          carneId,
          carneLeaoData.cliente_id !== undefined ? carneLeaoData.cliente_id : values[i][1],
          carneLeaoData.mes_ano !== undefined ? carneLeaoData.mes_ano : values[i][2],
          carneLeaoData.valor !== undefined ? carneLeaoData.valor : values[i][3],
          carneLeaoData.data_pagamento !== undefined ? carneLeaoData.data_pagamento : values[i][4],
          carneLeaoData.situacao !== undefined ? carneLeaoData.situacao : values[i][5]
        ];
        
        sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
        Logger.log("updateCarneLeao: Dados de Carnê Leão atualizados: ID " + carneId);
        return true;
      }
    }
    
    throw new Error("Dados de Carnê Leão não encontrados");
  } catch (error) {
    Logger.log("ERRO em updateCarneLeao: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Remove dados de Carnê Leão
 */
function deleteCarneLeao(carneId) {
  try {
    Logger.log("deleteCarneLeao: Tentando remover dados de Carnê Leão ID " + carneId);
    const sheet = getSheet("CarneLeao");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhum dado de Carnê Leão para remover");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 1);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == carneId) {
        sheet.deleteRow(i + 2);
        Logger.log("deleteCarneLeao: Dados de Carnê Leão removidos: ID " + carneId);
        return true;
      }
    }
    
    throw new Error("Dados de Carnê Leão não encontrados");
  } catch (error) {
    Logger.log("ERRO em deleteCarneLeao: " + error.message + " - " + error.stack);
    return false;
  }
}

// ==================== FUNÇÕES CRUD PARA PARCELAMENTOS ====================

/**
 * Obtém todos os parcelamentos
 * Estrutura conforme XML Schema (6 campos)
 */
function getAllParcelamentos() {
  try {
    Logger.log("getAllParcelamentos: Iniciando busca de todos os parcelamentos.");
    const sheet = getSheet("Parcelamentos");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      Logger.log("getAllParcelamentos: Nenhum parcelamento encontrado (apenas cabeçalho). Retornando array vazio.");
      return [];
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 6);
    const values = range.getValues();
    
    const parcelamentos = values
      .filter(row => row[0]) // Filtra linhas vazias
      .map(row => {
        return {
          parcelamento_id: Number(row[0]),
          cliente_id: Number(row[1]),
          orgao: String(row[2] || ""),
          valor_total: Number(row[3] || 0),
          numero_parcelas: Number(row[4] || 0),
          situacao: String(row[5] || "")
        };
      });
    
    Logger.log("getAllParcelamentos: " + parcelamentos.length + " parcelamentos encontrados. Dados retornados: " + JSON.stringify(parcelamentos));
    return parcelamentos;
  } catch (error) {
    Logger.log("ERRO em getAllParcelamentos: " + error.message + " - " + error.stack);
    return [];
  }
}

/**
 * Adiciona um novo parcelamento
 */
function addParcelamento(parcelamentoData) {
  try {
    Logger.log("addParcelamento: Tentando adicionar parcelamento: " + JSON.stringify(parcelamentoData));
    const sheet = getSheet("Parcelamentos");
    const lastRow = sheet.getLastRow();
    
    let newId = 1;
    if (lastRow > 1) {
      const lastId = sheet.getRange(lastRow, 1).getValue();
      newId = Number(lastId) + 1;
    }
    
    const newRow = [
      newId,
      parcelamentoData.cliente_id,
      parcelamentoData.orgao || "",
      parcelamentoData.valor_total || 0,
      parcelamentoData.numero_parcelas || 0,
      parcelamentoData.situacao || ""
    ];
    
    sheet.appendRow(newRow);
    Logger.log("addParcelamento: Parcelamento adicionado com sucesso: ID " + newId);
    return true;
  } catch (error) {
    Logger.log("ERRO em addParcelamento: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Atualiza um parcelamento existente
 */
function updateParcelamento(parcelamentoId, parcelamentoData) {
  try {
    Logger.log("updateParcelamento: Tentando atualizar parcelamento ID " + parcelamentoId + " com dados: " + JSON.stringify(parcelamentoData));
    const sheet = getSheet("Parcelamentos");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhum parcelamento para atualizar");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 6);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == parcelamentoId) {
        const rowIndex = i + 2;
        const updatedRow = [
          parcelamentoId,
          parcelamentoData.cliente_id !== undefined ? parcelamentoData.cliente_id : values[i][1],
          parcelamentoData.orgao !== undefined ? parcelamentoData.orgao : values[i][2],
          parcelamentoData.valor_total !== undefined ? parcelamentoData.valor_total : values[i][3],
          parcelamentoData.numero_parcelas !== undefined ? parcelamentoData.numero_parcelas : values[i][4],
          parcelamentoData.situacao !== undefined ? parcelamentoData.situacao : values[i][5]
        ];
        
        sheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
        Logger.log("updateParcelamento: Parcelamento atualizado: ID " + parcelamentoId);
        return true;
      }
    }
    
    throw new Error("Parcelamento não encontrado");
  } catch (error) {
    Logger.log("ERRO em updateParcelamento: " + error.message + " - " + error.stack);
    return false;
  }
}

/**
 * Remove um parcelamento
 */
function deleteParcelamento(parcelamentoId) {
  try {
    Logger.log("deleteParcelamento: Tentando remover parcelamento ID " + parcelamentoId);
    const sheet = getSheet("Parcelamentos");
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      throw new Error("Nenhum parcelamento para remover");
    }
    
    const range = sheet.getRange(2, 1, lastRow - 1, 1);
    const values = range.getValues();
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] == parcelamentoId) {
        sheet.deleteRow(i + 2);
        Logger.log("deleteParcelamento: Parcelamento removido: ID " + parcelamentoId);
        return true;
      }
    }
    
    throw new Error("Parcelamento não encontrado");
  } catch (error) {
    Logger.log("ERRO em deleteParcelamento: " + error.message + " - " + error.stack);
    return false;
  }
}
