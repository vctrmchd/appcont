# AppCont - Sistema de Gestão de Clientes Contábeis

## 📋 Metadados do Sistema

```yaml
project_name: AppCont
version: 2.0
type: web_application
purpose: gestão de clientes contábeis com controle de usuários e auditoria
status: production
license: proprietary
owner: Sorria/Medic
year: 2025
```

## 🎯 Visão Geral

Sistema web para gerenciamento completo de clientes contábeis, incluindo controle de usuários, gestão de senhas e registro de auditoria. Desenvolvido para uso interno das empresas Sorria e Medic.

### Principais Funcionalidades
- Gestão completa de clientes contábeis
- Sistema de controle de usuários e permissões
- Gerenciamento seguro de senhas de serviços
- Auditoria completa de operações
- Interface responsiva e intuitiva
- Dashboard com estatísticas em tempo real

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológico

```yaml
frontend:
  html: HTML5
  css: CSS3
  javascript: Vanilla JavaScript (ES6+)
  ui_framework: Materialize CSS
  
backend:
  database: PostgreSQL (via Supabase)
  baas: Supabase
  
deployment:
  platform: Vercel
  branch: v2
  
version_control:
  platform: GitHub
  repository: vctrmchd/appcont
```

### Estrutura de Arquivos

```
appcont/
│
├── index.html              # Interface principal do sistema
├── app.js                  # Lógica de negócio e controle da aplicação
├── supabase-config.js      # Configurações e conexão com Supabase
├── vercel.json             # Configurações de deploy na Vercel
└── README.md               # Documentação do sistema
```

---

## 💾 Modelo de Dados

### Diagrama de Relacionamento

```
usuarios (1) ──── (N) auditoria
    │
    │ (executa ações)
    │
    ├─── (gerencia) ──> clientes (1) ──── (N) senhas
```

### Tabela: `clientes`

Armazena informações completas dos clientes contábeis.

```sql
CREATE TABLE clientes (
    -- Identificação
    id_cliente SERIAL PRIMARY KEY,
    razao_social VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18) UNIQUE NOT NULL,
    
    -- Organização Interna
    empresa_responsavel VARCHAR(50),
    squad VARCHAR(50),
    data_entrada DATE,
    
    -- Dados Cadastrais
    data_constituicao DATE,
    municipio VARCHAR(100),
    situacao VARCHAR(50),
    
    -- Informações Tributárias
    regime_tributacao VARCHAR(50),
    faturamento DECIMAL(15,2),
    vencimento_iss DATE,
    prazo_efd_reinf DATE,
    prazo_fechamento DATE,
    status_parcelamento VARCHAR(10),
    
    -- Regularidade Fiscal
    ultima_consulta_fiscal DATE,
    status_regularidade_federal VARCHAR(50),
    status_regularidade_municipal VARCHAR(50),
    status_regularidade_estadual VARCHAR(50),
    status_regularidade_conselho VARCHAR(50),
    observacoes_regularidade TEXT,
    
    -- Observações
    observacoes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Campos Principais:**
- `id_cliente`: Identificador único auto-incremental
- `cpf_cnpj`: Documento único do cliente (CPF ou CNPJ)
- `empresa_responsavel`: Empresa responsável (Sorria ou Medic)
- `squad`: Equipe responsável pelo cliente
- `regime_tributacao`: Regime tributário (Simples Nacional, Lucro Presumido, etc.)
- `status_regularidade_*`: Status de regularidade em diferentes esferas

### Tabela: `senhas`

Gerencia credenciais de acesso a serviços dos clientes.

```sql
CREATE TABLE senhas (
    id SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    servico VARCHAR(100) NOT NULL,
    usuario VARCHAR(100),
    senha_criptografada TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Relacionamentos:**
- `id_cliente`: Chave estrangeira para `clientes` com CASCADE DELETE
- Um cliente pode ter múltiplas senhas para diferentes serviços

**Segurança:**
- Senhas armazenadas no campo `senha_criptografada`
- Exclusão em cascata ao deletar cliente

### Tabela: `usuarios`

Controla acesso e permissões dos usuários do sistema.

```sql
CREATE TABLE usuarios (
    email VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    empresa VARCHAR(50) NOT NULL,
    papel VARCHAR(50) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Papéis Disponíveis:**
- `Administrador`: Acesso total ao sistema
- `Gerente`: Acesso gerencial com restrições
- `Usuário`: Acesso básico de leitura

**Empresas:**
- Sorria
- Medic

### Tabela: `auditoria`

Registra todas as operações realizadas no sistema.

```sql
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    email_usuario VARCHAR(255),
    acao VARCHAR(100) NOT NULL,
    id_cliente_afetado INTEGER,
    detalhes TEXT
);
```

**Tipos de Ações Registradas:**
- `LOGIN`: Acesso ao sistema
- `CRIAR_CLIENTE`: Criação de novo cliente
- `EDITAR_CLIENTE`: Modificação de dados
- `DELETAR_CLIENTE`: Exclusão de cliente
- `VISUALIZAR_SENHA`: Acesso a senha de serviço
- `CRIAR_SENHA`: Cadastro de nova senha
- `CRIAR_USUARIO`: Cadastro de novo usuário
- `EDITAR_USUARIO`: Modificação de usuário

---

## 🚀 Instalação e Configuração

### Pré-requisitos

```yaml
requirements:
  - Conta ativa no Supabase
  - Conta ativa na Vercel
  - Conta no GitHub
  - Git instalado
  - Navegador web moderno
