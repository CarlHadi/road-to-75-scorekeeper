# Road to 75 Scorekeeper v0.1

A local-first Progressive Web App for recording scored knife/axe walk-back sessions on a phone.

## What works now

- Session date (defaults to today)
- Discipline: Knife / Axe
- Walk-Back A and B, four rounds each
- 3m–7m score entry with 0–15 validation
- Live round total and percentage
- Draft saving between rounds
- Session context: Energy, Focus, Physical Setup, Distraction, Notes, Achievements
- Review before save
- Local session history
- Offline app shell via service worker
- CSV export for Scores and Session Context

## Data shape

### Scores
Session ID, Session Date, Discipline, Walk-Back, Round, 3m Score, 4m Score, 5m Score, 6m Score, 7m Score

### Session Context
Session ID, Session Date, Discipline, Energy, Focus, Physical Setup, Distraction Level, Notes, Achievements

These match the two Microsoft Lists created for Road to 75.

## Important v0.1 limitation

Saved sessions currently live in the browser's local storage on the device. CSV export is provided for validation/testing. Direct Microsoft Lists sync is the next build step.

## Run locally

A service worker/PWA must be served over HTTP(S), not opened directly as a file.

From this folder, for testing on a computer:

    python3 -m http.server 8080

Then open http://localhost:8080

For iPhone installation, host this folder on an HTTPS site (for example GitHub Pages, Cloudflare Pages, Netlify, or another static host), open it in Safari, then use Share > Add to Home Screen.

## Next build step: Microsoft Lists sync

The app already creates a stable Session ID and stores the exact raw fields needed by the two Lists. The next version will authenticate with Microsoft and write:

- 8 items to `Road to 75 Scores`
- 1 item to `Road to 75 Session Context`

After that, Power BI can use the Lists as its source and the spreadsheet becomes optional for scored-session entry.
