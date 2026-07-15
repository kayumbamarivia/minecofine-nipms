# NIPMS — National Investment Portfolio Management System

Ministry of Finance and Economic Planning (MINECOFIN) — Republic of Rwanda

## Prerequisites
- Node.js 20+
- MongoDB 6+ running locally (or set `MONGODB_URI` in `server/.env`)
- Optional: Docker (for MinIO object storage)

## Setup

```bash
npm install
npm install --prefix server
cp server/.env.example server/.env
# Edit JWT_SECRET and BOOTSTRAP_PASSWORD
npm run db:seed
npm run dev
```

- Application: http://localhost:5173  
- API: http://localhost:3001  
- API documentation (Swagger): http://localhost:3001/api/docs  

## Object storage (documents)

**Recommendation:** use **MinIO** (S3-compatible) for ministry / shared environments; keep `STORAGE_DRIVER=local` for simple laptop development.

| Driver | When to use |
|--------|-------------|
| `local` (default) | Files under `server/uploads` — no Docker needed |
| `s3` | MinIO or AWS S3 — better for multi-server, backups, and production |

### MinIO (optional)

```bash
docker compose up -d
```

Then in `server/.env`:

```
STORAGE_DRIVER=s3
S3_ENDPOINT=http://127.0.0.1:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=nipms-documents
S3_FORCE_PATH_STYLE=true
```

- MinIO console: http://127.0.0.1:9001  
- API health reports the active driver: `GET /api/health` → `storage`

Switching to AWS S3 later only needs endpoint/credentials changes — the app already speaks S3.

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

Also live: **Document Registry** (local disk or MinIO/S3), **Excel/CSV financial statement import**, **User Administration** (ministry-provisioned accounts), **email verification** and **password reset**.

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
APP_URL=http://localhost:5173
# Optional SMTP — leave empty for console delivery in local development
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```