```

### 1. Configuração do Banco de Dados (Supabase)

#### Passo 1.1: Criar as Tabelas

Acesse o SQL Editor no Supabase e execute:

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
```

#### Passo 1.2: Desabilitar Row Level Security (RLS)

⚠️ **ATENÇÃO**: Para ambiente de produção, considere implementar RLS adequadamente.

```sql
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE senhas DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria DISABLE ROW LEVEL SECURITY;
```

#### Passo 1.3: Inserir Dados Iniciais

```sql
-- Usuários padrão
INSERT INTO usuarios (email, nome, empresa, papel, ativo) VALUES
('admin@sorria.com.br', 'Admin Sorria', 'Sorria', 'Administrador', true),
('gerente@sorria.com.br', 'Gerente Sorria', 'Sorria', 'Gerente', true),
('admin@medic.com.br', 'Admin Medic', 'Medic', 'Administrador', true);

-- Clientes de exemplo
INSERT INTO clientes (empresa_responsavel, squad, data_entrada, razao_social, cpf_cnpj, municipio, situacao, regime_tributacao, faturamento) VALUES
('Sorria', '1', '2023-01-15', 'Cliente Alpha Ltda', '11.111.111/0001-11', 'São Paulo/SP', 'Ativo', 'Simples Nacional', 150000.00),
('Medic', '2', '2023-02-01', 'Clínica Beta S.A.', '22.222.222/0001-22', 'Rio de Janeiro/RJ', 'Ativo', 'Lucro Presumido', 250000.00),
('Sorria', '1', '2023-03-10', 'Consultoria Gama', '33.333.333/0001-33', 'Belo Horizonte/MG', 'Ativo', 'Simples Nacional', 80000.00);
```

#### Passo 1.4: Configurar CORS

1. Acesse: `Settings → API → CORS`
2. Adicione a URL do deploy Vercel
3. Salve as configurações

### 2. Configuração do Arquivo `supabase-config.js`

Crie/edite o arquivo com suas credenciais:

```javascript
const SUPABASE_URL = 'https://sua-url.supabase.co';
const SUPABASE_KEY = 'sua-chave-anon-publica';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
```

**Onde encontrar:**
- URL: `Settings → API → Project URL`
- Key: `Settings → API → Project API keys → anon public`

### 3. Deploy na Vercel

#### Passo 3.1: Preparar Repositório

```bash
git add .
git commit -m "Configuração inicial do sistema"
git push origin v2
```

#### Passo 3.2: Configurar Deploy

1. Acesse: https://vercel.com/dashboard
2. Clique em: `Add New... → Project`
3. Selecione o repositório: `appcont`
4. Configure:
   - **Branch**: `v2`
   - **Root Directory**: `./`
   - **Framework Preset**: `Other`
5. Clique em: `Deploy`

#### Passo 3.3: Aguardar Deploy

O processo leva aproximadamente 1-2 minutos. Após conclusão, você receberá uma URL de produção.

---

## 👥 Sistema de Usuários

### Credenciais Padrão

```yaml
administradores:
  - email: admin@sorria.com.br
    empresa: Sorria
    papel: Administrador
    
  - email: admin@medic.com.br
    empresa: Medic
    papel: Administrador

gerentes:
  - email: gerente@sorria.com.br
    empresa: Sorria
    papel: Gerente
```

### Hierarquia de Permissões

