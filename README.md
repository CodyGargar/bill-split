# Bill Split

A fast, mobile-friendly web app for splitting grocery bills — built for real-world scenarios like Costco runs where different people buy different things, some items are shared, and one person usually fronts the cash.

![Bill Split App](https://img.shields.io/badge/React-18-blue) ![Node](https://img.shields.io/badge/Node.js-Express-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What it does

### 1. Add people
Type in everyone who went on the trip. Each person gets a unique color that carries through the whole app so you can track who's who at a glance.

### 2. Import items — three ways
- **Scan a receipt** — take a photo or upload one. Claude reads the receipt and auto-populates every line item with name and price. Works on Costco receipts, grocery store thermal paper, screenshots, etc.
- **Paste a list** — copy from your Notes app, a spreadsheet, or anywhere. One item per line in the format `Item name $price`. The app recognizes the prices and imports everything at once.
- **Add manually** — type items one at a time with a name and price field.

After importing you get a review screen to rename, edit prices, or delete anything the scan misread.

### 3. Assign items to people
Each item shows chip buttons for every person. Tap to toggle who's splitting that item — one person, a few, or everyone. "All" is the default and a one-tap shortcut to put it back.

For items with **unequal splits** (e.g. a Costco membership where the account owner should pay more), tap **⚖ split** to open the custom split panel. Set relative shares per person — if the owner puts in 2 and everyone else puts in 1, the owner pays twice as much. Arrow keys navigate between people so you don't have to reach for the mouse.

### 4. Tax handling
Tax is entered once (auto-filled from the receipt scan if available) and distributed **proportionally** — people who bought more expensive stuff pay a larger share of the tax, not an even split.

### 5. Summary
- Expandable per-person cards showing each item they owe and their tax share
- Optional "Who paid?" selector — pick the person who fronted the bill and it switches to "Alex owes Jordan $X" format
- **Two copy formats:**
  - **Totals only** — clean one-liner per person, paste it straight into a group chat
  - **With breakdown** — full itemized list under each person, good for receipts or if anyone wants to double-check

---

## Getting started

### Requirements
- [Node.js](https://nodejs.org) v18 or later
- [Claude Code](https://claude.com/claude-code) installed and logged in (`claude` on your PATH) — only needed for receipt scanning, the rest works without it. Receipt scanning uses your existing Claude subscription via the CLI, not a separate API key.

### Install and run

```bash
git clone https://github.com/CodyGargar/bill-split.git
cd bill-split
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Use it on your phone (same WiFi)

The dev server binds to all network interfaces. Find your PC's local IP:

```
ipconfig   # Windows
ifconfig   # Mac/Linux
```

Then open `http://<your-pc-ip>:5173` on your phone. The camera upload button will use your phone's camera directly.

### Receipt scanning setup

Receipt scanning shells out to the **Claude CLI** on your machine — it uses whatever account you're logged into Claude Code with (subscription or API key), so there's nothing to configure in the app itself. Make sure you've run `claude` at least once and are logged in before scanning a receipt.

Because this runs against your own Claude account, the server applies a small rate limit (default: 5 scans per minute, configurable via `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` env vars) to guard against accidental runaway usage — e.g. double-clicks or retry bugs burning through your usage.

This design means the app **only works when you're running the local server on your own machine** — it can't be deployed to a static host like GitHub Pages, since it needs to invoke a CLI tool with your local login.

---

## Production build

To build and serve a single self-contained server (no Vite dev server needed):

```bash
npm run build
npm start
```

This compiles the React app into `dist/` and serves it from the Express server at **http://localhost:3001**.

---

## Project structure

```
bill-split/
├── server.js              # Express server — serves static files + shells out to the Claude CLI
├── vite.config.js         # Vite config with /api proxy to Express in dev
├── src/
│   ├── App.jsx            # Root component, state, step navigation
│   ├── App.css            # All styles (mobile-first, CSS variables)
│   ├── utils/
│   │   └── calculations.js  # Split math — equal, custom, tax distribution
│   └── components/
│       ├── PeopleStep.jsx   # Add/remove people
│       ├── ItemsStep.jsx    # Receipt scan, paste import, manual entry
│       ├── ItemCard.jsx     # Per-item assignment + custom split modal
│       └── SummaryStep.jsx  # Totals, breakdowns, copy/share
```

---

## Tech stack

- **React 18** — UI
- **Vite** — dev server and build
- **Express** — local API server (invokes the Claude CLI, static file serving in production)
- **Claude Code CLI** — receipt image parsing, run locally against your own Claude login (model configurable via `CLAUDE_MODEL`, defaults to `sonnet`)

---

## License

MIT
