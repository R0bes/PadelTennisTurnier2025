# Zusammenfassung: Doppelter Code im Tournament App

## Übersicht der Duplikate

### 1. **Duplizierter Modal-Code** ⚠️ KRITISCH
**Dateien**: `apps/web/src/App.tsx`
- **Zeilen 658-729**: Erste Modal-Implementierung
- **Zeilen 1349-1421**: Zweite Modal-Implementierung (identisch)

**Problem**: 
- Gleicher Code für "Neues Turnier"-Modal zweimal vorhanden
- Wartungsaufwand: Änderungen müssen an 2 Stellen gemacht werden
- Risiko für Inkonsistenzen

**Lösung**: Modal in separate Komponente extrahieren
```tsx
// Neue Datei: components/NewTournamentModal.tsx
const NewTournamentModal = ({ isOpen, onClose, onSubmit, isLoading, name, onNameChange }) => {
  // Modal-Logik hier
};
```

---

### 2. **Duplizierte generateKOBracket Funktion** ⚠️
**Dateien**: 
- `apps/web/src/App.tsx` (Zeilen 22-53)
- `apps/web/src/pages/TournamentPage.tsx` (Zeilen 25-56)

**Problem**: 
- Identische Funktion in beiden Dateien
- 30+ Zeilen duplizierter Code
- Änderungen müssen an 2 Stellen gemacht werden

**Lösung**: In `packages/shared-utils/src/index.ts` verschieben
```tsx
// packages/shared-utils/src/index.ts
export function generateKOBracket(teams: Team[]): BracketRound[] {
  // Funktion hier
}

// Dann importieren:
import { generateKOBracket } from '@tournament-app/shared-utils';
```

---

### 3. **Duplizierte swissMatches Logik** ⚠️
**Dateien**:
- `apps/web/src/App.tsx` (Zeilen 487-565) - 78 Zeilen
- `apps/web/src/pages/TournamentPage.tsx` (Zeilen 75-113) - 38 Zeilen

**Problem**:
- Ähnliche, aber nicht identische Logik für Swiss Match-Generierung
- Unterschiedliche Implementierungen führen zu Inkonsistenzen
- Komplexe useMemo-Logik doppelt vorhanden

**Lösung**: Custom Hook erstellen
```tsx
// hooks/useSwissMatches.ts
export function useSwissMatches(
  teams: Team[], 
  phase: Phase, 
  matchResults: Record<string, MatchResult>
) {
  return useMemo(() => {
    // Swiss matches Logik hier
  }, [teams, phase, matchResults]);
}
```

---

### 4. **Unbenutzte TournamentPage.tsx** ⚠️ WICHTIG
**Datei**: `apps/web/src/pages/TournamentPage.tsx` (812 Zeilen)

**Problem**:
- Komplette Datei mit 812 Zeilen wird nirgendwo importiert oder verwendet
- Enthält ähnliche Logik wie `App.tsx`
- Toter Code, der Wartungsaufwand verursacht

**Status**: 
- ❌ Nicht in `App.tsx` importiert
- ❌ Nicht in `main.tsx` verwendet
- ❌ Keine Referenzen gefunden

**Lösung**: 
- **Option 1**: Datei löschen, wenn nicht benötigt
- **Option 2**: `App.tsx` refactoren und `TournamentPage` nutzen

---

### 5. **Duplizierte Error-Handling-Logik**
**Dateien**: `apps/web/src/api/tournamentApi.ts`

**Problem**: 
- Gleiche Error-Handling-Logik in mehreren Funktionen wiederholt
- Zeilen 11-53, 123-139, 168-182, 202-216, 231-245 (ähnliche Patterns)

**Lösung**: Error-Handling in `fetchJson` zentralisieren (bereits teilweise vorhanden)

---

## Zusammenfassung der Duplikate

| Duplikat | Dateien | Zeilen | Priorität |
|-----------|---------|--------|-----------|
| Modal-Code | App.tsx | 2x ~70 Zeilen | 🔴 Hoch |
| generateKOBracket | App.tsx, TournamentPage.tsx | 2x ~30 Zeilen | 🟡 Mittel |
| swissMatches | App.tsx, TournamentPage.tsx | 2x ~40-80 Zeilen | 🟡 Mittel |
| TournamentPage.tsx | - | 812 Zeilen (unbenutzt) | 🔴 Hoch |
| Error-Handling | tournamentApi.ts | Mehrere Stellen | 🟢 Niedrig |

---

## Empfohlene Reihenfolge der Behebung

1. **TournamentPage.tsx entfernen oder nutzen** (812 Zeilen toter Code)
2. **Modal-Code extrahieren** (2x 70 Zeilen)
3. **generateKOBracket in shared-utils verschieben** (2x 30 Zeilen)
4. **swissMatches in Custom Hook extrahieren** (2x 40-80 Zeilen)

**Geschätzter Aufwand**: 
- Quick Wins: 2-3 Stunden
- Gesamte Refactorierung: 1-2 Tage

---

## Code-Metriken

- **Gesamter duplizierter Code**: ~200-300 Zeilen
- **Toter Code**: 812 Zeilen (TournamentPage.tsx)
- **Potentielle Code-Reduktion**: ~1000 Zeilen durch Refactoring

