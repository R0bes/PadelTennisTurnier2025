# Docker Setup

Dieses Projekt kann mit Docker lokal getestet und in Production deployed werden.

## Lokales Testen

### Production Build

```bash
# Alle Services bauen und starten
docker-compose up --build

# Im Hintergrund starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Services stoppen
docker-compose down
```

### Development Build (mit Hot-Reload)

```bash
# Development Mode mit Volumes für Hot-Reload
docker-compose -f docker-compose.dev.yml up --build
```

## Einzelne Images bauen

### API

```bash
docker build -f apps/api/Dockerfile -t padel-tournament-api:latest .
docker run -p 4000:4000 padel-tournament-api:latest
```

### Web

```bash
docker build -f apps/web/Dockerfile -t padel-tournament-web:latest .
docker run -p 3000:80 padel-tournament-web:latest
```

### Bot

```bash
docker build -f apps/bot/Dockerfile -t padel-tournament-bot:latest .
docker run -e BOT_TOKEN=your_token_here padel-tournament-bot:latest
```

## Environment Variables

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
# API
DATABASE_URL=file:./prisma/dev.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80

# Web
VITE_API_URL=http://localhost:4000

# Bot
BOT_TOKEN=your_telegram_bot_token
API_BASE_URL=http://api:4000
```

## Services

- **API**: http://localhost:4000
- **Web**: http://localhost:3000
- **Bot**: Läuft im Hintergrund

## CI/CD

Die GitHub Actions Workflows bauen automatisch die Docker Images bei jedem Push:

- `.github/workflows/docker-build.yml` - Baut und pusht Images zu GitHub Container Registry
- `.github/workflows/docker-compose-test.yml` - Testet die Docker Compose Konfiguration

Die Images werden unter `ghcr.io/[username]/padel-tournament-[service]:latest` verfügbar sein.

