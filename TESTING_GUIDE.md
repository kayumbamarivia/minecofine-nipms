# NIPMS — Simple Testing Guide (for the presentation)

Follow this top to bottom once, and you will have touched every working feature.
Every test says: **who to log in as → what to click → what you should see.**

---

## 0. Before you start (2 minutes)

1. Make sure MongoDB is running.
2. In the project folder run:

```bash
npm run db:seed     # resets data to a clean state
npm run dev         # starts web + API together
```

3. Open **http://localhost:5173** in the browser.

**Password for ALL test accounts:** `ChangeMeSecurely1`

| Sign in as | Email | Role |
|---|---|---|
| Company submitter (CFO) | `finance.director@reg.rw` | Enters and submits company data |
| Company approver (CEO) | `ceo@reg.rw` | Approves before it reaches the Ministry |
| Ministry analyst | `portfolio.analyst@minecofin.gov.rw` | Reviews, returns, creates SOEs |
| Head of Department | `hod.portfolio@minecofin.gov.rw` | Final approval |
| Leadership (Minister office) | `office.minister@minecofin.gov.rw` | Dashboards and reports |

**Tip:** to switch users quickly, click **Sign Out** (top right) and log in as the next person.

---

## 1. Login and roles (RS: users & permissions)

**Test:** Log in as each of the 5 accounts, one by one.

**You should see:** the sidebar menu CHANGES per role:
- CFO/CEO see only their company's data (REG).
- Analyst/HoD/Leadership see ALL companies plus **User Administration**.
- Only submitters and analysts see **Submission Workspace**.

**Also test a wrong password:** you get a clean red error message, not a crash.

---

## 2. Business Process 1 — Create a new SOE

**Log in as:** analyst (`portfolio.analyst@...`)

1. Sidebar → **Submission Workspace** → tab **Create SOE**.
2. Fill in: company name, code (e.g. `TEST1`), sector, location, description.
3. Save the draft.
4. Sidebar → **Submissions & Approvals** → click your new SOE submission → click **Submit**.
5. Sign out. **Log in as HoD** → **Submissions & Approvals** → select it → **Approve**.
6. Sign out. Log back in as analyst → Sidebar → **Investment Portfolio**.

**You should see:** the new company now appears in the portfolio registry as **active**.

---

## 3. Business Process 2 — Update SOE profile

**Log in as:** CFO (`finance.director@reg.rw`)

1. **Submission Workspace** → tab **Update Profile**.
2. Change something (e.g. location or CEO name) → save draft.
3. **Submissions & Approvals** → select it → **Submit**.
4. **Log in as CEO** → approve it.
5. **Log in as analyst** → approve it.
6. **Log in as HoD** → approve it.
7. Open **Investment Portfolio** → the company profile shows the new value.

**You should see:** the change only applies to the registry AFTER final approval. That is the whole point — show it proudly.

---

## 4. Business Process 3 — Planning & budgeting

**Log in as:** CFO

1. **Submission Workspace** → tab **Planning & Budgeting**.
2. Enter KPIs / targets (financial, operational, governance) → save draft.
3. Submit → CEO approves → analyst approves → HoD approves (same chain as above).

**You should see:** status moves each time: *Pending Company Approval → Pending Ministry Review → Pending Department Approval → Approved*.

---

## 5. Business Process 4 — Quarterly report (the strongest demo)

**Log in as:** CFO

1. **Submission Workspace** → tab **Quarterly Report**.
2. **Option A (manual):** type numbers into Revenue, Cost of sales, Equity, etc.
3. **Option B (Excel/CSV import — impressive):**
   - Click **Download CSV template**.
   - Open it, put numbers in the Value column, save.
   - Click **Upload spreadsheet** → the form fields fill automatically.
4. Watch the **ratio tiles** (Gross profit, EBITDA, Current ratio, ROE...) update live.
5. To show **red flags**: enter Current liabilities BIGGER than Current assets → a red warning box appears.
6. Tick the document checklist → **Save quarterly draft** → go to **Submissions & Approvals** → **Submit**.

**You should see:** ratios calculated automatically, red flags raised automatically. This answers the RS requirement for "2 options for data input" (Excel upload OR manual).

---

## 6. Business Process 5 — Quarterly report review (approve AND return)

Continue with the report you just submitted.

