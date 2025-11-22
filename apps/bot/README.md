# Tournament Telegram Bot

Ein Telegram-Bot als alternative Schnittstelle zur Tournament-App.

## Setup

1. Erstelle einen Bot über [@BotFather](https://t.me/BotFather) auf Telegram
2. Kopiere den Bot-Token
3. Erstelle eine `.env` Datei basierend auf `.env.example`:

```bash
BOT_TOKEN=your_bot_token_here
API_BASE_URL=http://localhost:4000
```

## Entwicklung

```bash
# Bot starten
pnpm dev:bot

# Oder aus dem Root-Verzeichnis
pnpm --filter bot dev
```

## Verfügbare Commands

### Allgemein
- `/start` - Bot starten und Begrüßung
- `/help` - Hilfe anzeigen
- `/status <tournament-id>` - Tournament-Status anzeigen

### Spieler
- `/myinfo <tournament-id>` - Eigene Spielerdaten anzeigen
- `/link <tournament-id>` - Mit Tournament verknüpfen

### Admin
- `/tournament <tournament-id>` - Tournament-Übersicht
- `/phase <tournament-id> <phase>` - Phase ändern
- `/teams <tournament-id>` - Teams anzeigen

## Verknüpfung

Spieler können sich über ihren Telegram-Username mit einem Tournament verknüpfen. Die Verknüpfung erfolgt über das `telegramUsername` Feld im Player-Model.

## Docker

Der Bot kann auch über Docker gestartet werden:

```bash
cd infra
docker-compose up bot
```

## Nächste Schritte

- QR-Code Verknüpfung
- Emoji-Code Authentifizierung
- Erweiterte Admin-Funktionen
- Match-Ergebnisse eingeben

