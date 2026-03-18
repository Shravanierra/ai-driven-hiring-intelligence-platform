# AI Hiring Platform

An AI-powered Applicant Tracking System (ATS) built with NestJS, React+Vite, PostgreSQL+pgvector, Redis, and MinIO.

## Quick Start

### 1. Start infrastructure services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL 16 with pgvector extension (port 5432)
- Redis 7 (port 6379)
- MinIO object storage (port 9000, console at 9001)

### 2. Install dependencies

```bash
npm run install:all
# or individually:
cd backend && npm install
cd frontend && npm install
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set your OPENAI_API_KEY
```

### 4. Run database migrations

```bash
cd backend
npm run migration:run
```

### 5. Start development servers

```bash
# Backend (port 3000)
cd backend && npm run start:dev

# Frontend (port 5173)
cd frontend && npm run dev
```

## Testing

```bash
# Backend tests (Jest + fast-check)
cd backend && npm run test:run

# Frontend tests
cd frontend && npm run test:run
```

## Project Structure

```
.
├── docker-compose.yml          # PostgreSQL, Redis, MinIO
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── database/           # TypeORM config + migrations
│   │   ├── entities/           # TypeORM entity classes
│   │   ├── llm/                # OpenAI client abstraction
│   │   ├── candidate-profile/  # Serialization utilities
│   │   └── testing/            # Shared arbitraries + PBT tests
│   ├── package.json
│   └── tsconfig.json
└── frontend/                   # React + Vite
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   └── types/              # Shared TypeScript types
    ├── package.json
    └── vite.config.ts
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) |
| Frontend | React + Vite + TailwindCSS |
| Database | PostgreSQL 16 + pgvector |
| ORM | TypeORM |
| File Storage | MinIO |
| AI | OpenAI (text-embedding-ada-002, GPT-4o) |
| LLM Orchestration | LangChain.js |
| Session Cache | Redis |
| Testing | Jest + fast-check (PBT) |
| Infrastructure | Docker Compose |
