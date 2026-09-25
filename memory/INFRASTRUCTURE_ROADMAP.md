# JMA Infrastructure & Business Roadmap

> **Purpose**: Strategic planning document capturing the user's confirmed vision for taking Jelly of the Month Club Music Academy (JMA) from a frontend-only pilot to a hosted, monetized product used in schools, homes, and classrooms. This file persists across fork sessions.
>
> **Status**: Reference-only. Do NOT begin implementation of any item here until the user explicitly says "start building the backend" or "add payments." The user is currently in a **product polish / world-building phase** with real-teacher pilot ahead of any SaaS work.

---

## 🎯 Guiding Principles for Future Agents

1. **User does NOT want Emergent to host the production app.** They will self-host externally. *(Note: This is user preference, NOT a technical constraint. Emergent hosting does not add any branding/watermark to deployed apps — confirmed with Emergent support. If user ever reconsiders, hosting cost is ~50 credits/month with full custom-domain and no-attribution branding.)*
2. **The user owns the code.** Every piece we build is portable.
3. **Do not introduce backend/auth/payment code until user gives explicit go-ahead.** They want to playtest the frontend-only version with real teachers first.
4. **All child-facing UX must remain COPPA/FERPA-friendly by design.** No PII beyond first name + last initial. Teachers own accounts; kids log in via class code.
5. **Kids pay nothing directly. Ever.** Payment flows are for parents, teachers, schools, and districts only.

---

## 🏗️ The Confirmed Target Architecture

Three separable layers. Each can be hosted independently.

```
    ┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
    │   GitHub Pages      │  ──►    │      Railway         │  ──►    │   MongoDB Atlas     │
    │   (Frontend)        │  HTTPS  │      (Backend API)   │         │   (Database)        │
    │   yoursite.github.io│         │  api.yoursite.com    │         │   cloud.mongodb.com │
    │   FREE              │         │  ~$5/mo              │         │   FREE (512MB)      │
    └─────────────────────┘         └──────────────────────┘         └─────────────────────┘
```

