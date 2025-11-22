# Architecture Documentation

## Monorepo Structure

This project is organized as a monorepo using pnpm workspaces. The structure separates concerns into distinct applications and shared packages:

```
tournament-app/
├── apps/
│   ├── web/          # React frontend application
│   └── api/          # Node.js backend API
├── packages/
│   ├── shared-types/ # Shared TypeScript types and Zod schemas
│   └── shared-utils/ # Shared utility functions
├── infra/
│   └── docker-compose.yml  # Docker orchestration
└── docs/
    └── architecture.md     # This file
```

### Workspace Organization

- **apps/**: Contains deployable applications (web frontend, API backend)
- **packages/**: Contains shared code that can be used across applications
- **infra/**: Infrastructure as code (Docker configurations)
- **docs/**: Project documentation

## Frontend Tech Stack

The frontend (`apps/web`) is built with:

- **React 18**: UI library for building user interfaces
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and development server
- **TailwindCSS**: Utility-first CSS framework for styling
- **Framer Motion**: Animation library for React components

### Frontend Architecture

The frontend uses server-driven state management with API integration. The application is organized into:

- **API Client Layer** (`src/api/tournamentApi.ts`): Centralized API functions for tournament operations
  - `createTournament()`: Create a new tournament
  - `getTournamentState()`: Fetch current tournament state
  - `registerPlayer()`: Register a player to a tournament
  - `setPhase()`: Change tournament phase

- **State Management**: Tournament state is fetched from the backend and stored in React state. The active tournament ID is persisted in localStorage.

- **Pages**: Four main views corresponding to tournament phases, driven by server state
  - RegistrationPage: Player registration interface with API integration
  - TeamSetupPage: Team organization (placeholder for drag-and-drop)
  - TournamentFlowPage: Tournament progression visualization (Swiss rounds / KO bracket)
  - SummaryPage: Final results and standings with podium display

- **Admin/Public View Toggle**: Simple toggle between admin mode (with phase controls) and public mode (read-only)

- **Shared Types**: All type definitions are imported from `@tournament-app/shared-types` to ensure consistency between frontend and backend.

- **Animations**: Page transitions are handled using Framer Motion's `AnimatePresence` component, triggered by phase changes from the server.

## Backend Tech Stack

The backend (`apps/api`) is built with:

- **Node.js**: JavaScript runtime
- **TypeScript**: Type-safe JavaScript
- **Fastify**: Fast and low overhead web framework
- **Prisma**: Next-generation ORM for database access
- **SQLite**: Lightweight database (file-based, suitable for development)

### Backend Architecture

The API follows a RESTful design with the following endpoints:

- `GET /health`: Health check endpoint
- `POST /tournaments`: Create a new tournament (returns TournamentState)
- `GET /tournaments/:id`: Retrieve a tournament with its players
- `GET /tournaments/:id/state`: Get unified tournament state (id, name, phase, players, rounds)
- `POST /tournaments/:id/register-player`: Register a player to a tournament
- `POST /tournaments/:id/phase`: Change tournament phase (with transition validation)

The backend implements a phase-based tournament lifecycle with validated state transitions:
- `registration` → `team_setup`
- `team_setup` → `swiss_rounds`
- `swiss_rounds` → `ko_bracket`
- `ko_bracket` → `summary`

### Database Schema

The Prisma schema defines two main models:

- **Tournament**: Represents a tournament event
  - `id`: Unique identifier (CUID)
  - `name`: Tournament name
  - `phase`: Current tournament phase (registration, team_setup, swiss_rounds, ko_bracket, summary)
  - `createdAt`: Creation timestamp
  - `players`: Relation to Player model

- **Player**: Represents a registered player
  - `id`: Unique identifier (CUID)
  - `name`: Player name
  - `tournamentId`: Foreign key to Tournament
  - `tournament`: Relation to Tournament model

## Shared Packages

### shared-types

This package provides type definitions and Zod schemas that are used across both frontend and backend:

- `Phase`: Tournament phase enum (registration, team_setup, swiss_rounds, ko_bracket, summary)
- `Player`: Player data structure
- `Tournament`: Tournament data structure
- `TournamentState`: Unified tournament state object (id, name, phase, createdAt, players, rounds)

Using Zod schemas ensures runtime validation and type safety across the entire application.

### shared-utils

This package contains utility functions that can be shared between frontend and backend:

- `simpleSwissPairing`: Naive pairing algorithm for Swiss tournament rounds (placeholder implementation)

## Development Workflow

1. **Install dependencies**: `pnpm install` (installs all workspace dependencies)
2. **Start development**: `pnpm dev` (runs both API and Web in parallel)
3. **Build**: `pnpm build` (builds all packages and applications)

## Future Extensions

The current implementation is a minimal working example (MWE). Future enhancements may include:

- Full tournament bracket generation and management
- Real-time match updates
- Advanced Swiss pairing algorithms
- Drag-and-drop team organization
- User authentication and authorization
- Tournament history and statistics
- WebSocket support for live updates
- Production-ready database (PostgreSQL)
- Comprehensive error handling and validation
- Unit and integration tests

## Docker Support

The project includes Docker Compose configuration for containerized development. The setup includes:

- API service on port 4000
- Web service on port 3000
- Volume mounts for hot-reloading during development

To use Docker:

```bash
cd infra
docker-compose up
```

Note: Dockerfiles are provided but may require additional configuration for production use.

