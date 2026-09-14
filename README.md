# Rashd AI — Investor Demo App

A complete runnable Next.js demo app for Rashd AI.

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Demo notes

- Login/signup is demo-mode authentication. Any email/password works.
- Use **See Demo** on the landing page to enter instantly.
- Protected pages redirect to `/login` when no demo session exists.
- Sidebar includes logout, theme toggle, and real routes.
- Includes Dashboard, Transactions, Affordability Checker, Goals, Chat, and Reports.

## Optional live AI

The `/api/chat` route works in demo mode with canned responses. If you later connect a real AI provider, add your key in `.env.local` and update `app/api/chat/route.js`.