1. **Log in as CEO** → **Submissions & Approvals** → select the report → **Approve**.
2. **Log in as analyst** → select the same report. Now demonstrate BOTH powers:
   - **Return path:** type a comment (e.g. "Please verify the revenue figure") in the comment box → click **Return**. 
   - **Log in as CFO** → the report shows status **Returned for Revision** with the reviewer's comment in a red box → click **Submit** again (after "fixing").
   - **Log in as CEO** → approve again.
   - **Log in as analyst** → this time click **Approve**.
3. **Log in as HoD** → **Approve** → status becomes **Approved**.

**You should see:** the return-with-comments loop from the RS working exactly as specified. The comment is visible to the company.

---

## 7. Business Processes 6 & 7 — Annual report + review

Same as tests 5 and 6, but use the **Annual Report** tab and enter a fiscal year (e.g. `FY 2025/26`). It goes through the identical approval chain.

**One sentence for the room:** "Annual reporting uses the same engine as quarterly, with full-year statements."

---

## 8. Business Process 8 — Action points

**Log in as:** analyst

1. Sidebar → **Action Points**.
2. Create one: pick a company, title (e.g. "Submit updated board charter"), category, priority, due date.
3. Update its status (open → in progress → resolved).

**You should see:** the follow-up items ministry raises against companies, with priorities and due dates.

---

## 9. Business Process 9 — Ad hoc reporting

**Log in as:** Leadership (`office.minister@...`)

1. Sidebar → **Reports & Extracts**.
2. Open a **company summary** — shows approved report history and financial summary.
3. Click **Download CSV** for a company and for the **portfolio summary**.

**You should see:** a real CSV file downloads and opens in Excel. This is the "extract different reports" requirement.

---

## 10. Leadership dashboard

**Stay logged in as Leadership.**

1. Sidebar → **Dashboard**.

**You should see:** active SOEs count, portfolio value (RWF), pending submissions, approved reports, sector allocation chart, recent submissions — all from real data, and it changes when you approve things.

---

## 11. Document Registry (company folders)

**Log in as:** CFO

1. Sidebar → **Document Registry**.
2. Pick a category (e.g. Board minutes), give a title, choose a PDF → **Upload**.
3. Click **Download** on the row — the file comes back.
4. Note the small text showing storage: **Local disk** (or MinIO/S3 if configured).

**You should see:** upload → appears in the table → downloads correctly. Company users only see their own company's folder.

---

## 12. User Administration (accounts the owner can see)

**Log in as:** HoD or Leadership

1. Sidebar → **User Administration**.
2. You see ALL accounts with role, company, active status, and email-verified status.
3. Create a test user: name, email, role **Company Data Submitter**, pick a company → **Create & send invite**.
4. **Without SMTP:** the invite (temporary password + verification link) is printed in the API terminal — and a toast shows the temporary password.
5. Try **Deactivate** on the test user, then **Activate** again.

**You should see:** no public signup exists — accounts are provisioned by the ministry, exactly per the RS.

---

## 13. Email verification + password reset (security)

**Only demo this if you have time. Needs the API terminal visible, or SMTP configured.**

1. Create a user (test 12). Copy the **verification link** from the API terminal (or email inbox if SMTP is set).
2. Open the link in the browser → "Email verified successfully."
3. Log in with the temporary password → the system FORCES a password change before anything else.
4. Also test **Forgot password?** on the login page → reset link arrives (terminal/inbox) → set a new password → log in.

**You should see:** unverified users cannot log in; temporary passwords must be changed; reset links expire in 1 hour.

---

## 14. Change password (any user)

1. While logged in, click the **Password** button in the top-right header.
2. Enter current + new password (min 10 chars, uppercase + lowercase + number).

**You should see:** weak passwords are rejected with a clear message; a good one succeeds.

---

## Things NOT to click in front of ministers

| Item | Why |
|---|---|
| The **bell icon** (top right) | Decorative only — no notifications behind it yet |
| **Operations** and **Inter-Ministerial** menus | Placeholder pages, minimal content |
| Email demo without SMTP or visible terminal | Links go to the console, may look confusing |

---

## If something goes wrong on the day

| Problem | Fix |
|---|---|
| Page will not load | Check `npm run dev` is running (both web + api lines in terminal) |
| "Invalid email or password" | Password is `ChangeMeSecurely1` — check caps |
| Data looks messy from rehearsal | Run `npm run db:seed` again → clean state (deletes your test data) |
| Port 3001 already in use | Close old terminals, restart `npm run dev` |
| API errors after editing `.env` | Restart `npm run dev` |

**Golden rule:** rehearse the full loop once (tests 5 + 6) right before presenting, then reseed if you want a clean start.
