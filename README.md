# Personal Calorie Tracker

A full-stack nutrition tracking application for managing meals, nutrition goals, and health insights.

## Features

### Required

- Personal nutrition goals
- Meal and food logging
- Calorie tracking
- Macronutrient tracking
- Micronutrient tracking
- Date and meal-type filtering
- Paginated APIs
- Nutrition reports
- Goal vs actual comparisons
- AI-powered nutrition extraction from images

### Bonus

- Conversational AI
- Multi-user authentication
- PDF nutrition history import

---

# Tech Stack

## Frontend

- React
- TypeScript
- Vite
- TanStack Query
- Recharts

## Backend

- Node.js
- TypeScript
- Fastify
- Zod
- Prisma

## Database

- PostgreSQL

---

# Repository Structure

```text
.
├── frontend/
├── backend/
├── docs/
├── AGENTS.md
├── PROJECT_REQUIREMENTS.md
├── ARCHITECTURE.md
├── API_DESIGN.md
├── DEVELOPMENT_PLAN.md
└── README.md
```

---

# Prerequisites

Install:

- Node.js
- pnpm
- PostgreSQL
- Git

---

# Environment Variables

Backend configuration should be provided through environment variables.

A `.env.example` file will document required variables.

Secrets must never be committed to Git.

---

# Development

Install dependencies:

```bash
pnpm install
```

Start backend:

```bash
pnpm dev:backend
```

Start frontend:

```bash
pnpm dev:frontend
```

---

# Database

Run Prisma migrations:

```bash
pnpm db:migrate
```

Generate Prisma client:

```bash
pnpm db:generate
```

---

# Testing

Run tests:

```bash
pnpm test
```

---

# API Documentation

When the backend is running, API documentation will be available through the configured OpenAPI/Swagger endpoint.

---

# Architecture

See:

```text
ARCHITECTURE.md
```

for the detailed system design.

---

# Development Guidelines

See:

```text
AGENTS.md
```

for coding and engineering guidelines.

---

# Project Requirements

See:

```text
PROJECT_REQUIREMENTS.md
```

for the complete feature requirements.

---

# Development Roadmap

See:

```text
DEVELOPMENT_PLAN.md
```

for the implementation sequence.