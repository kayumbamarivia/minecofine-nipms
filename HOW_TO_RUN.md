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
# Edit JWT_SECRET and BOOTSTRAP_PASSWORD
npm run db:seed
npm run dev
```

- Application: http://localhost:5173  
- API: http://localhost:3001  
- API documentation (Swagger): http://localhost:3001/api/docs  

## Documents

Uploaded files are stored in MongoDB (GridFS). Point `MONGODB_URI` at Atlas and the same files are available locally and on Render — no MinIO or S3.

API health reports storage: `GET /api/health` → `storage.driver = gridfs`

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
APP_URL=http://localhost:5173
# Optional SMTP — leave empty for console delivery in local development
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```
