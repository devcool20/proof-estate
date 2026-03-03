-- ProofEstate Database Schema
-- Run: psql -U postgres -d proofestate -f 001_init.sql

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet      VARCHAR(64) UNIQUE NOT NULL,
    email       VARCHAR(255),
    name        VARCHAR(255),
    role        VARCHAR(20) NOT NULL DEFAULT 'owner', -- 'owner' | 'investor' | 'verifier' | 'admin'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_wallet        VARCHAR(64) NOT NULL REFERENCES users(wallet),
    name                VARCHAR(512) NOT NULL,
    address             TEXT NOT NULL,
    city                VARCHAR(128),
    state               VARCHAR(128),
    country             VARCHAR(128) DEFAULT 'India',
    area_sqft           INTEGER,
    property_type       VARCHAR(64), -- 'residential' | 'commercial' | 'land' | 'warehouse'
    asset_value_inr     BIGINT,      -- value in INR paise (avoids floats)
    document_url        TEXT,        -- IPFS or S3 URL of uploaded title deed
    metadata_hash       VARCHAR(128),-- SHA-256 of document bytes
    on_chain_address    VARCHAR(64), -- Solana PDA address once initialized
    token_mint          VARCHAR(64), -- Mint address once tokenized
    status              VARCHAR(32) NOT NULL DEFAULT 'draft',
    -- 'draft' → 'pending_verification' → 'verified' → 'tokenized'
    rejection_reason    TEXT,
    token_supply        BIGINT,
    token_price_usd     NUMERIC(18,6),
    yield_percent       NUMERIC(8,4),
    dist_frequency      VARCHAR(20) DEFAULT 'monthly', -- 'monthly' | 'quarterly' | 'annually'
    submitted_at        TIMESTAMPTZ,
    verified_at         TIMESTAMPTZ,
    tokenized_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL REFERENCES properties(id),
    actor_wallet    VARCHAR(64),
    action          VARCHAR(64) NOT NULL, -- 'submitted' | 'verified' | 'rejected' | 'tokenized'
    notes           TEXT,
    tx_signature    VARCHAR(128), -- Solana transaction sig when relevant
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS token_holdings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL REFERENCES properties(id),
    investor_wallet VARCHAR(64) NOT NULL,
    token_amount    BIGINT NOT NULL,
    purchase_price  NUMERIC(18,6),
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rent_distributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL REFERENCES properties(id),
    amount_usdc     NUMERIC(18,6) NOT NULL,
    tx_signature    VARCHAR(128),
    distributed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at on properties
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
