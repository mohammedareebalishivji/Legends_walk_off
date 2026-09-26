# ⚡ Legends Walk Off — Tournament Portal

> *"ONLY LEGENDS WALK OFF THE FIELD."*  
> Official Inter-Collegiate Cricket & Football Championship Web Portal  
> **STME Impulse Committee** • School of Technology Management & Engineering, NMIMS Hyderabad

---

## 🏆 Overview

**Legends Walk Off** is a high-octane, esports & broadcast-style tournament web application engineered for the premier inter-collegiate sports championship at NMIMS Hyderabad Arena. Built using **Stitch MCP**, this web portal delivers broadcast telemetry, real-time scorekeeping, and interactive leaderboards.

---

## 🚀 Quick Start

You can run this portal with zero build steps or dependencies:

### Option 1: Local HTTP Server (Recommended)
```bash
# Using Node / npx
npx serve -l 3000 .

# OR using Python
python3 -m http.server 3000
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Direct File Open
Simply double-click [index.html](file:///Users/areebalishivji/Desktop/Legends_walk_off/index.html) to view in any modern web browser.

---

## 🌐 Connected Pages & Architecture

| Page | File | Description |
| :--- | :--- | :--- |
| **Tournament Hub** | [`index.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/index.html) | Hero clash countdown, live telemetry cards, marquee fixtures, clash preview, and registration CTA |
| **Points & Standings** | [`standings.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/standings.html) | Dual-sport pool tables (Cricket & Football), real-time search, group filtering, Golden Bat / Golden Boot leaderboards |
| **Live Scores & Telemetry** | [`live-scores.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/live-scores.html) | Live broadcast scorecard, ball-by-ball commentary, radar telemetry, and interactive fan voting poll |
| **About Arena & Sponsors** | [`about.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/about.html) | NMIMS Arena specifications, STME Impulse Committee contacts, rulebook, and interactive sponsor manager |
| **Admin Scoring Engine** | [`admin-console.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/admin-console.html) | Official referee console: ball-by-ball scoring (+1, +4, +6, Wicket, Extras, Undo, Strike swap, alerts) |
| **Admin Official Login** | [`login.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/login.html) | Authenticated credentials portal with animated 2FA verification and automatic redirect to Admin Console |
| **Mobile Live Scores** | [`mobile-live.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/mobile-live.html) | Dedicated mobile viewport live match console with sticky bottom navigation |
| **Mobile Admin Console** | [`mobile-admin.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/mobile-admin.html) | Mobile scorer console for sideline field umpires |

---

## ⚡ Live Real-Time Multi-Tab Synchronization

The portal features an integrated synchronization engine in [`js/legends-core.js`](file:///Users/areebalishivji/Desktop/Legends_walk_off/js/legends-core.js):

1. **Scorer Input:** When an official scores a ball in [`admin-console.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/admin-console.html) (e.g., clicking `+6`, `+4`, or recording a Wicket):
   - The state updates locally and persists to `localStorage`.
   - A `storage` event broadcast is triggered across all open browser tabs.
2. **Instant Viewer Update:** Any open tab displaying [`live-scores.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/live-scores.html) or [`index.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/index.html) immediately reflects the updated runs, wickets, overs, and run rate without page reloads.
3. **Public Arena Alerts:** Announcements dispatched via the Admin Console instantly appear in the top broadcast ticker.
4. **Interactive Fan Poll:** Community votes for **STME Strikers** vs. **CBIT Spartans** persist and update energy percentages dynamically.

---

## 🎨 Design System Specifications

Generated and aligned with Stitch design tokens:

- **Colors:**
  - **Primary (`#E10600` - Blood Red):** Battle-ready accent, live indicators, knockout stages, primary action CTAs.
  - **Secondary (`#FFD400` - Electric Neon Yellow):** Velocity alert, leading score metric, Man of the Match badges.
  - **Tertiary (`#10B981` - Pitch Green):** Competitive success, qualification cutoff, confirmed entries.
  - **Canvas Base (`#0A0A0A` / `#131313`):** Deep void black broadcast background.
- **Typography:**
  - **Headlines & Display:** `Anton` (condensed athletic uppercase, skewed momentum)
  - **Telemetry & Scores:** `JetBrains Mono` (tabular numerical precision)
  - **Body & Metadata:** `Inter` (high-clarity geometric sans-serif)
- **Geometry & Elevation:**
  - Chamfered edge polygons (`clip-angle`)
  - -12° italic parallelogram badges
  - Stadium neon edge-glow illumination

---

## 🔌 Stitch MCP Integration Details

- **MCP Server:** `stitch` (`@_davideast/stitch-mcp`)
- **Stitch Project ID:** `4772025827612632847`
- **Config Path:** `~/.gemini/config/mcp_config.json`
- **API Key:** `YOUR_STITCH_API_KEY`

---

© 2026 STME Impulse Committee • School of Technology Management & Engineering, NMIMS Hyderabad. All Rights Reserved.
