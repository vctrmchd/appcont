# 📊 Sistema de Gestão de Clientes - Sorria/Medic

Aplicação web para gestão de clientes contábeis com controle de usuários, senhas e auditoria.

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Materialize CSS
- **Backend**: Supabase (PostgreSQL)
- **Deploy**: Vercel

## 📦 Estrutura do Projeto

```
appcont/
├── index.html              # Página principal
├── app.js                  # Lógica da aplicação
├── supabase-config.js      # Configuração do Supabase
├── vercel.json             # Configuração do Vercel
└── README.md               # Este arquivo
```

## 🔧 Configuração

### Pré-requisitos

1. Conta no Supabase
2. Conta na Vercel
3. Conta no GitHub

### Setup do Banco de Dados

Execute os seguintes comandos no SQL Editor do Supabase:

#### 1. Criar Tabelas

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

#### 2. Desabilitar RLS (Apenas para Beta)

```sql
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE senhas DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria DISABLE ROW LEVEL SECURITY;
```

#### 3. Inserir Dados de Teste

```sql
-- Usuários
INSERT INTO usuarios (email, nome, empresa, papel, ativo) VALUES
('admin@sorria.com.br', 'Admin Sorria', 'Sorria', 'Administrador', true),
('gerente@sorria.com.br', 'Gerente Sorria', 'Sorria', 'Gerente', true),
('admin@medic.com.br', 'Admin Medic', 'Medic', 'Administrador', true);

-- Clientes
INSERT INTO clientes (empresa_responsavel, squad, data_entrada, razao_social, cpf_cnpj, 
  municipio, situacao, regime_tributacao, faturamento) VALUES
('Sorria', '1', '2023-01-15', 'Cliente Alpha Ltda', '11.111.111/0001-11', 
  'São Paulo/SP', 'Ativo', 'Simples Nacional', 150000.00),
('Medic', '2', '2023-02-01', 'Clínica Beta S.A.', '22.222.222/0001-22', 
  'Rio de Janeiro/RJ', 'Ativo', 'Lucro Presumido', 250000.00),
('Sorria', '1', '2023-03-10', 'Consultoria Gama', '33.333.333/0001-33', 
  'Belo Horizonte/MG', 'Ativo', 'Simples Nacional', 80000.00);
```

## 🌐 Deploy

### Via GitHub + Vercel

1. Faça push dos arquivos para o GitHub (branch `v2`)
2. Acesse https://vercel.com/dashboard
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

## 🔐 Segurança

⚠️ **IMPORTANTE**: Esta é uma versão BETA com RLS desabilitado. Antes de ir para produção:

1. Habilitar Row Level Security (RLS)
2. Implementar autenticação real
3. Configurar políticas de acesso
4. Adicionar criptografia de senhas

## 📝 Funcionalidades

### ✅ Implementadas (Beta)

- Dashboard com estatísticas
- Listagem de clientes
- Busca de clientes
- Visualizar detalhes
- Deletar clientes
- Gestão de usuários (Admin)
- Log de auditoria (Admin)

### 🚧 Em Desenvolvimento

- Criação/edição de clientes
- Criação/edição de usuários
- Gestão de senhas
- Sistema de login
- Notificações de vencimento
- Exportação de relatórios

## 🐛 Troubleshooting

### Erro de CORS
Adicione a URL do Vercel nas configurações do Supabase:
Settings → API → CORS → Adicionar URL

### Dados não aparecem
1. Verifique o console (F12)
2. Confirme que os dados foram inseridos no Supabase
3. Verifique se o RLS está desabilitado

### Erro ao carregar usuário
Certifique-se que existe um usuário com email `admin@sorria.com.br` no banco

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.

## 📄 Licença

Uso interno - Sorria/Medic © 2025
