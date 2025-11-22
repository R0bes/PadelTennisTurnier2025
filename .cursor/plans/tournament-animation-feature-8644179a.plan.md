<!-- 8644179a-b0e9-4368-981c-4cb74a483149 92b43b05-5351-4a4d-a717-a73640f5693b -->
# Tournament Animation Feature Implementation

## Übersicht

Implementierung von Framer Motion Layout-Animationen, damit Player Cards beim "Auto Generate Teams" smooth von der Registration Grid in die Team Container animieren, während Ghost Cards in der ursprünglichen Position zurückbleiben.

## 1. Player Schema erweitern

**Datei:** `packages/shared-types/src/index.ts`

- `PlayerSchema` um `teamId: z.string().nullable()` erweitern
- `Player` Type wird automatisch aktualisiert

## 2. API anpassen

**Datei:** `apps/api/src/server.ts`

- `/tournaments/:id/state` Endpoint: `teamId: player.teamId || null` zu Player-Objekten hinzufügen (Zeile 191-194)
- `/tournaments/:id` Endpoint: Gleiche Anpassung (Zeile 97-100)
- Alle anderen Endpoints, die Players zurückgeben, entsprechend anpassen

## 3. Komponenten erstellen

**Neue Dateien:**

- `apps/web/src/components/PlayerCard.tsx` - Animierte Player Card mit `layoutId`
- `apps/web/src/components/PlayerGhostCard.tsx` - Statische Ghost Card ohne `layoutId`

**PlayerCard.tsx:**

- `motion.div` mit `layout`, `layoutId={`player-${player.id}`}`
- Spring-Animation: `transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.7 }}`
- Bestehendes Styling übernehmen (Gradient, Avatar, etc.)

**PlayerGhostCard.tsx:**

- Normales `div` (KEIN `motion.div`)
- KEIN `layoutId`
- Gedämpftes Styling: `bg-slate-50/60`, `text-slate-400`, `border-dashed`
- Gleiche Struktur wie PlayerCard, aber visuell abgeschwächt

## 4. RegistrationPage refactoren

**Datei:** `apps/web/src/pages/RegistrationPage.tsx`

**Änderungen:**

- Import `LayoutGroup` von `framer-motion`
- Import neue Komponenten `PlayerCard`, `PlayerGhostCard`
- Registration Grid: Rendering-Logik anpassen:
  ```tsx
  {tournamentState.players.map((player) =>
    player.teamId ? (
      <PlayerGhostCard key={player.id} player={player} />
    ) : (
      <PlayerCard key={player.id} player={player} isAdmin={isAdmin} onDelete={...} />
    )
  )}
  ```

- Teams Section: Nur `PlayerCard` verwenden für zugewiesene Spieler
- Beide Sections in `<LayoutGroup>` wrappen
- Teams Container mit `motion.section` und `initial={{ opacity: 0, y: 40 }}` animieren

## 5. Testing

- Vor Team-Generierung: Alle Player Cards normal
- Nach "Auto Generate Teams":
  - Teams Container erscheinen mit Animation
  - Player Cards animieren smooth in Teams
  - Ghost Cards bleiben in Grid zurück
  - Keine Flicker oder Teleportation
  - Nur ein `layoutId` pro Player

## Technische Details

- `LayoutGroup` um Registration Grid und Teams Section
- `layoutId` Format: `player-${player.id}`
- Ghost Cards haben KEIN `layoutId` (wichtig für korrekte Animation)
- Bestehende Funktionalität (Delete, etc.) beibehalten

### To-dos

- [ ] Player Schema um teamId Feld erweitern (packages/shared-types/src/index.ts)
- [ ] API Endpoints anpassen, um teamId in Player-Objekten zurückzugeben (apps/api/src/server.ts)
- [ ] PlayerCard Komponente erstellen mit layoutId und Spring-Animation (apps/web/src/components/PlayerCard.tsx)
- [ ] PlayerGhostCard Komponente erstellen ohne motion/layoutId (apps/web/src/components/PlayerGhostCard.tsx)
- [ ] RegistrationPage refactoren: LayoutGroup, conditional rendering, Teams Animation (apps/web/src/pages/RegistrationPage.tsx)
- [ ] Animation testen: smooth transitions, ghost cards, keine Flicker