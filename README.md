# PUNKSTATION

Cyberpunk-themed media infotainment platform built with React + Express. Glitch aesthetics, hard edges, solid colors, 3D transforms.

## Stack

- **Frontend**: React 19 + Vite, React Router, Zustand, Framer Motion, Lucide icons
- **Backend**: Express 5, SQLite (better-sqlite3), JWT auth, bcrypt
- **Security**: Helmet, rate limiting, input validation, bcrypt-12, HS256 JWT, audit logging

## Quick Start

```bash
npm install
npm run dev
```

This starts both Vite dev server (port 5173) and Express API (port 3001).

## Default Admin

- **Username**: `admin`
- **Password**: `PunkSt@tion2026!`

Change the admin password after first login via Settings.

## Features

### User Portal
- Media upload (video, image, audio — up to 500MB)
- Browse & search with filters
- Like, comment, report
- Playlists
- Profile & password management

### Admin Panel
- Dashboard with platform stats
- User management (ban, role change, delete)
- Media moderation (status: active/pending/flagged/removed)
- Content report review
- Full audit log

## Environment

Copy `.env` and update for production:

```
JWT_SECRET=<random-64-char-string>
ADMIN_DEFAULT_PASSWORD=<strong-password>
PORT=3001
```

## Architecture

```
src/
  components/layout/   — Sidebar, TopBar, AppLayout
  pages/               — AuthPage, Dashboard, Browse, Upload, MediaView, Settings, Playlists
  pages/admin/         — AdminDashboard, Users, Media, Reports, Audit
  store/               — Zustand stores (auth, media, admin)
  styles/              — cyberpunk.css (theme), layout.css (layout)
server/
  db/schema.js         — SQLite schema + migrations
  middleware/           — auth (JWT), validation (express-validator)
  routes/              — auth, media, admin, playlists
  index.js             — Express server entry
```
