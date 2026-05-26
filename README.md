# 📐 Quadrus - Plataforma de Gestão Ágil e Kanban Colaborativo

O **Quadrus** é uma plataforma moderna e intuitiva de gestão ágil (Kanban) projetada para otimizar fluxos de trabalho de desenvolvimento, eliminando a burocracia excessiva de ferramentas tradicionais. O produto foca em colaboração nativa em tempo real, automação inteligente de transições de sprints e métricas acionáveis baseadas em logs de atividades.

---

## 🚀 Principais Funcionalidades

1. **Quadro Kanban em Tempo Real:** Sincronização automática via WebSockets (`Socket.io`) ao arrastar cartões pelas colunas (`A Fazer`, `Em Andamento`, `Homologação`, `Concluído`).
2. **Automação de Sprint:** Migração inteligente e automática de tarefas inacabadas para o próximo ciclo ativo ao encerrar uma sprint.
3. **Gestão Multi-Tenant de Cargos:** Níveis de acesso flexíveis (`ADMIN`, `GERENTE`, `PO`, `DEV`, `TESTER`) definidos dinamicamente por projeto.
4. **Planning Poker Integrado:** Sessões assíncronas de votação Fibonacci com votos mantidos em segredo até a revelação e consolidação final moderada pelo PO.
5. **Logs de Governança (RDA & Velocity):** Geração automática de Relatórios Diários de Atividades (RDA) e cálculos de Velocity das sprints a partir de um log imutável de eventos.
6. **Soft Delete de Tarefas:** Exclusão lógica de cartões para preservar o histórico de auditoria e métricas.

---

## 🛠️ Stack Tecnológica (PERN Stack)

* **Frontend:** React.js, Vite, Tailwind CSS, dnd-kit (drag-and-drop), Axios, Socket.io-client.
* **Backend:** Node.js, Express.js, Socket.io, Zod (validação de schemas), JWT & Bcrypt (segurança/cookies HttpOnly).
* **Banco de Dados & ORM:** PostgreSQL, Prisma ORM.

---

## 📋 Pré-requisitos

Para rodar o projeto localmente, certifique-se de possuir instalado em sua máquina:
* **Node.js** (versão 18 ou superior)
* **npm** (incluso com o Node)
* **Docker & Docker Compose** (recomendado para subir o PostgreSQL localmente de forma simples)
* **Git** (para controle de versão)

---

## ⚙️ Instruções de Instalação e Execução

Siga os passos abaixo para clonar, configurar e executar a aplicação em sua máquina local.

### 1. Baixar o Projeto
Clone o repositório em sua máquina local:
```bash
git clone https://github.com/joellacerda/Quadrus-UECE.git
cd Quadrus
```

### 2. Iniciar o Banco de Dados (PostgreSQL)
Recomendamos utilizar o Docker Compose fornecido na raiz para subir a instância do PostgreSQL de maneira instantânea:
```bash
docker-compose up -d
```
*Isso criará um container Postgres rodando localmente na porta `5432` com as credenciais padrão de desenvolvimento.*

### 3. Instalar e Configurar o Backend
Acesse a pasta do backend, instale as dependências e configure as variáveis de ambiente:

```bash
# Entrar no diretório do backend
cd backend

# Instalar dependências
npm install
```

O arquivo `.env` já vem pré-configurado na raiz do backend. Caso queira customizar a conexão com o banco ou a chave secreta do JWT, edite as variáveis contidas nele:
* `PORT`: Porta padrão do servidor backend (`5000`)
* `DATABASE_URL`: String de conexão com o banco Postgres (`postgresql://postgres:postgres@localhost:5432/quadrus?schema=public`)
* `JWT_SECRET`: Chave secreta de geração de tokens de sessão
* `CLIENT_URL`: URL de origem do frontend para liberação de CORS (`http://localhost:5173`)

### 4. Executar Migrações do Banco de Dados
Com o banco de dados rodando e conectado, envie a modelagem do Prisma para o PostgreSQL e gere o cliente de banco de dados tipado:
```bash
# Rodar migrações do banco (com o Postgres rodando)
npx prisma migrate dev --name init

# Garantir que o cliente do Prisma foi gerado
npx prisma generate
```

### 5. Instalar o Frontend
Abra um novo terminal na raiz do projeto e instale as dependências do frontend de apresentação:
```bash
# Entrar no diretório do frontend
cd frontend

# Instalar dependências
npm install --legacy-peer-deps
```

---

## 🏃 Executando em Desenvolvimento

Com tudo instalado, você pode executar o servidor backend e a aplicação frontend de forma concorrente em terminais separados.

### Iniciar o Backend
```bash
# No diretório /backend
npm run dev
```
*O servidor REST & WebSocket iniciará na porta `5000` (http://localhost:5000).*

### Iniciar o Frontend
```bash
# No diretório /frontend
npm run dev
```
*A aplicação React abrirá automaticamente no navegador em http://localhost:5173.*

---

## 📁 Estrutura de Pastas Monorepo
* `/backend`: Lógica de negócios, conexões de socket, regras da API Express e schemas do banco no Prisma.
* `/frontend`: Interface do usuário de SPA, integração com socket de eventos e consumo da REST API via Axios.
* `docker-compose.yml`: Definição de containers de desenvolvimento local.
