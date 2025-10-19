# 📊 Sistema de Gestão de Clientes - Sorria/Medic

Aplicação web para gestão de clientes contábeis com controle de usuários, senhas e auditoria.

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Materialize CSS
- **Backend**: Supabase (PostgreSQL)
- **Deploy**: Vercel

## 📁 Estrutura do Projeto

```
appcont/
├── index.html           # Página principal
├── app.js              # Lógica da aplicação
├── supabase-config.js  # Configuração do Supabase
├── vercel.json         # Configuração do Vercel
└── README.md           # Este arquivo
```

## ✅ Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com)
- Conta no [GitHub](https://github.com)

## 🗄️ Configuração do Banco de Dados

Execute os seguintes comandos no SQL Editor do Supabase:

```sql
-- Tabela CLIENTES
CREATE TABLE clientes (
  id_cliente SERIAL PRIMARY KEY,
  empresa_responsavel VARCHAR(50),
  squad VARCHAR(50),
  data_entrada DATE,
  razao_social VARCHAR(255),
  cpf_cnpj VARCHAR(18) UNIQUE,
  data_constituicao DATE,
  municipio VARCHAR(100),
  uf VARCHAR(2),
  situacao VARCHAR(50),
  regime_tributacao VARCHAR(50),
  faturamento DECIMAL(15,2),
  vencimento_iss DATE,
  prazo_efd_reinf DATE,
  prazo_fechamento DATE,
  status_parcelamento VARCHAR(10),
  observacoes TEXT,
  ultima_consulta_fiscal DATE,
  status_regularidade_federal VARCHAR(50),
  status_regularidade_municipal VARCHAR(50),
  status_regularidade_estadual VARCHAR(50),
  status_regularidade_conselho VARCHAR(50),
  observacoes_regularidade TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela SENHAS
CREATE TABLE senhas (
  id SERIAL PRIMARY KEY,
  id_cliente INTEGER REFERENCES clientes(id_cliente) ON DELETE CASCADE,
  servico VARCHAR(100),
  usuario VARCHAR(100),
  senha_criptografada TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela USUARIOS
CREATE TABLE usuarios (
  email VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255),
  empresa VARCHAR(50),
  papel VARCHAR(50),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela AUDITORIA
CREATE TABLE auditoria (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  email_usuario VARCHAR(255),
  acao VARCHAR(100),
  id_cliente_afetado INTEGER,
  detalhes TEXT
);

-- Desabilitar RLS (temporariamente para desenvolvimento)
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE senhas DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria DISABLE ROW LEVEL SECURITY;
```

## 🌱 Dados Iniciais

```sql
-- Usuários
INSERT INTO usuarios (email, nome, empresa, papel, ativo) VALUES
('admin@sorria.com.br', 'Admin Sorria', 'Sorria', 'Administrador', true),
('gerente@sorria.com.br', 'Gerente Sorria', 'Sorria', 'Gerente', true),
('admin@medic.com.br', 'Admin Medic', 'Medic', 'Administrador', true);

-- Clientes
INSERT INTO clientes (empresa_responsavel, squad, data_entrada, razao_social, cpf_cnpj,
  municipio, uf, situacao, regime_tributacao, faturamento) VALUES
('Sorria', '1', '2023-01-15', 'Cliente Alpha Ltda', '11.111.111/0001-11',
  'São Paulo', 'SP', 'Ativo', 'Simples Nacional', 150000.00),
('Medic', '2', '2023-02-01', 'Clínica Beta S.A.', '22.222.222/0001-22',
  'Rio de Janeiro', 'RJ', 'Ativo', 'Lucro Presumido', 250000.00),
('Sorria', '1', '2023-03-10', 'Consultoria Gama', '33.333.333/0001-33',
  'Belo Horizonte', 'MG', 'Ativo', 'Simples Nacional', 80000.00);
```

## 🚢 Deploy na Vercel

1. Faça push dos arquivos para o GitHub (branch `v2`)
2. Acesse [https://vercel.com/dashboard](https://vercel.com/dashboard)
3. Clique em "Add New..." → "Project"
4. Selecione o repositório `appcont`
5. Configure:
   - **Branch**: `v2`
   - **Root Directory**: `./`
   - **Framework Preset**: Other
6. Clique em "Deploy"

## 👥 Usuários de Teste

- **Admin Sorria**: admin@sorria.com.br
- **Admin Medic**: admin@medic.com.br
- **Gerente**: gerente@sorria.com.br

## 🔜 Próximas Funcionalidades

- Habilitar Row Level Security (RLS)
- Implementar autenticação real
- Configurar políticas de acesso
- Adicionar criptografia de senhas

## 🎯 Funcionalidades Implementadas

### 📊 Dashboard
- ✅ Dashboard com estatísticas em tempo real
  - Total de clientes
  - Clientes ativos
  - Vencimentos próximos (30 dias)
  - Pendências fiscais
- ✅ Gráficos de distribuição:
  - Clientes por empresa
  - Clientes por regime de tributação
- ✅ Identificação automática de alertas e vencimentos

### 👥 Gestão de Clientes

#### Listagem e Visualização
- ✅ Listagem de clientes com tabela responsiva
- ✅ **Busca em tempo real** por Razão Social ou CPF/CNPJ (com debounce de 300ms)
- ✅ **Sistema de paginação inteligente**:
  - Navegação por páginas
  - Indicador de quantidade de registros
  - Informações de página atual e total
  - 10 clientes por página
- ✅ **Filtros avançados** (painel expansível):
  - Filtro por empresa (Sorria/Medic)
  - Filtro por situação (Ativo/Inativo/Baixada)
  - Filtro por regime de tributação (Simples Nacional, Lucro Presumido, Lucro Real, MEI)
  - Filtro por UF (todos os estados brasileiros)
  - Botão para limpar todos os filtros
- ✅ **Ordenação dinâmica** por qualquer coluna:
  - Código, Razão Social, CPF/CNPJ, UF, Situação, Empresa, Regime de Tributação
  - Alternância entre ordem crescente e decrescente
  - Indicador visual de ordenação
- ✅ **Visualização detalhada** em modal expansivo com:
  - Cabeçalho com gradiente e informações principais
  - Badges visuais para status (Ativo, Inativo, Baixada)
  - Seções organizadas:
    - Informações Básicas (CPF/CNPJ, Município/UF, Squad, Faturamento)
    - Datas Importantes (Entrada, Constituição, Vencimentos, Prazos)
    - Informações Fiscais (Regime de Tributação, Parcelamento)
    - Status de Regularidade com badges coloridos:
      - Federal (OK/Pendente/Irregular)
      - Municipal (OK/Pendente/Irregular)
      - Estadual (OK/Pendente/Irregular)
      - Conselho (OK/Pendente/Irregular)
    - Observações de Regularidade (em destaque)
    - Observações Gerais
  - Layout responsivo em 2 colunas
  - Ícones do Material Design para cada informação
- ✅ Deletar clientes com confirmação
- ✅ Botões de ação no modal de visualização (Editar, Excluir, Fechar)

#### Criação e Edição
- ✅ **Formulário completo** organizado em seções:
  - **Informações Básicas**: Razão Social, CPF/CNPJ, Empresa Responsável, Squad, Município, UF, Situação, Faturamento
  - **Informações Fiscais**: Regime de Tributação, Status de Parcelamento
  - **Datas Importantes**: Data de Entrada, Data de Constituição, Última Consulta Fiscal, Vencimento ISS, Prazo EFD-Reinf, Prazo Fechamento
  - **Status de Regularidade**: Federal, Municipal, Estadual, Conselho, Observações de Regularidade
  - **Observações Gerais**: Campo de texto livre
- ✅ Modal expansivo com cabeçalho estilizado
- ✅ Validação de campos obrigatórios
- ✅ Suporte para criação e edição (mesmo formulário)
- ✅ Campos com labels flutuantes do Materialize
- ✅ Selects estilizados para dropdowns
- ✅ Campos de data com formato brasileiro

#### Design e UX
- ✅ **Badges visuais coloridos** para status:
  - Situação: Verde (Ativo), Laranja (Inativo), Vermelho (Baixada)
  - Regularidade: Verde (OK), Laranja (Pendente), Vermelho (Irregular)
- ✅ Tooltips informativos nos botões
- ✅ Feedback visual com toasts (sucesso, erro, aviso)
- ✅ Hover effect nas linhas da tabela
- ✅ Icons do Material Design em toda interface
- ✅ Layout responsivo para mobile, tablet e desktop

### 📤 Exportação de Dados
- ✅ **Exportar para CSV**:
  - Codificação UTF-8 com BOM
  - Separador de ponto e vírgula (;)
  - Exporta clientes filtrados ou todos
  - Todos os campos incluídos
  - Nome automático com data (ex: `clientes_2025-10-18.csv`)
  - Tratamento de aspas e caracteres especiais
- ✅ **Exportar para Excel**:
  - Formato .xls compatível
  - Tabela formatada com cores
  - Cabeçalhos em destaque
  - Linhas alternadas para melhor leitura
  - Todos os campos incluídos
  - Nome automático com data
- ✅ Dropdown de exportação no menu
- ✅ Log de auditoria para exportações

### 👤 Gestão de Usuários (Admin)
- ✅ Gestão de usuários (Admin):
  - Listagem completa
  - Visualização de informações (email, nome, empresa, papel, status ativo)
  - Deletar usuários com confirmação
- ✅ Controle de acesso por papel (Administrador visualiza tudo)
- 🚧 Criação/edição de usuários (em desenvolvimento)

### 📜 Sistema de Auditoria (Admin)
- ✅ Log de auditoria (Admin):
  - Registro automático de todas as ações
  - Visualização dos últimos 100 registros
  - Informações rastreadas:
    - Data e hora
    - Usuário responsável
    - Ação realizada (Criação, Atualização, Exclusão, Exportação)
    - ID do cliente afetado
    - Detalhes da operação
- ✅ Ações registradas:
  - CLIENTE_CRIADO
  - CLIENTE_ATUALIZADO
  - CLIENTE_DELETADO
  - USUARIO_DELETADO
  - EXPORTAR_CSV
  - EXPORTAR_EXCEL

### 🔧 Recursos Técnicos
- ✅ **Estado centralizado** (appState):
  - Gerenciamento de usuário logado
  - Cache de clientes (todos, filtrados, exibidos)
  - Estado de paginação
  - Estado de ordenação
  - Estado de filtros
  - Controle de modais
  - Controle de edição
- ✅ **Debounce na busca** para otimização de performance (300ms)
- ✅ **Processamento eficiente**:
  - Filtragem em memória
  - Ordenação dinâmica
  - Paginação client-side
- ✅ **Validação de formulários** com feedback visual
- ✅ **Tratamento robusto de erros**:
  - Try-catch em todas operações assíncronas
  - Mensagens amigáveis ao usuário
  - Console logs para debugging
- ✅ **Inicialização automática**:
  - Auto-init do Materialize
  - Carregamento de usuário
  - Navegação para dashboard

## 🔜 Funcionalidades Pendentes

- [ ] Gestão de senhas (CRUD completo)
- [ ] Sistema de login com autenticação
- [ ] Notificações de vencimento automáticas
- [ ] Exportação de relatórios personalizados (PDF)
- [ ] Finalizar CRUD de usuários (criar e editar)
- [ ] Dashboard com gráficos interativos
- [ ] Importação em lote de clientes (CSV/Excel)
- [ ] Histórico de alterações por cliente
- [ ] Sistema de tags/categorias

## ⚙️ Configuração CORS

Adicione a URL do Vercel nas configurações do Supabase:

**Settings → API → CORS → Adicionar URL**

## 🐛 Troubleshooting

### Erro ao carregar dados
- Verifique o console (F12)
- Confirme que os dados foram inseridos no Supabase
- Verifique se o RLS está desabilitado

### Erro "Cannot set properties of undefined"
- Certifique-se que o `appState` tem a propriedade `ui` definida
- Verifique se não há erros de sintaxe no `app.js`

### Erro "Missing initializer in const declaration"
- Verifique se não está usando `const` com propriedades de objetos
- Use `const varName = []` ou `objectName.property = []`

### Usuário não carrega
Certifique-se que existe um usuário com email `admin@sorria.com.br` no banco

### Funções não definidas (showClientes, showDashboard, etc.)
- Verifique se o `app.js` está sendo carregado sem erros
- Confirme a ordem de carregamento dos scripts no HTML
- Verifique se não há erros de sintaxe que impedem o carregamento completo

## 📞 Suporte

Para dúvidas ou problemas, abra uma [issue no GitHub](https://github.com/vctrmchd/appcont/issues).

---

**Uso interno - Sorria/Medic © 2025**