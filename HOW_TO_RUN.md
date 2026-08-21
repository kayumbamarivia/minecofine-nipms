# NIPMS — National Investment Portfolio Management System

Ministry of Finance and Economic Planning (MINECOFIN) — Republic of Rwanda

## Prerequisites
- Node.js 20+
- MongoDB 6+ running locally, or MongoDB Atlas (`MONGODB_URI` in `server/.env`)

## Setup

```bash
npm install
npm install --prefix server
cp server/.env.example server/.env
# Set MONGODB_URI (local Mongo or Atlas), JWT_SECRET, BOOTSTRAP_PASSWORD, and SMTP if you want real email
npm run db:seed
npm run dev
```

- Application: http://localhost:5173  
- API: http://localhost:3001  
- API documentation (Swagger): http://localhost:3001/api/docs  

`npm run db:seed` creates the initial SOE registry and five accounts. If the database already has users, seed **does nothing** (so Atlas/production data is not wiped). To replace everything, set `FORCE_SEED=true` then seed again.

## Documents

Uploaded files are stored in MongoDB GridFS in the same database as companies and users. There is no MinIO, S3, or local `uploads` folder. If `MONGODB_URI` points at Atlas, files uploaded locally are already available on Render.

`GET /api/health` reports `storage.driver = gridfs` and `mail.mode` (`smtp` or `console`).

## Environments (local and Render)

Use the **same** `MONGODB_URI`, `JWT_SECRET`, `BOOTSTRAP_PASSWORD`, and SMTP values locally and on Render.

| Local (`server/.env`) | Render (Web Service env) |
|---|---|
| `NODE_ENV=development` | `NODE_ENV=production` |
| `PORT=3001` | omit (`PORT` is set by Render) |
| `APP_URL=http://localhost:5173` | omit (uses the live Render URL) |
| `CORS_ORIGINS` optional | omit |

Production is **one** Render Web Service: it builds the Vite app and the Express API serves both the UI and `/api`.

Build: `npm install && npm run build && npm install --prefix server`  
Start: `npm start --prefix server`

## Roles

| Role | Responsibility |
|------|----------------|
| Company Data Submitter | Enter and submit company information |
| Company Approver | Approve packages before ministry receipt |
| Portfolio Analyst | Profiling, analysis, return queries; initiate SOE creation |
| Head of Department | Final approval before reports are final |
| Leadership | Dashboards, reports, action points |

Credentials use `BOOTSTRAP_PASSWORD` from `server/.env`.

## Implemented business processes

1. **Create SOE** — analyst → HoD → company activated  
2. **Update SOE profile** — approval applies registry changes  
3. **Planning & budgeting** — KPI / performance contract package  
4. **Quarterly reports** — statements + ratios + red flags (+ Excel/CSV import)  
5. **Quarterly review** — company → analyst → HoD  
6. **Annual reports** — same engine as quarterly (fiscal year)  
7. **Annual review** — same approval chain  
8. **Action points** — ministry follow-ups  
9. **Ad hoc reporting** — company & portfolio summaries + CSV extract  

Also live: **Document Registry** (files in MongoDB), **Excel/CSV financial statement import**, **User Administration** (ministry-provisioned accounts), **email verification** and **password reset**.

## Authentication model

- **No public signup** — ministry staff create accounts under **User Administration**.
- New users receive an invite (SMTP if configured; otherwise the invite + links are printed in the API console).
- Login requires a **verified email**.
- Passwords are stored with **bcrypt** (cost factor 12), never in plain text.
- Strength rule: minimum 10 characters, upper + lower + number.
- Forgot password / reset links are one-time tokens (SHA-256 hashed in the database, 1-hour expiry).
- Email verification tokens expire in 48 hours.
- Temporary passwords force a change on first successful session.

```
# Optional SMTP — same values locally and on Render.
# Leave empty for console delivery (links printed in the API terminal).
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```
