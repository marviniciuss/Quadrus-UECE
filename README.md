# 📐 Quadrus - Plataforma de Gestão Ágil e Kanban Colaborativo

O **Quadrus** é uma plataforma moderna e intuitiva de gestão ágil (Kanban) projetada para otimizar fluxos de trabalho de desenvolvimento, eliminando a burocracia excessiva de ferramentas tradicionais. O produto foca em colaboração nativa em tempo real, automação inteligente de transições de sprints e métricas acionáveis baseadas em logs de atividades.

---

## 🚀 Principais Funcionalidades

1. **Quadro Kanban em Tempo Real:** Sincronização automática via WebSockets (`Socket.io`) ao arrastar cartões pelas colunas (`A Fazer`, `Em Andamento`, `Homologação`, `Concluído`).
2. **Automação de Sprint:** Migração inteligente e automática de tarefas inacabadas para o próximo ciclo ativo ao encerrar uma sprint.
3. **Gestão Multi-Tenant de Cargos:** Níveis de acesso flexíveis (`GERENTE`, `PO`, `DEV`, `TESTER`) definidos dinamicamente por projeto.
4. **Planning Poker Integrado:** Sessões assíncronas de votação Fibonacci com votos mantidos em segredo até a revelação e consolidação final moderada pelo PO.
5. **Logs de Governança (RDA & Velocity):** Geração automática de Relatórios Diários de Atividades (RDA) e cálculos de Velocity das sprints a partir de um log imutável de eventos.
6. **Soft Delete de Tarefas:** Exclusão lógica de cartões para preservar o histórico de auditoria e métricas.

---

## 🛠️ Stack Tecnológica (PERN Stack)

* **Frontend:** React.js, Vite, Tailwind CSS, dnd-kit (drag-and-drop), Axios, Socket.io-client.
* **Backend:** Node.js, Express.js, Socket.io, Zod (validação de schemas), Firebase Admin SDK (autenticação segura e gerenciamento de sessões).
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
Certifique-se de ter o Docker/Docker Desktop ativo em sua máquina. Utilize o Docker Compose fornecido na raiz para subir a instância do PostgreSQL de maneira instantânea:
```bash
docker compose up -d
```
*Isso criará e iniciará o container Postgres rodando localmente na porta `5432` com as credenciais padrão de desenvolvimento.*

### 3. Instalar e Configurar o Backend
Acesse a pasta do backend, instale as dependências e configure as credenciais:

```bash
# Entrar no diretório do backend
cd backend

# Instalar dependências
npm install
```

#### Variáveis de Ambiente do Backend (.env)
Como os arquivos `.env` são mantidos privados e não são commitados, crie o arquivo `.env` na raiz do diretório `backend` usando o arquivo `.env.example` como modelo:
```bash
# Crie o arquivo .env
cp .env.example .env
```

Abra o arquivo `.env` criado e preencha ou ajuste as variáveis necessárias:
* `PORT`: Porta padrão do servidor backend (`5001`)
* `DATABASE_URL`: String de conexão com o banco Postgres (`postgresql://postgres:postgres@localhost:5432/quadrus?schema=public`)
* `CLIENT_URL`: URL de origem do frontend para liberação de CORS (`http://localhost:5173`)

#### Credenciais Firebase Admin SDK (Privado)
Para a autenticação com o Firebase Admin funcionar, você deve salvar o arquivo JSON de chaves do seu projeto Firebase na pasta raiz do servidor backend:
* Caminho do arquivo: `backend/firebase-service-account.json`
* **ATENÇÃO:** Nunca commite ou publique este arquivo. Ele já está explicitamente configurado no `.gitignore` para proteção das credenciais da equipe.

### 4. Executar Migrações do Banco de Dados & Prisma Client
Com o banco de dados Postgres rodando no Docker, envie a modelagem do Prisma para o banco de dados e sincronize as tabelas:
```bash
# Rodar migrações do banco (com o Postgres ativo)
npx prisma migrate dev --name init

# Garantir que o cliente do Prisma foi gerado localmente
npx prisma generate
```

#### Uso do Prisma Client na Equipe
Para manter uma única instância e reaproveitar conexões com segurança no backend, foi configurada e exportada a instância global do Prisma. Use sempre o import do módulo compartilhado ao invés de instanciar um novo client:
```javascript
import prisma from './config/prisma.js';

// Exemplo de uso:
const usuarios = await prisma.usuario.findMany();
```

### 5. Instalar e Configurar o Frontend
Abra um novo terminal na raiz do projeto, acesse a pasta `frontend` e instale as dependências:
```bash
# Entrar no diretório do frontend
cd frontend

# Instalar dependências
npm install --legacy-peer-deps
```

#### Variáveis de Ambiente do Frontend (.env)
O frontend consome credenciais do Firebase Client de forma segura. Crie o arquivo `.env` na raiz do diretório `frontend` tomando como modelo o arquivo `.env.example`:
```bash
# Crie o arquivo .env
cp .env.example .env
```
Abra o arquivo `.env` criado e preencha as variáveis com suas credenciais do app Firebase:
```env
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain_aqui
VITE_FIREBASE_PROJECT_ID=seu_project_id_aqui
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket_aqui
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id_aqui
VITE_FIREBASE_APP_ID=seu_app_id_aqui
```
*Assim como as credenciais do Admin SDK, o arquivo `frontend/.env` é mantido privado e está adicionado ao `.gitignore`.*

---

## 🏃 Executando em Desenvolvimento

Com tudo instalado, você pode executar o servidor backend e a aplicação frontend de forma concorrente em terminais separados.

### Iniciar o Backend
```bash
# No diretório /backend
npm run dev
```
*O servidor REST & WebSocket iniciará na porta `5001` (http://localhost:5001).*

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

---

## 🃏 Regras de Negócio do Planning Poker

A funcionalidade de **Planning Poker** integrada ao Quadrus segue regras específicas para garantir a imparcialidade e a conformidade do processo de estimativa:

1. **Início da Votação:**
   * Apenas o **PO (Product Owner)** ou o **Gerente** do projeto podem iniciar a votação para a pontuação de um card.
   * Todos os desenvolvedores (`DEV`) vinculados ao projeto são notificados imediatamente sobre o início.
   * O PO/Gerente define o prazo de encerramento da votação (com limite máximo de **até 24 horas**).

2. **Fluxo de Votação (Desenvolvedores):**
   * Os votos dos desenvolvedores (`DEV`) são mantidos sob total **anonimato**.
   * As opções de voto disponíveis seguem a escala Fibonacci adaptada: `[1, 2, 3, 5, 8, 13, 21, ?]`.
   * Um desenvolvedor pode **cancelar ou alterar** o seu voto livremente a qualquer momento antes do término do prazo.

3. **Visualização Parcial (Durante a Votação):**
   * Enquanto o período de votação estiver ativo, todos os membros do projeto veem **apenas a quantidade de votos** acumulada em cada opção (ex: "3 votos no número 8", "1 voto no número 3"), sem revelar a autoria de cada voto.

4. **Encerramento da Votação e Decisão:**
   * Uma vez expirada a votação, o **PO** e o **Gerente** recebem uma notificação de conclusão.
   * A partir desse momento, os votos detalhados se tornam visíveis para o PO/Gerente.
   * O PO/Gerente define a pontuação final selecionando a estimativa desejada e clicando em **"Decidir Pontuação"**.
