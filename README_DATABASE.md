# ProofEstate Database Access & Analysis

This guide provides comprehensive instructions for accessing, inspecting, and analyzing the ProofEstate database.

## Quick Start

### 1. Install Database Dependencies
```bash
npm install
```

### 2. Run Database Inspector
```bash
npm run inspect
```

This launches an interactive CLI tool that lets you:
- View all properties and their status
- Inspect token holdings and rent distributions  
- Analyze on-chain vs database correlations
- Run custom SQL queries

### 3. Direct Database Access
```bash
# Connect via psql
npm run db:connect

# Check database status
npm run db:status

# Create backup
npm run db:backup
```

## Database Schema Overview

### Core Tables

#### `properties` - Main property records
- **id**: UUID primary key
- **name**: Property name/title
- **address**: Physical address
- **status**: `pending_verification` | `verified` | `pending_tokenization` | `tokenized` | `rejected`
- **asset_value_inr**: Property value in Indian Rupees
- **on_chain_address**: Solana program-derived address (PDA)
- **token_mint**: SPL token mint address
- **token_supply**: Total tokens issued
- **metadata_hash**: IPFS/Arweave hash of property documents

#### `users` - User profiles
- **wallet**: Clerk user ID or Solana wallet address
- **name**: User's name
- **role**: `owner` | `investor` | `verifier` | `admin`
- **email**: Contact email

#### `token_holdings` - Real token ownership tracking
- **property_id**: Reference to properties table
- **holder_wallet**: Token holder's wallet address
- **token_amount**: Number of tokens held
- **last_updated**: Timestamp of last update

#### `rent_distributions` - Rental income payments
- **property_id**: Reference to properties table
- **distribution_date**: When rent was distributed
- **total_amount_usdc**: Total USDC distributed
- **rate_per_token**: USDC per token ratio
- **tx_signature**: Solana transaction signature

## On-Chain vs Database Correlation

### Understanding the Flow

1. **Property Submission** (`pending_verification`)
   - Owner submits property via frontend
   - Data stored in database only
   - No on-chain presence yet

2. **Verification** (`verified`)
   - Admin reviews and approves property
   - Still database-only
   - Ready for tokenization

3. **Tokenization Request** (`pending_tokenization`)
   - Owner requests tokenization
   - Token parameters set in database
   - Awaiting admin approval

4. **On-Chain Deployment** (`tokenized`)
   - Solana program creates token mint
   - Property gets on-chain address (PDA)
   - Database updated with blockchain references

### Checking Correlation

Use the correlation analysis endpoint:
```bash
curl http://localhost:3001/api/v1/admin/correlation_analysis
```

Or use the interactive inspector:
```bash
npm run inspect
# Select option 6: "Show on-chain vs database correlation"
```

### Common Issues & Solutions

#### ❌ Status shows "tokenized" but missing on-chain data
**Problem**: Database status is "tokenized" but `on_chain_address` or `token_mint` is null
**Solution**: Re-run tokenization process or update database manually

#### ⚠️ Tokenized but no token holders
**Problem**: On-chain deployment successful but no records in `token_holdings`
**Solution**: Tokens may not be distributed yet, or tracking needs to be updated

#### 🔄 Token supply mismatch
**Problem**: `token_supply` in database doesn't match on-chain mint supply
**Solution**: Verify on-chain data and update database

## Verification Commands

### Check On-Chain Data
```bash
# Using Solana CLI (requires solana-cli installation)
solana account <token_mint_address> --url devnet

# Using web explorer
# Visit: https://explorer.solana.com/address/<token_mint_address>?cluster=devnet
```

### Database Queries for Verification

```sql
-- Properties with inconsistent tokenization status
SELECT id, name, status, on_chain_address, token_mint
FROM properties 
WHERE status = 'tokenized' 
  AND (on_chain_address IS NULL OR token_mint IS NULL);

-- Token distribution analysis
SELECT p.name, p.token_supply, 
       COALESCE(SUM(th.token_amount), 0) as distributed_tokens,
       p.token_supply - COALESCE(SUM(th.token_amount), 0) as remaining_tokens
FROM properties p
LEFT JOIN token_holdings th ON p.id = th.property_id
WHERE p.status = 'tokenized'
GROUP BY p.id, p.name, p.token_supply;

-- Rent distribution summary
SELECT p.name, 
       COUNT(rd.id) as distributions,
       SUM(rd.total_amount_usdc) as total_rent,
       MAX(rd.distribution_date) as last_distribution
FROM properties p
LEFT JOIN rent_distributions rd ON p.id = rd.property_id
GROUP BY p.id, p.name
ORDER BY total_rent DESC NULLS LAST;
```

## Development & Testing

### Seed Test Data
```sql
-- Add test token holdings
INSERT INTO token_holdings (property_id, holder_wallet, token_amount)
VALUES 
  ((SELECT id FROM properties WHERE status = 'tokenized' LIMIT 1), 'test_wallet_1', 1000),
  ((SELECT id FROM properties WHERE status = 'tokenized' LIMIT 1), 'test_wallet_2', 500);

-- Add test rent distribution
INSERT INTO rent_distributions (property_id, total_amount_usdc, total_tokens_eligible, rate_per_token)
VALUES 
  ((SELECT id FROM properties WHERE status = 'tokenized' LIMIT 1), 1500.00, 1500, 1.00);
```

### Reset Database (Development Only)
```sql
-- WARNING: This deletes all data
TRUNCATE TABLE token_holdings CASCADE;
TRUNCATE TABLE rent_distributions CASCADE;
TRUNCATE TABLE properties CASCADE;
TRUNCATE TABLE users CASCADE;
```

## API Endpoints for Database Data

### Real-time Data
- `GET /api/v1/properties/{id}/rent_distributions` - Property rent history
- `GET /api/v1/properties/{id}/token_holdings` - Token holder list
- `GET /api/v1/properties/{id}/claimable_rent/{wallet}` - User's claimable rent

### Admin Analysis
- `GET /api/v1/admin/correlation_analysis` - Full correlation analysis

### Example API Usage
```bash
# Get property rent distributions
curl http://localhost:3001/api/v1/properties/d1526e1e-8c27-4978-94d5-802e6b01216e/rent_distributions

# Get correlation analysis (admin)
curl http://localhost:3001/api/v1/admin/correlation_analysis
```

## Troubleshooting

### Database Connection Issues
1. **PostgreSQL not running**
   ```bash
   # Windows (if using PostgreSQL service)
   net start postgresql-x64-14
   
   # Or check if running
   netstat -an | findstr :5432
   ```

2. **Wrong credentials**
   - Check `.env` file in backend directory
   - Verify `DATABASE_URL` matches connection details

3. **Permission denied**
   ```sql
   -- Grant permissions
   GRANT ALL PRIVILEGES ON DATABASE proofestate_db TO postgres;
   ```

### Data Inconsistencies
1. **Use the correlation analysis** to identify issues
2. **Check Solana explorer** for on-chain verification
3. **Compare timestamps** between database and blockchain
4. **Verify transaction signatures** in rent_distributions table

## Security Notes

- Database contains sensitive property information
- Never expose database credentials in frontend code
- Use environment variables for all connection details
- Regular backups are recommended for production
- Consider read-only access for analytics users

## Performance Monitoring

```sql
-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```