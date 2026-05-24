# Forge Steel — Fork Changes

This is a fork of [andyaiken/forgesteel](https://github.com/andyaiken/forgesteel). This file tracks changes made on top of the upstream repo.

## Hosted site

After merging to `main`, the app is automatically deployed to GitHub Pages:
**https://jahteo.github.io/forgesteel/**

---

## Changes

### One-click dead/alive toggle on monster rows

**PR:** [#1](https://github.com/jahteo/forgesteel/pull/1) — `claude/monster-dead-alive-toggle-Qa4Xa`

Adds a single-click toggle button to each monster row (and minion slot header) in the encounter run panel, so a GM can mark a monster as defeated or alive without opening the full health drawer.

- Alive monsters show a ✕ (`CloseCircleOutlined`) button — click to mark defeated
- Defeated monsters show a ✓ (`CheckCircleOutlined`) button — click to mark alive
- Defeated monsters display with a strikethrough name
- Defeating a non-captain cleans up any stale `captainID` references on minion slots
- Defeating a minion slot header marks all monsters in that slot as defeated

**Files changed:**
- `src/components/panels/encounter-group/encounter-group-panel.tsx` — toggle button UI and new `onToggleDefeated` / `onToggleMinionSlotDefeated` props
- `src/components/panels/run/encounter-run/encounter-run-panel.tsx` — `toggleMonsterDefeated` and `toggleMinionSlotDefeated` state handlers

**Screenshots:**

![Overview](docs/screenshots/overview.png)
![Mark as defeated tooltip](docs/screenshots/tooltip-defeat.png)
![Mark as alive tooltip](docs/screenshots/tooltip-alive.png)

---

### GitHub Pages deployment

**Commit:** `fa42bc9`

Adds a GitHub Actions workflow (`.github/workflows/github-pages.yml`) that builds the Vite app and deploys it to GitHub Pages on every push to `main`. Also supports manual dispatch from any branch via the Actions tab.

- `vite.config.ts` sets `base: '/forgesteel/'` when `GITHUB_PAGES=true` (set by the workflow); local dev is unaffected
- To manually deploy before a PR is merged: **Actions → Deploy to GitHub Pages → Run workflow → select branch**

**One-time setup required:** In repo **Settings → Pages → Source**, select **GitHub Actions**.

---

### Supabase integration — cloud backup, auth, and multiplayer campaigns

**Branch:** `claude/cloud-backup-character-data-AK0BQ`

Adds Supabase as an optional backend. All existing local-only behavior is preserved unchanged — Supabase is only active when configured in Connection Settings.

#### What's new

**Auth (email magic link)**
- Enter your email in Connection Settings → Supabase → "Send magic link"
- Click the link; the app auto-authenticates on return (no password needed)
- Signed-in state shown with a color picker for your cursor color

**Cloud hero/sourcebook storage**
- When Supabase is enabled, heroes and sourcebooks are stored per-user in Postgres with Row Level Security — no one else can see your data
- `lastModified` timestamp is stamped on every save for accurate sync comparison

**Hero sync**
- Open "Sync Heroes" (from Connection Settings) to compare local vs. Supabase copies side by side
- Status badges: `Local only` / `Supabase only` / `In sync` / `Local newer` / `Supabase newer`
- Any override (either direction) shows a confirmation popup and auto-creates a backup first

**Backup & revert**
- Every data override (hero, sourcebook, session) creates a timestamped backup before applying the change
- Local backups are kept indefinitely in IndexedDB; Supabase backups expire after 14 days
- "Backup History" in Connection Settings lists all backups with a one-click Restore

**Campaigns (permanent rooms)**
- Create a campaign as director → generates a permanent room code; share the link once, it never changes
- Players enroll once via the share link (`/#/session/player?room=<code>`), pick a hero, and are remembered for all future sessions
- "My Campaigns" page: directors see campaigns they created; players see campaigns they've joined
- Player can rejoin any enrolled campaign from the list — no room code re-entry needed
- A user can be director of some campaigns and player in others simultaneously

**Real-time session sync**
- Director saves → session is broadcast via Supabase Realtime to all enrolled players instantly (no page reload)
- Players can move their own hero tokens; director sees the move and re-broadcasts the authoritative session
- Director can lock/unlock any token (lock icon in token context menu); locked tokens can only be moved by the director

**Figma-style cursor sharing**
- While a tactical map is open, every user's mouse position is broadcast as a colored dot with their display name
- Cursor positions are in grid coordinates so they stay correct across zoom levels and are never written to the database

#### Database schema

Run `supabase/schema.sql` in your Supabase project's SQL editor once to create all tables and RLS policies:

| Table | Purpose |
|-------|---------|
| `user_profiles` | Display name + cursor color per user |
| `heroes` | Hero data scoped per user |
| `sourcebooks` | Sourcebook data scoped per user |
| `campaigns` | Permanent rooms with room codes |
| `campaign_players` | Player enrollment (hero choice per campaign) |
| `sessions` | Director session state per campaign |
| `backups` | Time-stamped data backups (14-day TTL for Supabase) |

#### Setup

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. In the app: Connection Settings → Supabase → enter Project URL and Anon Key → sign in via magic link

#### Testing locally

```bash
# Start the app
npm run dev

# Navigate to Connection Settings, enter Supabase credentials, sign in
# Then test each flow:

# Cloud storage: create/edit a hero → check Supabase heroes table
# Campaigns: Connection Settings → Campaigns → "New Campaign" → copy share link
# Player join: open share link in a second browser (different Supabase account)
# Real-time sync: director opens session with a tactical map; player view should update live
# Backup: sync a hero with an override → Connection Settings → "Backup History" → Restore
```

#### Files changed (new)

- `supabase/schema.sql` — database schema and RLS policies
- `src/models/campaign.ts` — Campaign, CampaignPlayer, UserProfile, BackupEntry, CursorState
- `src/services/supabase-client-factory.ts` — singleton Supabase client
- `src/services/auth/supabase-auth-service.ts` — auth wrapper (magic link, sign out, state change)
- `src/services/storage/supabase-service.ts` — StorageService impl for Postgres + campaign methods
- `src/services/backup/backup-service.ts` — BackupService interface + local (IndexedDB) + Supabase impls
- `src/services/realtime/supabase-realtime-service.ts` — Realtime channel (broadcast + presence)
- `src/components/panels/connection-settings/supabase-connect-panel.tsx` — Supabase section in settings
- `src/components/pages/campaigns/campaigns-page.tsx` — "My Campaigns" page
- `src/components/modals/hero-sync/hero-sync-modal.tsx` — local ↔ Supabase comparison + sync
- `src/components/modals/confirm-override/confirm-override-modal.tsx` — override confirmation popup
- `src/components/modals/backup-history/backup-history-modal.tsx` — backup list + restore

#### Files changed (modified)

- `src/models/hero.ts` — added `lastModified: string`
- `src/models/tactical-map.ts` — added `playerMovable: boolean` on MapMini
- `src/models/connection-settings.ts` — added Supabase fields (`useSupabase`, `supabaseUrl`, `supabaseAnonKey`, `activeCampaignId`)
- `src/services/storage/storage-service-factory.ts` — returns SupabaseService when configured
- `src/components/panels/data-loader/data-loader.tsx` — creates Supabase client; passes to storage factory
- `src/components/main/main.tsx` — wires realtime service; publishes session on save; adds /campaigns route
- `src/components/modals/settings/settings-modal.tsx` — adds SupabaseConnectPanel to Connections section
- `src/components/panels/elements/tactical-map-panel/tactical-map-panel.tsx` — cursor overlay; token lock/unlock; player movability enforcement
- `src/components/pages/session/player/session-player-page.tsx` — remote player mode via `?room=` param

---

## Running locally

```bash
git clone https://github.com/jahteo/forgesteel.git
cd forgesteel
npm install
npm run dev
```

App is available at `http://localhost:5173/`.
