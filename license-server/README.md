# Server-Centric License Management System

Production-grade server-centric license server and administrative management dashboard for Chrome extensions.

## Core Features
- **Server-Centric License Verification**: All sensitive licensing checks reside on the Vercel backend (`/api/v1/license/*`).
- **Cryptographic High-Entropy Key Generator**: Formats keys as `XXXXX-XXXXX-XXXXX-XXXXX`.
- **Short-Lived Signed JWT Access Tokens**: 15-minute access tokens automatically refreshed via periodic background heartbeats.
- **Persistent Device UUID Identification**: Client extension generates a persistent UUID stored in `chrome.storage.local`.
- **72-Hour Offline Grace Period**: Allows offline usage for up to 72 hours before suspending licensed features until connection is restored.
- **Admin Dashboard**: Mobile-responsive Next.js interface with dark mode, search, statistics, device management, logs export (CSV/JSON), and key generation.

## Vercel Deployment Instructions

1. **Environment Variables**: Set the following variables in Vercel:
   - `DATABASE_URL` (PostgreSQL URI from Supabase, Neon, or Vercel Postgres)
   - `JWT_SECRET` (Random 32+ char string)
   - `ADMIN_SESSION_SECRET` (Random 32+ char string)
   - `ADMIN_INITIAL_EMAIL`
   - `ADMIN_INITIAL_PASSWORD`

2. **Deploy Commands**:
   ```bash
   npx prisma migrate deploy
   npx ts-node prisma/seed.ts
   npm run build
   ```