```
Administrador (nível 3)
│
├─ Gestão completa de usuários
├─ Acesso ao log de auditoria
├─ Todas as permissões do Gerente
│
Gerente (nível 2)
│
├─ Criar/editar/deletar clientes
├─ Gerenciar senhas
├─ Visualizar relatórios
│
Usuário (nível 1)
│
├─ Visualizar clientes
├─ Buscar informações
└─ Dashboard com estatísticas
```

---

## 🎨 Funcionalidades Detalhadas

### 1. Dashboard

**Acesso**: Todos os usuários

```yaml
componentes:
  - Total de clientes ativos
  - Clientes por empresa (Sorria/Medic)
  - Clientes por regime tributário
  - Gráficos de distribuição
  - Estatísticas em tempo real
```

### 2. Listagem de Clientes

**Acesso**: Todos os usuários

```yaml
recursos:
  - Visualização em tabela responsiva
  - Ordenação por colunas
  - Paginação automática
  - Indicadores visuais de status
  - Ações rápidas (visualizar, editar, deletar)
```

### 3. Busca de Clientes

**Acesso**: Todos os usuários

```yaml
critérios_busca:
  - Razão Social
  - CPF/CNPJ
  - Município
  - Empresa Responsável
  - Squad
  
tipo_busca: busca em tempo real (live search)
sensibilidade: case-insensitive
```

### 4. Cadastro de Clientes

**Acesso**: Gerente e Administrador

```yaml
abas:
  1_dados_basicos:
    - Empresa Responsável
    - Squad
    - Data de Entrada
    - Razão Social
    - CPF/CNPJ
    - Data de Constituição
    - Município
    - Situação
    
  2_informacoes_tributarias:
    - Regime de Tributação
    - Faturamento
    - Vencimento ISS
    - Prazo EFD-Reinf
    - Prazo de Fechamento
    - Status de Parcelamento
    - Observações
    
  3_regularidade_fiscal:
    - Última Consulta Fiscal
    - Status Regularidade Federal
    - Status Regularidade Municipal
    - Status Regularidade Estadual
    - Status Regularidade Conselho
    - Observações sobre Regularidade

validações:
  - CPF/CNPJ único no sistema
  - Campos obrigatórios validados
  - Formato de data validado
  - Valores numéricos validados
```

### 5. Gestão de Senhas

**Acesso**: Gerente e Administrador

```yaml
funcionalidades:
  - Adicionar senha para serviço
  - Visualizar senhas (com registro em auditoria)
  - Editar senhas existentes
  - Deletar senhas
  - Criptografia automática

campos:
  - Serviço (ex: Portal NFS-e, e-CAC, SEFAZ)
  - Usuário
  - Senha (criptografada)

segurança:
  - Senhas ocultas por padrão
  - Visualização registrada em auditoria
  - Armazenamento criptografado
```

### 6. Gestão de Usuários

**Acesso**: Apenas Administrador

```yaml
operações:
  - Listar todos os usuários
  - Criar novo usuário
  - Editar usuário existente
  - Ativar/desativar usuário
  - Alterar papel do usuário

campos:
  - Email (identificador único)
  - Nome completo
  - Empresa (Sorria/Medic)
  - Papel (Administrador/Gerente/Usuário)
  - Status (Ativo/Inativo)
```

### 7. Log de Auditoria

**Acesso**: Apenas Administrador

```yaml
informações_registradas:
  - Timestamp da ação
  - Email do usuário
  - Tipo de ação
  - Cliente afetado (se aplicável)
  - Detalhes da operação

filtros:
  - Por período
  - Por usuário
  - Por tipo de ação
  - Por cliente

visualização:
  - Ordenação cronológica reversa (mais recente primeiro)
  - Paginação automática
  - Exportação para relatórios
```

---

## 🔐 Segurança

### Implementações Atuais

```yaml
atual:
  - Senhas criptografadas no banco
  - Validação de usuário por email
  - Registro de auditoria completo
  - Validação de permissões por papel
  - CORS configurado
  - RLS desabilitado (ambiente de desenvolvimento)
```

### Melhorias Recomendadas

```yaml
recomendado_producao:
  autenticacao:
    - Implementar Supabase Auth
    - Login com email/senha
    - Recuperação de senha
    - Autenticação de dois fatores (2FA)
    
  autorizacao:
    - Habilitar Row Level Security (RLS)
    - Políticas de acesso por empresa
    - Políticas de acesso por papel
    
  criptografia:
    - Criptografia em trânsito (HTTPS)
    - Criptografia de dados sensíveis
    - Hash de senhas com salt
    
  monitoramento:
    - Log de tentativas de acesso
    - Alertas de atividade suspeita
    - Backup automático
```

---

## 🐛 Resolução de Problemas