### Layer 1 — Frontend
- **Where**: GitHub Pages (user's choice; already set up with HashRouter + relative asset paths)
- **Migration alternative**: Vercel/Netlify if clean URLs are needed later — a 5-minute swap since code is portable
- **DO NOT**: swap away from `HashRouter`, use absolute asset paths, or introduce SSR

### Layer 2 — Backend
- **Where**: Railway (~$5/mo)
- **Stack**: FastAPI (Python), matches Emergent conventions
- **Endpoints (planned, not built)**:
  - `POST /api/auth/signup` — Teacher creates account
  - `POST /api/auth/login` — Teacher or student logs in
  - `POST /api/auth/join-classroom` — Student joins with class code (e.g., `PIANO-42`)
  - `POST /api/classrooms` — Teacher creates a class
  - `POST /api/classrooms/:id/students` — Add students
  - `POST /api/scores` — Save game score
  - `GET /api/students/:id/report-card` — Fetch progress
  - `GET /api/teacher/dashboard` — Classroom overview
  - `POST /api/stripe/webhook` — Handle Stripe events
- **Auth**: JWT tokens (not session cookies — required because frontend and backend are on different domains)
- **CORS**: whitelist the GitHub Pages domain

### Layer 3 — Database
- **Where**: MongoDB Atlas (free tier: 512MB, ~10,000 students headroom)
- **Collections planned**:
  - `users` (teachers + admins)
  - `students` (owned by a teacher, no email/PII beyond first name + last initial)
  - `classrooms` (class code, teacher_id, student_ids[], settings)
  - `scores` (student_id, game_id, score, timestamp, achievements[])
  - `subscriptions` (owner_id, tier, stripe_customer_id, status, expires_at)

---

## 💳 Payment Strategy

### Buyer Types (each pays differently)

| Buyer | How they pay | Ticket size | Flow |
|---|---|---|---|
| Parent (home) | Credit card, monthly/annual | $5–15/mo | Self-serve Stripe Checkout |
| Teacher (one classroom) | Credit card | $10–30/mo | Self-serve Stripe Checkout |
| School / District | Purchase Order (PO), net-30 invoice | $500–5,000/yr | Manual invoice via Stripe Invoicing, W-9 provided |

### Payment Provider
- **Stripe** (confirmed choice; already an Emergent-supported integration with test keys available)
- Handles: credit cards, subscriptions, free trials, coupons, invoices with net-30 terms, tax (via Stripe Tax), refunds
- Skip: PayPal, Square, Braintree

### Pricing Model (leaning direction — not final)
**Model A: Freemium + Family/Teacher tier** is the user's likely direction.
```
🆓 Free              — 3 games unlocked, no report card, no sticker book
🎵 Home ($7.99/mo)   — All games, full progression, 1 child profile
👨‍👩‍👧 Family ($12.99/mo) — Up to 4 child profiles, parent dashboard
🧑‍🏫 Teacher ($19.99/mo) — Full classroom (up to 30 students), report cards
🏫 School (custom)   — Contact us, per-classroom pricing
```
Final pricing to be locked when Week 5 of the build begins.

### Non-negotiables for Education Payments
- 14-day (min) or 30-day (preferred) free trial for teachers
- Refunds within 14 days
- Data export on cancellation (some states require it)
- Sales tax handled by Stripe Tax
- Non-profit / Title I discount codes available
- Consider public "Free for Title I schools" commitment

---

## 📅 The Build Sequence (When User Gives Go-Ahead)

**DO NOT begin this without explicit user approval.**

| Week | Focus | Notes |
|---|---|---|
| 1 | Backend + MongoDB Atlas setup | User signs up for Railway + Atlas, agent wires FastAPI |
| 2 | Auth screens on frontend | Signup, Login, Class-code join — behind `/teacher-portal` route so kid experience is untouched |
| 3 | Teacher dashboard | Classroom rosters, student progress, report card views |
| 4 | Wire `playerStorage.js` → API | Preserve guest/localStorage mode; migrate progress on login |
| 5 | Stripe integration | Checkout, subscriptions, webhook handling |
| 6 | Paywall gating in the app | Free tier vs Pro tier logic |
| 7 | Admin invoice tools | Manual school PO handling |
| 8 | Polish + first paying teacher onboarding | |

Total: **~6–8 weeks of build time** to full monetized product.

---

## 🛡️ Compliance & Safety Landmines

The moment student names touch a database, we are in kids' privacy law territory in the US.

- **COPPA** (Children's Online Privacy Protection Act) — Under 13
- **FERPA** (Family Educational Rights and Privacy Act) — School records
- **State laws** — CA, NY, IL have additional requirements

Design decisions to bake in from day one:
- Teachers own the accounts, not kids
- Kids log in with **class code + first name only** (no email, no password)
- No PII beyond first name + last initial
- Data deletable on request within 30 days
- No third-party analytics tracking kids (no Google Analytics on kid pages)
- Privacy policy + Terms of Service required before launch
- Data export on account closure

**Bake these into the schema itself so violations are structurally impossible.**

---

## 💰 Running Cost Estimate (After Backend Launch)

At 5 teachers + 100 students:

| Item | Cost |
|---|---|
| GitHub Pages | Free |
| Railway backend | ~$5/month |
| MongoDB Atlas | Free (well within 512MB) |
| Domain (optional) | ~$1/month |
| Stripe fees | 2.9% + $0.30 per transaction |
| **Fixed monthly** | **~$5–6** |

Scales to ~500 students before any tier bumps needed.

---

## 🚫 Explicitly Deferred / Do NOT Build

Until user signals otherwise, the following are **out of scope**:

- Any backend code (`/app/backend` should remain minimal / unused unless user says otherwise)
- User authentication of any kind
- Database persistence beyond `localStorage`
- Any Stripe integration
- Native mobile apps (iOS/Android)
- AWS anything (unless a district's IT demands it later)
- Real-time multiplayer / websockets
- Any analytics on kid-facing pages

---

## 🎯 Where We Are Right Now (as of this document)

- **Phase**: Product polish + world-building
- **Immediate priorities**: Homepage revamp ("lobby" feel), copy/rename pass (Sticker Book → Trophy Hall, etc.), Session Summary polish, Report Card polish, mobile rough edges
- **Do NOT**: Start any of the infrastructure work above until user says "start building the backend"

---

## 📎 Source Conversation

This roadmap was built from a strategic planning conversation. Key decisions the user confirmed:
1. Will self-host outside Emergent
2. GitHub Pages for frontend (current setup preserved)
3. Railway + MongoDB Atlas is the target backend stack
4. Stripe for payments
5. Wants to polish + playtest before building backend
6. Wants payment support for parents, teachers, AND schools/districts (PO/invoice)

If future planning conversations happen, **append to this file** rather than creating parallel docs.
