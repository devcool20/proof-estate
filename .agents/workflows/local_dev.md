---
description: Start the full ProofEstate stack locally (DB + Backend + Frontend)
---

## Prerequisites
- Docker Desktop running
- Rust / Cargo installed (`rustup`)
- Node.js >= 18 installed
- Solana CLI and Anchor CLI installed (for contract work)

---

## Step 1: Start PostgreSQL
// turbo
```
docker compose up -d postgres
```
Wait ~5 sec for Postgres to be ready. The DB is auto-initialized from `backend/migrations/001_init.sql`.

## Step 2: Configure backend env
Copy the example env file and fill in real values:
```
copy backend\.env.example backend\.env
```
Minimum required change — ensure:
```
DATABASE_URL=postgres://postgres:password@localhost:5432/proofestate
```

## Step 3: Start the backend
// turbo
```
cd backend && cargo run
```
Backend will be at **http://localhost:8080**
- `GET  /api/health`                    — health check
- `GET  /api/v1/properties`             — list all properties
- `POST /api/v1/properties/submit`      — submit for verification
- `PATCH /api/v1/properties/:id/verify` — verifier approves/rejects
- `POST /api/v1/properties/:id/tokenize`— tokenize a verified property
- `GET  /api/v1/marketplace`            — list tokenized properties

## Step 4: Start the frontend
// turbo
```
cd frontend && npm run dev
```
Frontend will be at **http://localhost:3000**

## Step 5: Test the flow
1. Open **http://localhost:3000** — dashboard loads live property stats.
2. Click **Submit Asset** → fill in the form → submit → get property ID + hash back.
3. Use the PATCH endpoint (or an admin UI) to verify the property.
4. Go to **My Properties** → click **Tokenize this Asset** → fill in supply/price/yield → approve.
5. Property now shows **Tokenized** badge.

## Step 6: Deploy Anchor contracts to Devnet (when ready)
```
cd contracts && anchor deploy --provider.cluster devnet
```
Update `PROGRAM_ID` in `backend/.env` and update `NEXT_PUBLIC_PROGRAM_ID` in `frontend/.env.local`.
