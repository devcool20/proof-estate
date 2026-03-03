# Development Guide: ProofEstate

This guide outlines how to set up the full ProofEstate stack locally for development and testing.

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- **Docker Desktop** (for PostgreSQL)
- **Rust** (`rustup`) & **Cargo** (for the backend)
- **Node.js** (v18+) & **NPM/PNPM** (for the frontend)
- **Solana CLI** & **Anchor CLI** (optional, for contract development)

---

## 1. Local Database (PostgreSQL)

ProofEstate uses a PostgreSQL database for caching property metadata and tracking verification logs.

### Start PostgreSQL
```bash
docker compose up -d postgres
```
This command starts a Postgres container and auto-initializes the schema from `backend/migrations/001_init.sql`.

---

## 2. Backend API (Rust/Axum)

The backend is built in Rust to handle high-performance SHA-256 hashing and Solana signature automation.

### Configure Environment
Copy the example environment file:
```bash
copy backend\.env.example backend\.env
```
Ensure `DATABASE_URL` is set correctly:
`DATABASE_URL=postgres://postgres:password@localhost:5432/proofestate`

### Start the Backend
```bash
cd backend
cargo run
```
The server will start at `http://localhost:3001`.

---

## 3. Frontend Dashboard (Next.js)

The frontend is a unified dashboard built with Next.js, Radix UI, and Tailwind CSS.

### Install Dependencies
```bash
cd frontend
npm install
```

### Start Dev Mode
```bash
npm run dev
```
The dashboard will be available at `http://localhost:3000`.

---

## 🧪 Testing the Flow

1. **Submit Asset:** Go to the "Submit Asset" page and fill in the registry details. This hashes the property metadata and initializes the PDA on Solana.
2. **Verify (Admin):** Switch to the "Verifier" tab (Dashboard -> Verifier). Review the submission and click **Approve**. This executes the `verify_property` instruction on-chain.
3. **Tokenize:** Once verified, go to "My Properties" and you will see a "Tokenize this Asset" button. Click it, connect your Phantom/Solflare wallet, and confirm the minting transaction to create SPL tokens on Solana.

---

## 🏗️ Tech Stack

- **Blockchain:** Solana (Anchor, SPL Token-2022)
- **Backend:** Axum (Rust), SQLx (PostgreSQL), Serde, Tower-HTTP (CORS)
- **Frontend:** Next.js, React, Tailwind CSS, Lucide Icons, Solana Wallet Adapter
- **DevOps:** Docker Compose

---
*Questions? Contact the core development team.*
