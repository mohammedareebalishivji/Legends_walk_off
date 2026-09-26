# ⚡ Legends Walk Off — Tournament Portal

> *"ONLY LEGENDS WALK OFF THE FIELD."*  
> Official Inter-Collegiate Cricket & Football Championship Web Portal  
> **STME Impulse Committee** • School of Technology Management & Engineering, NMIMS Hyderabad

---

## 🏆 Overview

**Legends Walk Off** is an esports & broadcast-style tournament web application engineered for the premier inter-collegiate sports championship at NMIMS Hyderabad Arena. Built using **Stitch MCP**, this portal provides broadcast telemetry, real-time scorekeeping, role-based access control, and an automated continuous integration & installation pipeline.

---

## 🚀 Quick Start

### 1. One-Click Installer & Pipeline
```bash
./install.sh
```
*Validates the environment, verifies syntax, runs the automated RBAC test suite, builds the distribution bundle, and smoke-tests all web endpoints.*

### 2. Launch Local Server
```bash
./start.sh
```
*Spins up the web server on port `3000` and automatically opens your browser.*

---

## 🔐 Role-Based Access Control (RBAC) System

The portal features an integrated institutional Role-Based Access Control engine ([`js/legends-rbac.js`](file:///Users/areebalishivji/Desktop/Legends_walk_off/js/legends-rbac.js)):

| Role | Title | Permissions & Access Scope |
| :--- | :--- | :--- |
| **`committee`** | **Committee Executive Admin** | **Super-Admin:** Full scoring for Cricket & Football, emergency broadcast alert dispatcher, match finalization & reset, sponsor management, audit override |
| **`cricket`** | **Official Scorer (Cricket)** | **Cricket Scorer:** Real-time ball-by-ball deliveries (`0`, `1`, `2`, `3`, `4`, `6`), wickets, extras, strike swapping, and bowler rotations. Football scoring is locked |
| **`football`** | **Official Scorer (Football)** | **Football Scorer:** Goals, yellow/red cards, penalty fouls, match half clocks, and substitutions. Cricket scoring is locked |
| **`referees`** | **Referees Panel & Match Judge** | **Judiciary & Audit:** Referee audit override, match dispute adjudication, DLS par calculations, official sign-off |
| **`viewer`** | **Public Spectator / Athlete** | **Public View:** Read-only access to schedules, live broadcasts, and tables. Protected scoring routes automatically enforce login |

### Live RBAC Features in [`admin-console.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/admin-console.html):
- **Dynamic Security Ribbon:** Displays the authenticated official's name, role badge, and active relay telemetry.
- **Interactive Role Switcher:** Dropdown in the header enables instant role switching for rapid demonstration of permission enforcement.
- **Automated Deck Locking:** Unauthorized decks (e.g. attempting to score football as a cricket scorer) display permission lock banners.
- **Visual Disablement:** Elements tagged with `data-rbac-perm` (e.g. `cricket:score`, `alerts:broadcast`) are dynamically disabled and grayed out if the active role lacks authorization.

---

## 🛠️ Automated CI/CD & Installer Pipeline

The project includes an enterprise-grade automated pipeline ([`pipeline.sh`](file:///Users/areebalishivji/Desktop/Legends_walk_off/pipeline.sh)):

```text
[STAGE 1/5] Environment & Tooling Verification (Bash, Node.js, Python, Git)
[STAGE 2/5] Static Integrity & Syntax Validation (node -c, core files verification)
[STAGE 3/5] RBAC Security & Permission Test Suite (node tests/rbac.test.js - 17 automated tests)
[STAGE 4/5] Distribution Artifact Generation (dist/ packaging for static deployment)
[STAGE 5/5] Local HTTP Server Smoke Test (Automated curl status code checks across all 11 routes)
```

### GitHub Actions CI/CD
A GitHub Actions workflow is pre-configured in [`.github/workflows/ci-cd.yml`](file:///Users/areebalishivji/Desktop/Legends_walk_off/.github/workflows/ci-cd.yml) to automatically validate commits, execute the RBAC test suite, and deploy `dist/` to GitHub Pages.

---

## 🌐 Connected Pages & Architecture

| Page | File | Description |
| :--- | :--- | :--- |
| **Tournament Hub** | [`index.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/index.html) | Hero clash countdown, live telemetry cards, marquee fixtures, clash preview, and registration CTA |
| **Points & Standings** | [`standings.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/standings.html) | Dual-sport pool tables (Cricket & Football), real-time search, group filtering, Golden Bat / Golden Boot leaderboards |
| **Live Scores & Telemetry** | [`live-scores.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/live-scores.html) | Live broadcast scorecard, ball-by-ball commentary, radar telemetry, and interactive fan voting poll |
| **About Arena & Sponsors** | [`about.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/about.html) | NMIMS Arena specifications, STME Impulse Committee contacts, rulebook, and interactive sponsor manager |
| **Admin Scoring Engine** | [`admin-console.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/admin-console.html) | Official referee console with RBAC controls, scoring buttons, audit log, and instant broadcast dispatcher |
| **Admin Official Login** | [`login.html`](file:///Users/areebalishivji/Desktop/Legends_walk_off/login.html) | Authenticated credentials portal with animated 2FA verification, role preview, and redirect to Admin Console |
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
