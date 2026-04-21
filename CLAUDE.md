# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start frontend (Vite :5173) + backend (Express :3001) together
npm run build    # Production build
node server.js   # Backend only
```

To clear Vite cache: `Remove-Item -Recurse -Force node_modules\.vite` then restart.

After adding new Express routes, always restart the server.

## Architecture

**Full-stack single repo:** React 18 + Vite frontend, Express backend, JSON flat files for all persistence (no database).

- `server.js` — Express entry, mounts all routes, initializes JSON data files on startup, handles file uploads via multer → `data/uploads/`
- `routes/` — One file per domain (employees, timelog, leave, jobs, tools, stock, ohs, disciplinary, zk, unleashed, dashboard, settings). All use `readData(file)` / `writeData(file, data)` helpers for JSON persistence.
- `zkService.js` — Single persistent TCP connection to ZKTeco F22 biometric device at `10.16.15.141:4370`
- `src/App.jsx` — Top-level page switcher (not React Router); renders one page component based on state
- `src/hooks/useApi.js` — All API calls go through `apiFetch(path)` and `useGet(path)` hook. BASE is already `http://localhost:3001/api`.
- `src/pages/` — One file per top-level page; sub-pages and modals live in named subdirectories (e.g. `hr/`, `dashboard/`, `production/`)

**Vite proxy:** `/api` and `/uploads` requests from the frontend proxy to `http://localhost:3001` in dev.

## Critical Rules

**apiFetch path — never prefix with `/api`**
`BASE` is already `http://localhost:3001/api`. Use `apiFetch('/employees')`, not `apiFetch('/api/employees')` → 404.

**No IIFEs in JSX** — use `{condition && <JSX />}` or ternary. Never `{(() => { ... })()}`.

**All `useState` hooks at the top of the component** — before any conditionals or early returns.

**Helper functions at module level** — not inside component functions. Functions defined inside components are recreated on every render.

**No nested Express route handlers** — all routes must be top-level `app.get/post/put/delete(...)`.

## API Response Shapes

- `GET /api/employees` → `{ employees: [...] }` — unwrap with `data?.employees || []`
- `GET /api/timelog` → bare array `[...]`
- `GET /api/leave` → bare array `[...]`

Timelog entry: `{ id, employeeId, name, dept, type: "in"|"out", timestamp, source?, zkUserId? }`
Leave record: `{ id, employeeId, name, dept, type, startDate, endDate, days, reason, status, submittedAt, decidedAt, decidedBy }`

## Data Storage

All data lives in `data/*.json`. `server.js` creates these files with empty defaults on startup if missing. Never write to these files directly from frontend code — always go through the API.

## Environment

`.env` holds `UNLEASHED_API_ID` and `UNLEASHED_API_SECRET` for the Unleashed inventory API (used in `routes/unleashed.js`).
