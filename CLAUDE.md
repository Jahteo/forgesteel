# Forgesteel – AI Agent Guide

## Pull Request Requirements

**Every PR that touches the UI must include before & after screenshots in the PR description.**

This is a hard requirement. No exceptions.

---

## Taking Screenshots

Playwright is configured to capture screenshots of any route or element in the app.

### 1. Start the dev server

```bash
npx vite --host
```

Leave this running in the background while taking screenshots.

### 2. Take a screenshot

```bash
npm run screenshot -- <route> <output-file> [css-selector]
```

**Examples:**

```bash
# Full page at a route
npm run screenshot -- / screenshots/home.png
npm run screenshot -- /heroes screenshots/heroes.png

# Specific CSS element
npm run screenshot -- /heroes screenshots/hero-card.png ".hero-card"

# Full URL
npm run screenshot -- http://localhost:5173/encounter screenshots/encounter.png
```

Arguments:
- `<route>` – app path (e.g. `/heroes`) or full URL. Defaults to `/`.
- `<output-file>` – where to save the PNG. Defaults to `screenshot.png`.
- `[css-selector]` – optional CSS selector to screenshot a specific element.

### Environment notes

In the Claude Code web environment, Chromium is pre-installed and auto-detected.
In other environments, run `npx playwright install chromium` once before using the script.

---

## Recording Demo GIFs

Playwright can record a GIF of an interaction to show a feature in action.

### Prerequisites

```bash
sudo apt-get install ffmpeg
```

### Record a demo

```bash
npm run demo -- <route> <output-file> [css-selectors-to-click...]
```

**Examples:**

```bash
# Just navigate and show the page
npm run demo -- /heroes screenshots/demo.gif

# Navigate then click elements in sequence
npm run demo -- /heroes screenshots/demo.gif ".hero-card" ".btn-edit"

# Full URL
npm run demo -- http://localhost:5173/encounter screenshots/demo.gif ".btn-roll"
```

Arguments:
- `<route>` – app path or full URL. Defaults to `/`.
- `<output-file>` – where to save the GIF. Defaults to `screenshots/demo.gif`.
- `[css-selectors...]` – optional list of CSS selectors to click in sequence.

The script records 1 second of initial page load, 1 second after each click, and 1 second at the end.

### Embed the demo GIF in a PR comment

Commit the GIF to the branch and reference it with a raw GitHub URL:

```
https://raw.githubusercontent.com/jahteo/forgesteel/<branch>/screenshots/demo.gif
```

```markdown
## Demo

![Demo](https://raw.githubusercontent.com/jahteo/forgesteel/<branch>/screenshots/demo.gif)
```

---

## Before/After Screenshot Workflow for PRs

Follow this workflow for every PR that changes the UI:

```bash
# 1. Start the dev server
npx vite --host &

# 2. Screenshot BEFORE your changes
npm run screenshot -- /affected-route screenshots/before.png

# 3. Make your code changes

# 4. Screenshot AFTER your changes
npm run screenshot -- /affected-route screenshots/after.png

# 5. Commit screenshots to the branch
git add screenshots/
git commit -m "chore: add before/after screenshots"

# 6. Push the branch
git push -u origin <branch-name>
```

### Embedding screenshots in the PR description

After pushing, reference screenshots using raw GitHub URLs:

```
https://raw.githubusercontent.com/jahteo/forgesteel/<branch-name>/screenshots/before.png
https://raw.githubusercontent.com/jahteo/forgesteel/<branch-name>/screenshots/after.png
```

Use this table format in the PR description:

```markdown
## Screenshots

| Before | After |
|--------|-------|
| ![Before](https://raw.githubusercontent.com/jahteo/forgesteel/<branch>/screenshots/before.png) | ![After](https://raw.githubusercontent.com/jahteo/forgesteel/<branch>/screenshots/after.png) |
```

Replace `<branch>` with the actual branch name.

---

## Tracking Changes in README_FORKED.md

**Every PR must add an entry to `README_FORKED.md`** under the `## Changes` section.

This file is the canonical log of everything this fork adds on top of upstream. It helps developers understand what's changed, lets us test changes before submitting them upstream, and gives us the documentation needed when we eventually open upstream PRs.

### What to include in each entry

Use this template for each change:

```markdown
### <Short title of the change>

**PR:** [#N](https://github.com/jahteo/forgesteel/pull/N) — `branch-name`

<1–3 sentence description of what the change does and why.>

**How to test:**
1. Run `npx vite --host` and open http://localhost:5173
2. Navigate to `/<relevant-route>`
3. <Specific steps to see or verify the change>

**Files changed:**
- `path/to/file.tsx` — <what changed here>

**Screenshots:** *(UI changes only — link to committed screenshots)*

| Before | After |
|--------|-------|
| ![Before](https://raw.githubusercontent.com/jahteo/forgesteel/<branch>/screenshots/before.png) | ![After](https://raw.githubusercontent.com/jahteo/forgesteel/<branch>/screenshots/after.png) |

**Upstream PR notes:** <Is this ready to submit upstream? Any cleanup needed? Upstream issue/discussion link if relevant.>
```

### Placement

Add new entries **at the top** of the `## Changes` section (newest first).

### What counts as a change

Add an entry for:
- Any new feature or behaviour change
- Bug fixes
- Tooling/infra additions that affect the dev workflow

Skip entries for: trivial typo fixes, screenshot-only commits, and changes that revert themselves within the same PR.

---

## Development

- **Dev server:** `npx vite --host` (port 5173)
- **Unit tests:** `npm run test`
- **Lint:** `npm run lint`
- **Type check + lint + test:** `npm run check`
- **Build:** `npm run build`
