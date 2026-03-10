# Database Access Guide

## Overview
This guide explains how to access and inspect the PostgreSQL database used by the ProofEstate backend.

## Database Connection Details
- **Host**: localhost
- **Port**: 5432
- **Database**: proofestate_db
- **Username**: postgres
- **Password**: password123

## Connection Methods

### 1. Using psql (Command Line)
```bash
# Connect to the database
psql -h localhost -p 5432 -U postgres -d proofestate_db

# Or using connection string
psql "postgresql://postgres:password123@localhost:5432/proofestate_db"
```

### 2. Using pgAdmin (GUI)
1. Install pgAdmin from https://www.pgadmin.org/
2. Create a new server connection:
   - Name: ProofEstate Local
   - Host: localhost
   - Port: 5432
   - Database: proofestate_db
   - Username: postgres
   - Password: password123

### 3. Using DBeaver (Universal Database Tool)
1. Install DBeaver from https://dbeaver.io/
2. Create new PostgreSQL connection with the above details

## Database Schema

### Main Tables

#### 1. `properties` - Core property data
```sql
-- View all properties
SELECT * FROM properties ORDER BY created_at DESC;

-- View properties by status
SELECT id, name, status, asset_value_inr, created_at 
FROM properties 
WHERE status = 'verified' 
ORDER BY created_at DESC;
```

#### 2. `users` - User profiles
```sql
-- View all users
SELECT * FROM users ORDER BY created_at DESC;

-- View users by role
SELECT wallet, name, role, created_at 
FROM users 
WHERE role = 'owner';
```

#### 3. `rent_distributions` - Real rent payment records
```sql
-- View rent distributions
SELECT rd.*, p.name as property_name
FROM rent_distributions rd
JOIN properties p ON rd.property_id = p.id
ORDER BY rd.distribution_date DESC;
```

#### 4. `token_holdings` - Real token ownership
```sql
-- View token holdings
SELECT th.*, p.name as property_name
FROM token_holdings th
JOIN properties p ON th.property_id = p.id
WHERE th.token_amount > 0
ORDER BY th.token_amount DESC;
```

## Useful Queries

### Property Analysis
```sql
-- Properties by status count
SELECT status, COUNT(*) as count, 
       AVG(asset_value_inr) as avg_value
FROM properties 
GROUP BY status;

-- Property value distribution
SELECT 
    CASE 
        WHEN asset_value_inr < 10000000 THEN 'Under 1CR'
        WHEN asset_value_inr < 50000000 THEN '1-5CR'
        WHEN asset_value_inr < 100000000 THEN '5-10CR'
        ELSE 'Over 10CR'
    END as value_range,
    COUNT(*) as count
FROM properties
GROUP BY value_range;
```

### Token Economics
```sql
-- Total tokens issued per property
SELECT p.name, p.token_supply, 
       COALESCE(SUM(th.token_amount), 0) as tokens_held,
       p.token_supply - COALESCE(SUM(th.token_amount), 0) as tokens_available
FROM properties p
LEFT JOIN token_holdings th ON p.id = th.property_id
WHERE p.status = 'tokenized'
GROUP BY p.id, p.name, p.token_supply;
```

### Rent Distribution Analysis
```sql
-- Total rent distributed per property
SELECT p.name, 
       COUNT(rd.id) as distribution_count,
       SUM(rd.total_amount_usdc) as total_rent_distributed,
       AVG(rd.rate_per_token) as avg_rate_per_token
FROM properties p
LEFT JOIN rent_distributions rd ON p.id = rd.property_id
GROUP BY p.id, p.name
ORDER BY total_rent_distributed DESC NULLS LAST;
```

## Database Backup & Restore

### Create Backup
```bash
pg_dump -h localhost -p 5432 -U postgres -d proofestate_db > backup.sql
```

### Restore from Backup
```bash
psql -h localhost -p 5432 -U postgres -d proofestate_db < backup.sql
```

## Environment Variables
The backend reads database connection details from `.env`:
```
DATABASE_URL=postgresql://postgres:password123@localhost:5432/proofestate_db
```

## Troubleshooting

### Connection Issues
1. Ensure PostgreSQL is running: `systemctl status postgresql` (Linux) or check services (Windows)
2. Check if port 5432 is open: `netstat -an | grep 5432`
3. Verify credentials in `.env` file

### Permission Issues
```sql
-- Grant permissions if needed
GRANT ALL PRIVILEGES ON DATABASE proofestate_db TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

## Development Commands

### Reset Database (Caution: Deletes all data)
```sql
-- Drop all tables
DROP TABLE IF EXISTS token_holdings CASCADE;
DROP TABLE IF EXISTS rent_distributions CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### View Table Structures
```sql
-- List all tables
\dt

-- Describe a table
\d properties

-- View table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public';
```