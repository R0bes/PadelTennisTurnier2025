# Agent Task – Add Player-to-Team Transition with ghost cards (Iteration 2.1)

You are working inside the existing `tournament-app` monorepo.

Your task is to implement the animation behavior for transitioning players from the Registration grid into the auto-generated team containers, using Framer Motion shared layout transitions, and leaving a visual “ghost” card behind.

## 🎯 Goal

When the admin triggers "Auto Generate Teams":
- Empty team containers appear.
- Existing player cards animate from their current grid position into the team containers using `layout` + `layoutId`.
- In the grid, instead of disappearing, a faded “ghost” version of the card remains (not animated, no `layoutId`).
- The transition must look fluid, smooth, and match the design.

This update should be minimally invasive and extend the current MWE implementation.

---

## 🧩 Implementation Requirements

### 1. Update Player data model
Extend `Player` type (frontend) to include:
```ts
teamId: string | null; // null = not yet assigned
```
Make sure this information comes from API or locally for now in MWE context.

---

### 2. Implement animated card (real moving card)

Create or update component:

```tsx
// PlayerCard.tsx
<motion.div
  layout
  layoutId={`player-${player.id}`}
  transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.7 }}
>
  {/* full style */}
</motion.div>
```

---

### 3. Implement ghost card

A non-animated placeholder left in the original position when player is moved:

```tsx
// PlayerGhostCard.tsx
<div className="... bg-slate-50/60 text-slate-400 border border-dashed">
  {/* same content but muted */}
</div>
```

⚠️ Important:
- **Must NOT be** a `motion.div`
- **Must NOT have** `layoutId`

---

### 4. Rendering logic

In Registration Grid (players without team = normal card, with team = ghost):

```tsx
{players.map((player) =>
  player.teamId ? (
    <PlayerGhostCard key={player.id} player={player} />
  ) : (
    <PlayerCard key={player.id} player={player} />
  )
)}
```

In Teams section (only real cards):

```tsx
{players
  .filter((p) => p.teamId === team.id)
  .map((player) => (
    <PlayerCard key={player.id} player={player} />
  ))}
```

---

### 5. Ensure both sections are wrapped in a `LayoutGroup`

```tsx
<LayoutGroup>
  {/* registration grid */}
  {/* teams grid */}
</LayoutGroup>
```

---

### 6. Teams container must also be animated (when appearing)

```tsx
<motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} />
```

---

## 🧪 Testing Criteria

- Before assigning teams, all players are normal `PlayerCard` components.
- After clicking “Auto Generate Teams”:
  - Team containers appear.
  - Existing player cards animate smoothly into their respective team container.
  - A faded “ghost” card remains in the original position.
  - No element flickers or teleports.
  - No duplicated animated components (only one `layoutId` per player).

---

## 📎 Additional Notes

- Keep styling as close as possible to existing.
- No breaking of existing features.
- This is purely frontend visual logic – API integration for teams is optionally local in this iteration.
- Organize components in a clean and scalable way (e.g. `components/tournament/`).

---

## 🛠️ Files most likely to be modified

```
apps/web/src/components/PlayerCard.tsx
apps/web/src/components/PlayerGhostCard.tsx (new)
apps/web/src/pages/RegistrationTeamsStage.tsx (or similar)
apps/web/src/types/player.ts (extend Player)
apps/web/src/components/TeamContainer.tsx (if exists)
```

---

## 🚀 Deliverables

- Fully implemented transition & ghost card behavior.
- All modified/new files committed.
- Working locally via:
```bash
pnpm dev
```
- Visual effect demonstrates the described animation.

---

**Proceed with the implementation now. Commit changes when complete.**
