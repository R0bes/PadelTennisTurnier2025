# Tournament App - Monorepo MWE

A minimal working example (MWE) of a tournament web application built as a monorepo using pnpm workspaces.

## Overview

This project consists of:

- **Frontend** (React + TypeScript + Vite + TailwindCSS + Framer Motion)
- **Backend** (Node.js + TypeScript + Fastify + Prisma + SQLite)
- **Shared Packages** (Type definitions and utilities)

The application implements a phase-based tournament flow where:
- Tournament state is managed in the backend
- Frontend displays different views based on the current tournament phase
- Players can be registered during the registration phase
- Tournament phases can be advanced (with validation) in admin mode
- All state changes are persisted in the database

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Start development servers (API + Web):

```bash
pnpm dev
```

This will start:

- API server on `http://localhost:4000`
- Web frontend on `http://localhost:3000`

3. Initialize the database (first time only):

```bash
pnpm --filter api prisma migrate dev
```

## Quick Start

After starting the dev servers:

1. Open `http://localhost:3000` in your browser
2. A demo tournament will be created automatically
3. In **Admin View**:
   - Add players using the "Add fake player" button
   - Advance phases using the "Next Phase →" button
4. Toggle to **Public View** to see the read-only tournament state
5. Navigate through the tournament phases: Registration → Team Setup → Swiss Rounds → KO Bracket → Summary

## API Endpoints

### Health Check

```bash
GET http://localhost:4000/health
```

Response:

```json
{
  "status": "ok"
}
```

### Create Tournament

```bash
POST http://localhost:4000/tournaments
Content-Type: application/json

{
  "name": "Summer Tournament 2024"
}
```

Response:

```json
{
  "id": "clx...",
  "name": "Summer Tournament 2024",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Get Tournament

```bash
GET http://localhost:4000/tournaments/:id
```

Response:

```json
{
  "id": "clx...",
  "name": "Summer Tournament 2024",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "players": []
}
```

### Register Player

```bash
POST http://localhost:4000/tournaments/:id/register-player
Content-Type: application/json

{
  "name": "John Doe"
}
```

Response:

```json
{
  "id": "clx...",
  "name": "John Doe",
  "tournamentId": "clx..."
}
```

### Get Tournament State

```bash
GET http://localhost:4000/tournaments/:id/state
```

Response:

```json
{
  "id": "clx...",
  "name": "Summer Tournament 2024",
  "phase": "registration",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "players": [
    {
      "id": "clx...",
      "name": "John Doe"
    }
  ],
  "rounds": []
}
```

### Change Tournament Phase

```bash
POST http://localhost:4000/tournaments/:id/phase
Content-Type: application/json

{
  "phase": "team_setup"
}
```

Response: Updated TournamentState object.

Note: Phase transitions are validated. Allowed transitions:
- `registration` → `team_setup`
- `team_setup` → `swiss_rounds`
- `swiss_rounds` → `ko_bracket`
- `ko_bracket` → `summary`

## Project Structure

```text
tournament-app/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Node.js backend
├── packages/
│   ├── shared-types/ # Zod schemas and TypeScript types
│   └── shared-utils/ # Tournament utility functions
├── infra/
│   └── docker-compose.yml
└── docs/
    └── architecture.md
```

## Development

- `pnpm dev` - Start both API and Web in development mode
- `pnpm dev:api` - Start only the API server
- `pnpm dev:web` - Start only the web frontend
- `pnpm build` - Build all packages and apps