### Problema: Não consigo fazer login

```yaml
verificações:
  1: Usuário existe no banco de dados?
     query: SELECT * FROM usuarios WHERE email = 'seu@email.com';
     
  2: Usuário está ativo?
     query: SELECT ativo FROM usuarios WHERE email = 'seu@email.com';
     
  3: Console do navegador mostra erros?
     ação: Pressione F12 e verifique a aba Console
     
  4: Supabase está respondendo?
     verificar: Status do Supabase
```

### Problema: Clientes não aparecem

```yaml
verificações:
  1: RLS está desabilitado?
     query: ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
     
  2: Dados foram inseridos?
     query: SELECT COUNT(*) FROM clientes;
     
  3: Console mostra erros de rede?
     ação: Verificar aba Network (F12)
     
  4: CORS configurado corretamente?
     verificar: Supabase → Settings → API → CORS
```

### Problema: Deploy falhou na Vercel

```yaml
verificações:
  1: Branch correto selecionado?
     correto: v2
     
  2: Arquivos estão no repositório?
     verificar: index.html, app.js, supabase-config.js
     
  3: vercel.json está configurado?
     verificar: Arquivo existe e está válido
     
  4: Logs de erro da Vercel
     acessar: Vercel Dashboard → Deployments → Ver logs
```

### Problema: Senhas não aparecem criptografadas

```yaml
causa: Campo incorreto sendo usado
solução: Usar campo 'senha_criptografada' ao salvar
código_correto: |
  await supabase
    .from('senhas')
    .insert({
      senha_criptografada: senhaCriptografada
    });
```

---

## 📊 Estrutura de Dados para IA

### Formato JSON para Integração

```json
{
  "system": {
    "name": "AppCont",
    "version": "2.0",
    "type": "web_application",
    "purpose": "accounting_client_management"
  },
  "database": {
    "provider": "supabase",
    "type": "postgresql",
    "tables": [
      {
        "name": "clientes",
        "primary_key": "id_cliente",
        "unique_fields": ["cpf_cnpj"],
        "relationships": [
          {
            "type": "one_to_many",
            "target_table": "senhas",
            "foreign_key": "id_cliente"
          }
        ]
      },
      {
        "name": "senhas",
        "primary_key": "id",
        "relationships": [
          {
            "type": "many_to_one",
            "target_table": "clientes",
            "foreign_key": "id_cliente",
            "on_delete": "CASCADE"
          }
        ]
      },
      {
        "name": "usuarios",
        "primary_key": "email",
        "roles": ["Administrador", "Gerente", "Usuário"],
        "companies": ["Sorria", "Medic"]
      },
      {
        "name": "auditoria",
        "primary_key": "id",
        "purpose": "action_logging",
        "indexed_fields": ["email_usuario", "timestamp", "acao"]
      }
    ]
  },
  "user_roles": {
    "Administrador": {
      "level": 3,
      "permissions": [
        "manage_users",
        "view_audit",
        "full_client_access",
        "manage_passwords"
      ]
    },
    "Gerente": {
      "level": 2,
      "permissions": [
        "create_client",
        "edit_client",
        "delete_client",
        "manage_passwords"
      ]
    },
    "Usuário": {
      "level": 1,
      "permissions": [
        "view_clients",
        "search_clients",
        "view_dashboard"
      ]
    }
  },
  "features": {
    "implemented": [
      "dashboard",
      "client_listing",
      "client_search",
      "client_crud",
      "password_management",
      "user_management",
      "audit_log"
    ],
    "pending": [
      "real_authentication",
      "deadline_notifications",
      "report_export",
      "RLS_policies"
    ]
  }
}
```

---

## 🔄 Fluxo de Trabalho

### Diagrama de Fluxo Principal

```
[Início] → [Tela de Login]
              ↓
         Validar Usuário
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
[Dashboard]      [Registrar Auditoria]
    ↓
Escolher Ação:
├─ Ver Clientes → [Listagem]
│                      ↓
│                 [Buscar/Filtrar]
│                      ↓
│                 [Ver Detalhes] → [Editar] → [Salvar]
│                      ↓
│                 [Gerenciar Senhas]
│
├─ Criar Cliente → [Formulário] → [Validar] → [Salvar]
│                                              ↓
│                                    [Registrar Auditoria]
│
├─ Gerenciar Usuários (Admin) → [CRUD Usuários]
│
└─ Ver Auditoria (Admin) → [Log de Ações]
```

---

## 📈 Roadmap de Desenvolvimento

### Fase 1: Funcionalidades Básicas ✅ (Concluída)

