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

## Development

- **Dev server:** `npx vite --host` (port 5173)
- **Unit tests:** `npm run test`
- **Lint:** `npm run lint`
- **Type check + lint + test:** `npm run check`
- **Build:** `npm run build`
