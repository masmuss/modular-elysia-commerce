# Modular Elysia Commerce

A modular monolith e-commerce backend API built with **Bun** and **Elysia.js**. Features an internal event-driven architecture to decouple domain logic across modules (_Orders_, _Products_, _Users_, _IAM_).

---

## 🚀 Key Features

- **Modular Monolith & Event-Driven**: Clean domain separation. Cross-module orchestration (e.g., checkout and stock reservation) handled asynchronously via an in-memory `EventBus`.
- **Authentication & IAM (RBAC)**: Powered by [Better Auth](https://www.better-auth.com/) with fine-grained permission checks via an Elysia IAM macro (`iam: { permission: "..." }`).
- **Database & Migrations**: [Drizzle ORM](https://orm.drizzle.team/) with MySQL 8.4 (schema generation, migrations, and database seeding).
- **Rate Limiting**: Global rate limiting (100 req/min) and auth rate limiting (10 req/min) via `elysia-rate-limit`.
- **Validation & OpenAPI Documentation**: TypeBox schema validation with auto-generated Swagger/OpenAPI interactive docs at `/docs`.
- **Structured Logging**: Production-grade JSON logging using Pino with HTTP request logging middleware.
- **Containerized Development**: Ready-to-use Docker Compose setup for development (App + MySQL).

---

## 📁 Directory Structure

```text
├── docker/                 # Dockerfile and compose configurations
├── drizzle/                # SQL migration files
├── scripts/                # Database seed and utility scripts
├── src/
│   ├── core/               # Shared core (Database, EventBus, Logger, Env Guard)
│   ├── modules/            # Domain modules
│   │   ├── auth/           # Better Auth routes & OpenAPI specs
│   │   ├── iam/            # Role & permission service + seed definitions
│   │   ├── orders/         # Checkout flow, order lifecycle & listeners
│   │   ├── products/       # Product catalog, stock reservation & listeners
│   │   └── users/          # User profile management
│   ├── plugins/            # Elysia plugins (Auth, IAM macro, Rate Limit, Error handling)
│   └── index.ts            # Application entrypoint & route aggregator
└── test/                   # Comprehensive unit and integration test suites
```

---

## 🛠️ Prerequisites

- [Bun](https://bun.sh/) (v1.2+)
- [Docker](https://www.docker.com/) & Docker Compose (optional, for containerized MySQL/App)

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies

```bash
git clone git@github.com:masmuss/modular-elysia-commerce.git
cd modular-elysia-commerce
bun install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your configuration:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=ecommerce
DB_USER=ecommerce
DB_PASSWORD=devsecret
DB_ROOT_PASSWORD=devrootsecret

BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-random-32-character-secret
```

### 3. Start Database (Docker)

```bash
bun run docker:dev
```

### 4. Run Migrations & Seed Database

```bash
# Run database migrations
bun run db:migrate

# Seed initial data (products, roles, permissions)
bun run db:seed
```

### 5. Start Development Server

```bash
bun run dev
```

Server will be running at `http://localhost:3000`.

- **API Documentation**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## 📜 NPM Scripts

| Script                | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `bun run dev`         | Starts development server in watch mode                 |
| `bun test`            | Runs the test suite                                     |
| `bun run db:generate` | Generates Drizzle SQL migrations from TypeScript schema |
| `bun run db:migrate`  | Applies pending database migrations                     |
| `bun run db:seed`     | Seeds database with initial data                        |
| `bun run docker:dev`  | Starts Docker Compose services (App + MySQL)            |
| `bun run docker:down` | Stops Docker Compose services                           |
| `bun run check`       | Runs linter and code formatting check with Biome        |
| `bun run format`      | Auto-formats code with Biome                            |

---

## 🧪 Testing

Run all unit and integration tests using Bun's built-in test runner:

```bash
bun test
```

---

## 📄 License

MIT
