# Life RPG v1

Scalable rewrite of the Life RPG prototype. The old v0.4 application stays independent and serves as a UX reference while v1 is developed.

## Stack

- Next.js 16 App Router + TypeScript
- React 19
- Supabase Auth, Postgres, RLS and Realtime
- Vercel

## Current vertical slice

1. Register/login with email + password.
2. Server-side session validation via Supabase SSR and `auth.getClaims()`.
3. Authenticated user can create branches and quests.
4. Quest progress is updated through database RPC.
5. Quest completion/reopen uses row locking and an XP ledger trigger in the same Postgres transaction.
6. Realtime Postgres Changes refresh other active clients automatically; there is no manual Sync button in v1.
7. Every user-owned table is protected by RLS.

## Data model

The v1 source of truth is normalized Postgres data, not one user JSON document.

Core entities:

- `profiles`
- `branches`
- `arcs`
- `progression_nodes` / `progression_edges`
- `quests` / `quest_steps`
- `daily_templates` / `daily_instances`
- `challenges`
- `xp_ledger`
- `trusted_sessions`
- `security_events`

## Security invariants

- Never expose a Supabase secret/service-role key to the browser.
- Authorization is based on `auth.uid()` + RLS, never `user_metadata`.
- User-owned foreign keys include `user_id` to prevent cross-user references.
- XP is not directly writable from the client.
- Quest status transition and XP ledger insertion are atomic in Postgres.
- Repeating a completion does not award XP twice.
- Sensitive server pages validate claims, not an unverified browser session object.
- Schema changes belong in versioned migrations.

## Realtime

The first development slice uses RLS-protected Postgres Changes. Before broad public scale, migrate high-volume synchronization to private Realtime Broadcast channels with database-triggered broadcasts.

## Planned auth/security layers

- OAuth providers (Google first, then Telegram/Yandex/VK where supported)
- TOTP MFA / AAL2 for sensitive actions
- trusted-device/session management
- security event log
- risk-based login decisions (new device, impossible travel, abnormal geography)
- CAPTCHA/rate limiting for abuse-prone auth flows
- production SMTP

## Environment

Copy `.env.example` and provide only public Supabase client values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not commit secret keys.
