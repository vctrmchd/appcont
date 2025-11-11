# appcont: Sistema Full-Stack de Gestão de Clientes (Estudo de Caso em Data Governance e Segurança)

## 🚀 Demonstração

**Acesse a Aplicação em Produção:** [appcont.vercel.app](https://appcont.vercel.app)

## 💡 Visão Geral e Contexto do Projeto

Este projeto, o `appcont`, é um **estudo de caso prático** que marca meu desenvolvimento em **Análise e Ciência de Dados**.

### O Desafio de Negócios e a Motivação

O projeto nasceu da identificação de um **risco de segurança crítico**: dados sensíveis de clientes, incluindo senhas e acessos de login, estavam expostos em planilhas compartilhadas.

A solução evoluiu de uma simples automação para a criação de um **Sistema de Gestão de Clientes (CRM)** que resolvesse o problema de **Data Governance** e garantisse a **rastreabilidade** e a **segurança** dos dados.

### O Processo de Desenvolvimento e o Foco em Dados

O desenvolvimento foi um processo orgânico de aprendizado, onde o foco principal foi a **lógica de negócios**, a **modelagem de dados relacional** (a partir da análise de 13 planilhas) e a **segurança**.

*   **Desenvolvimento Assistido por IA:** O código foi majoritariamente gerado com o auxílio de Inteligência Artificial. Minha contribuição crucial foi a **definição da lógica**, a **identificação de erros** (como loops) e a **solicitação de correções**, permitindo um foco intenso na arquitetura e na resolução do problema de segurança.

## ✨ Destaques Técnicos e Habilidades de Dados

O projeto demonstra a aplicação de conceitos de engenharia de software e análise de dados essenciais:

| Destaque | Descrição | Habilidade Central para Dados |
| :--- | :--- | :--- |
| **Data Governance (RLS)** | Implementação de **Row-Level Security (RLS)** no Supabase, restringindo o acesso aos dados por **Empresa e Squad**. Isso garante o sigilo e reduz o volume de informações que cada time precisa gerenciar. | Governança de Dados, Segurança e Controle de Acesso. |
| **Modelagem de Dados** | Estrutura de banco de dados normalizada, com **Integridade Referencial** e tabelas dedicadas para funcionalidades complexas (ex: `clientes_socios`, `parcelamentos`). | Modelagem de Dados Relacional (SQL), Normalização. |
| **Auditoria e Rastreabilidade** | Sistema de **Auditoria Detalhada** (`historico_alteracoes`) que permite responder a perguntas de negócio, como: **"Qual o padrão de uso do app?"** e **"Há usuários acessando senhas de clientes de forma repetitiva e fora do padrão?"** | Análise de Dados, Criação de Logs para BI/Analytics. |
| **Segurança e Qualidade** | Funções de **Sanitização de Dados** no frontend (prevenção de XSS) e uso de **Auth do Supabase** com criptografia para senhas de clientes. | Integridade de Dados, Segurança no Desenvolvimento. |
| **Arquitetura de Software** | Uso de **Gerenciamento de Estado Centralizado** (`appState`) em JavaScript Vanilla, garantindo a previsibilidade e a manutenibilidade do código. | Princípios de Arquitetura (State Management). |

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** HTML5, CSS3, **JavaScript (Vanilla)**
*   **UI Framework:** Materialize CSS
*   **Backend & DB:** **Supabase** (PostgreSQL)
*   **Deploy:** Vercel

## ⚙️ Como Rodar Localmente

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/vctrmchd/appcont.git
    cd appcont
    ```
2.  **Configuração do Supabase:**
    *   Crie um projeto no Supabase e configure as tabelas necessárias.
    *   Atualize o arquivo `supabase-config.js` com suas chaves de acesso.
3.  **Execução:**
    *   Abra o arquivo `index.html` diretamente no seu navegador.

---
*Desenvolvido por Victor Machado*