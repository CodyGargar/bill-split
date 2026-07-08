# Bill Split

A fast, mobile-friendly web app for splitting grocery bills — built for real-world scenarios like Costco runs where different people buy different things, some items are shared, and one person usually fronts the cash.

![Bill Split App](https://img.shields.io/badge/React-18-blue) ![Node](https://img.shields.io/badge/Node.js-Express-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What it does

### 1. Add people
Type in everyone who went on the trip. Each person gets a unique color that carries through the whole app so you can track who's who at a glance.

### 2. Import items — three ways
- **Scan a receipt** — take a photo or upload one. Claude AI (vision) reads the receipt and auto-populates every line item with name and price. Works on Costco receipts, grocery store thermal paper, screenshots, etc.
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
- An [Anthropic API key](https://console.anthropic.com) (only needed for receipt scanning — the rest works without it)

### Install and run

```bash
git clone https://github.com/YOUR_USERNAME/bill-split.git
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

The first time you tap **Scan Receipt**, the app asks for your Anthropic API key. It's saved in your browser's localStorage and only ever sent to the local Express server running on your own machine — never to any external service.

Get a key at [console.anthropic.com](https://console.anthropic.com).

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
├── server.js              # Express server — serves static files + Claude API proxy
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
- **Express** — local API server (Claude proxy, static file serving in production)
- **Claude claude-sonnet-4-6** (Anthropic) — receipt image parsing via vision API

---

## License

MIT
