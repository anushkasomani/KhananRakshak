# Khanan Rakshak

A safety app for coal mines. Workers check in with GPS, report hazards and hit SOS. Supervisors see who's on site and push problems up the chain. Managers and DGMS see the whole picture. Every important action goes into a tamper-evident audit log.

It's a website that can also be installed on a phone like an app (PWA).

---

## Run it on your laptop

You need Node 18 or newer.

**1. Backend** (`server/`, runs on port 5002)

```bash
cd server
npm install
npx prisma db push      # creates the database file (server/prisma/dev.db)
npm run seed            # fills it with demo mines, people, incidents, etc.
npm run dev             # starts the API; restarts itself when you edit code
```

**2. Frontend** (`client/`, runs on port 5173)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 and sign in with Google.

**3. The `.env` files** (not in git, ask for the values)

`server/.env`
```
GOOGLE_CLIENT_ID=...                  # same Google client ID as the frontend
ADMIN_EMAILS=you@gmail.com,other@gmail.com   # these accounts become admin on sign-in
JWT_SECRET=any-long-random-string     # signs login tokens
ATTENDANCE_RADIUS_OVERRIDE_M=10000    # optional, for testing: lets you check in from 10 km away
GROQ_API_KEY=your-groq-api-key        # optional: enables admin Governance Intelligence analysis
GROQ_MODEL=openai/gpt-oss-120b        # optional: Groq model (this is the default)
```

`client/.env`
```
VITE_GOOGLE_CLIENT_ID=...
```

> Running `npm run seed` wipes the database and starts over. Your own account goes too, so just sign in again.

---

## Who uses it

Everyone has exactly one role. From lowest to highest:

**Worker → Supervisor → Officer → Mine manager → Project manager → DGMS**

- **Worker**: check in and out, report hazards, SOS, do assigned inspections.
- **Supervisor**: everything a worker can do, plus see who's present at their mine, mark people present by hand, log incidents, run SOS control, escalate things upward.
- **Officer** (safety, ventilation, electrical…) **and above**: also receive escalations, approve inspections, and see compliance and the audit log.
- **DGMS**: sees every mine, not just one.

**Admin** is separate from roles. It's a switch on the account. Admins add mines, approve new people, and assign inspections. Anyone listed in `ADMIN_EMAILS` becomes an admin automatically.

Everyone except DGMS and admins only sees data for **their own mine**. The server enforces this, not just the screen.

### Governance intelligence

Admins can open **Governance intelligence** to review database-derived mine risk indicators, repeated open hazard groups and inspection activity anomalies. The deterministic analytics are available without an AI key. To generate a narrative, an admin explicitly submits a question; Groq receives that question plus calculated metrics, mine names, finding categories and supporting record IDs. It does not receive worker identities, contact details, operational descriptions, grievances, or raw records. Keep personal details out of the question. The latest 20 successful analyses and their analytics snapshots are stored in SQLite and remain available after reload. Analysis requests are also recorded in the existing audit hash chain with the requester, scope, timestamp and a hash of the question. The API key stays in `server/.env` and is never sent to the browser. `XAI_API_KEY` remains accepted as a migration fallback for existing local configurations, but `GROQ_API_KEY` is the preferred setting.

The inspection anomaly baseline requires at least four inspections overall and two in the prior 30 days; otherwise it is labeled `insufficient_data`. It flags zero inspections in the latest 30 days against that baseline. Recurring hazards are grouped by the exact mine, category and zone. Risk score is active SOS ×10 + open high/critical hazards ×3 + overdue actions ×2 + open incidents ×2 + missed inspections ×1 + inspection violations (capped at 5); levels are normal below 4, elevated from 4, and high from 10. Indicator counts and supporting record IDs appear alongside each mine.

### Each role's home screen

The Dashboard page shows a different screen for each role. Each one answers one question.

| Role | The question it answers | What's on it |
|---|---|---|
| **Worker** | "What do I need to do today?" | Check in and out, Report hazard, inspection tasks given to me, recent hazards, announcements |
| **Supervisor** | "Is my crew here, and is anything going wrong?" | The worker screen, plus **Today at the mine**: who's present, who hasn't checked in (with Mark present and Call buttons), live SOS at the mine |
| **Officer** | "What's open in my area?" | Hazards and incidents for their discipline only (a ventilation officer sees gas and ventilation; a safety officer sees everything), inspections they can approve, their check-in |
| **Mine manager** | "Is my mine OK right now?" | **Needs your attention** (SOS, critical incidents, unacknowledged escalations, overdue inspections, low attendance), six live numbers for the mine, the mine's risk level |
| **Project manager** | "Which way are things heading?" | Eight-week charts (attendance rate, hazards reported, incidents, inspections completed), then today's numbers |
| **DGMS** | "Which mine needs me?" | Every mine on a map coloured by risk, live SOS across all mines, a table of mines with the riskiest first |

Officers and above also see an **escalation banner** at the top when something has been escalated to them. Supervisors never see it, because escalations only go upward to officers and above.

Which areas each officer type sees (set in `server/src/routes/dashboardRoutes.ts`):