- [x] Estrutura do banco de dados
- [x] CRUD de clientes
- [x] Sistema de usuários
- [x] Interface responsiva
- [x] Dashboard básico

### Fase 2: Segurança 🚧 (Em desenvolvimento)

- [ ] Implementar Supabase Auth
- [ ] Habilitar Row Level Security
- [ ] Políticas de acesso por empresa
- [ ] Sistema de recuperação de senha
- [ ] Autenticação de dois fatores

### Fase 3: Funcionalidades Avançadas 📋 (Planejado)

- [ ] Notificações de vencimento
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Gráficos avançados no dashboard
- [ ] Sistema de tags para clientes
- [ ] Histórico de alterações por cliente

### Fase 4: Otimizações 📋 (Planejado)

- [ ] Cache de dados frequentes
- [ ] Otimização de queries
- [ ] Lazy loading de imagens
- [ ] PWA (Progressive Web App)
- [ ] Modo offline

---

## 🤝 Contribuição

### Para Desenvolvedores

```yaml
processo:
  1: Fork do repositório
  2: Criar branch de feature
     comando: git checkout -b feature/nova-funcionalidade
  3: Commit das mudanças
     comando: git commit -m "Adiciona nova funcionalidade"
  4: Push para o branch
     comando: git push origin feature/nova-funcionalidade
  5: Abrir Pull Request no GitHub

padrões_código:
  - Usar ES6+ JavaScript
  - Seguir padrões de nomenclatura camelCase
  - Comentar código complexo
  - Testar antes de commitar
  - Manter responsividade
```

---

## 📞 Suporte

### Canais de Suporte

```yaml
issues:
  plataforma: GitHub
  url: https://github.com/vctrmchd/appcont/issues
  
documentação:
  localização: Este arquivo README.md
  
contato:
  empresa_1: Sorria
  empresa_2: Medic
```

### Reportar Bug

Ao reportar um bug, inclua:

1. **Descrição do problema**
2. **Passos para reproduzir**
3. **Comportamento esperado**
4. **Comportamento atual**
5. **Screenshots (se aplicável)**
6. **Console logs (F12)**
7. **Navegador e versão**

---

## 📄 Licença

```
Propriedade: Sorria/Medic
Uso: Interno
Ano: 2025
Direitos: Todos os direitos reservados
```

---

## 📚 Referências Técnicas

### Documentação Externa

```yaml
supabase:
  docs: https://supabase.com/docs
  api: https://supabase.com/docs/reference/javascript
  
materialize:
  docs: https://materializecss.com
  components: https://materializecss.com/components.html
  
vercel:
  docs: https://vercel.com/docs
  deployment: https://vercel.com/docs/deployments
```

### Queries SQL Úteis

```sql
-- Ver total de clientes por empresa
SELECT empresa_responsavel, COUNT(*) as total 
FROM clientes 
GROUP BY empresa_responsavel;

-- Ver últimas ações de auditoria
SELECT * FROM auditoria 
ORDER BY timestamp DESC 
LIMIT 10;

-- Ver clientes com faturamento acima de R$ 200k
SELECT razao_social, faturamento 
FROM clientes 
WHERE faturamento > 200000 
ORDER BY faturamento DESC;

-- Ver usuários ativos
SELECT email, nome, papel, empresa 
FROM usuarios 
WHERE ativo = true;

-- Contar senhas por cliente
SELECT c.razao_social, COUNT(s.id) as total_senhas
FROM clientes c
LEFT JOIN senhas s ON c.id_cliente = s.id_cliente
GROUP BY c.razao_social;
```

---

## 🔍 Metadados para IA

```yaml
ai_metadata:
  indexing_tags:
    - accounting_management
    - client_database
    - web_application
    - supabase
    - postgresql
    - audit_system
    
  key_entities:
    - clientes (clients)
    - senhas (passwords)
    - usuarios (users)
    - auditoria (audit_log)
    
  main_operations:
    - CREATE: client, user, password
    - READ: all entities
    - UPDATE: client, user, password
    - DELETE: client, user, password
    - SEARCH: clients
    - AUDIT: all operations
    
  tech_stack_keywords:
    - vanilla_javascript
    - materialize_css
    - supabase
    - postgresql
    - vercel
    - html5
    - css3
    
  business_domain:
    - accounting
    - tax_compliance
    - client_management
    - password_vault
    - user_access_control
```

---

**Versão da Documentação**: 2.0  
**Última Atualização**: 2025  
**Mantido por**: Sorria/Medic  
**Status**: Em Produção