| Officer | Hazard categories | Incident types |
|---|---|---|
| Safety, Other | all | all |
| Ventilation | Ventilation, Gas | Methane spike |
| Electrical | Electrical | Electrical short |
| Mechanical | Machinery, Transportation | Equipment jam |
| Survey | Structural, Environmental | Roof fall, Inundation |
| Blasting | Structural | Roof fall |

**Risk level** (used on the manager and DGMS screens) is a simple score anyone can check:

- active SOS: 10 points each
- critical or fatal open incidents: 5 points each
- other open incidents: 2 points each
- overdue inspections: 2 points each
- open high or critical hazards: 1 point each

A score of **10 or more is High**, **4 or more is Elevated**, and anything lower is Normal.

The numbers on these screens come from `GET /api/dashboard/mine/:id` (officer and above, own mine only) and `GET /api/dashboard/overview` (DGMS and admin only). They refresh every minute.

---

## How the main parts work

### Signing up
1. A person signs in with Google.
2. They fill a short form: name, phone, role, mine, and their trade or officer type.
3. Their account waits as `PENDING` until an admin approves it on the **People** page.
4. Admins can also add people directly, and those accounts are approved straight away.

There's no separate "requests" table. It's the `status` field on the User (`NEW` → `PENDING` → `APPROVED` or `REJECTED`).

### Mines
An admin adds a mine by dropping a pin on a map and setting a radius (for example 1.2 km). That circle is the check-in area.

### Attendance
- The worker taps **Check in**. The phone sends its GPS position and the server checks it's inside the mine's circle.
- Weak GPS (worse than ±200 m) is rejected.
- No signal? The check-in is saved on the phone and uploaded later. It gets marked "uploaded later".
- A supervisor can **mark someone present by hand** (for example, their phone died), with a reason. It's clearly labelled as manual, only works for people below them, and can be undone the same day.
- Days roll over at midnight India time.

### SOS and escalation
- Anyone can press **SOS**. Supervisors, officers and the mine manager at that mine get notified.
- A supervisor (or higher) can **escalate** an incident or SOS to any level above them. The app shows exactly who will be notified, with **Call** and **SMS** buttons for each person.
- The person receiving it presses **Acknowledge**, and the sender is told.
- For severe cases the server tries an **automatic voice call**. No phone provider is connected yet, so for now it tells you to call manually. To add one, edit `server/src/services/voiceAlerts.ts`.

### Inspections
1. An admin assigns an inspection to a person, with a due date.
2. That person marks it **Done** (needs at least one photo) or **Not done** (needs a reason). The phone's location is attached if available.
3. Anyone above them at that mine approves it or sends it back. One approval is enough.

Photos are shrunk on the phone, then saved in `server/uploads/`.

### Audit log
Important actions (reports, SOS, escalations, inspections…) are written into a chain where each entry holds a hash of the one before it. If someone edits an old record in the database, the chain breaks and the **Audit log** page shows it.

---

## Where things live

```
client/                 React + Vite + Tailwind frontend
  src/pages/            one file per screen
  src/pages/RoleDashboards.tsx  picks the home screen for each role
  src/components/       shared pieces (navbar, check-in card, modals…)
  src/navigation.ts     menu items and which roles can see them
  src/roles.ts          role order and labels
  src/services/api.ts   every call to the backend

server/                 Express + Prisma backend
  prisma/schema.prisma  all database tables
  prisma/seed.ts        demo data
  src/index.ts          starts the server, mounts all routes
  src/routes/           one file per feature (attendance, sos, inspections…)
  src/routes/dashboardRoutes.ts  numbers for the role home screens and the risk score
  src/middleware/auth.ts  login check, role checks, "own mine only" rules
  src/services/         audit chain, photo storage, voice calls
```

**Data storage:**
- **Database:** one SQLite file, `server/prisma/dev.db`.
- **Photos:** `server/uploads/`.
- Both stay on your laptop and are **not in git**.
- To browse the database, run `npx prisma studio` in `server/`.

---

## Common problems

**"Request failed (404)" or a feature seems missing.** Your backend is running old code. Stop it (Ctrl+C) and run `npm run dev` again.

**"The database is busy" or the server logs a timeout.** Something else has `dev.db` open with unsaved changes, usually DB Browser for SQLite. Save or close it.

**Check-in on a phone does nothing.** Phones only allow GPS on `https`. Opening your laptop's IP over Wi-Fi won't work. Use a tunnel such as `npx cloudflared tunnel --url http://localhost:5173`, and add that URL to the Google client's allowed origins, or sign-in fails.

**"You are X km from the mine."** You're outside the circle. Move the mine's pin in **Admin → Mines**, or set `ATTENDANCE_RADIUS_OVERRIDE_M` while testing.

---

## Not finished yet

- **Automatic voice calls:** the code path exists, but no phone provider is connected.
- **Health monitoring page:** a static mock-up with no real data.
- **Some compliance numbers:** the monthly trend and average response time are placeholder values.
- **Fake-GPS apps can fool check-in.** Proper protection needs a native app.
- **Photos and the database are only on the machine running the server.** Hosting it online means moving photos to cloud storage (only `server/src/services/photoStorage.ts` changes) and using a real database.
