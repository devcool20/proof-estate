#!/usr/bin/env node

/**
 * Database Inspection Script for ProofEstate
 * 
 * This script connects to the PostgreSQL database and provides
 * an interactive way to inspect the data and see correlations
 * between on-chain and database records.
 * 
 * Usage: node inspect_database.js
 */

const { Client } = require('pg');
const readline = require('readline');

// Database connection
const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'proofestate_db',
    user: 'postgres',
    password: 'password123'
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function connectDB() {
    try {
        await client.connect();
        console.log('✅ Connected to ProofEstate database');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\n📝 Make sure PostgreSQL is running and credentials are correct.');
        console.log('   Check DATABASE_ACCESS.md for connection details.');
        return false;
    }
}

async function showMenu() {
    console.log('\n🏠 ProofEstate Database Inspector');
    console.log('================================');
    console.log('1. View all properties');
    console.log('2. View properties by status');
    console.log('3. View users');
    console.log('4. View token holdings');
    console.log('5. View rent distributions');
    console.log('6. Show on-chain vs database correlation');
    console.log('7. Property analytics');
    console.log('8. Run custom SQL query');
    console.log('9. Exit');
    console.log('================================');
}

async function viewProperties() {
    try {
        const result = await client.query(`
            SELECT id, name, address, property_type, status, 
                   asset_value_inr, token_mint, on_chain_address,
                   created_at
            FROM properties 
            ORDER BY created_at DESC
        `);
        
        console.log('\n📊 Properties Overview:');
        console.table(result.rows.map(row => ({
            ID: row.id.substring(0, 8) + '...',
            Name: row.name.substring(0, 30),
            Status: row.status,
            Type: row.property_type,
            Value: `₹${(row.asset_value_inr / 10000000).toFixed(1)}CR`,
            'Token Mint': row.token_mint ? row.token_mint.substring(0, 8) + '...' : 'None',
            'On-Chain': row.on_chain_address ? 'Yes' : 'No'
        })));
        
        console.log(`\nTotal properties: ${result.rows.length}`);
    } catch (error) {
        console.error('Error fetching properties:', error.message);
    }
}

async function viewPropertiesByStatus() {
    try {
        const result = await client.query(`
            SELECT status, COUNT(*) as count,
                   AVG(asset_value_inr) as avg_value
            FROM properties 
            GROUP BY status
            ORDER BY count DESC
        `);
        
        console.log('\n📈 Properties by Status:');
        console.table(result.rows.map(row => ({
            Status: row.status,
            Count: row.count,
            'Avg Value (CR)': row.avg_value ? `₹${(row.avg_value / 10000000).toFixed(1)}CR` : 'N/A'
        })));
    } catch (error) {
        console.error('Error fetching property stats:', error.message);
    }
}

async function viewUsers() {
    try {
        const result = await client.query(`
            SELECT wallet, name, role, email, created_at
            FROM users 
            ORDER BY created_at DESC
        `);
        
        console.log('\n👥 Users:');
        console.table(result.rows.map(row => ({
            Wallet: row.wallet.substring(0, 20) + '...',
            Name: row.name || 'N/A',
            Role: row.role,
            Email: row.email || 'N/A',
            Created: new Date(row.created_at).toLocaleDateString()
        })));
        
        console.log(`\nTotal users: ${result.rows.length}`);
    } catch (error) {
        console.error('Error fetching users:', error.message);
    }
}

async function viewTokenHoldings() {
    try {
        const result = await client.query(`
            SELECT th.holder_wallet, th.token_amount, th.last_updated,
                   p.name as property_name, p.token_mint
            FROM token_holdings th
            JOIN properties p ON th.property_id = p.id
            WHERE th.token_amount > 0
            ORDER BY th.token_amount DESC
        `);
        
        console.log('\n🪙 Token Holdings:');
        if (result.rows.length === 0) {
            console.log('No token holdings found. Tokens are created when properties are tokenized.');
        } else {
            console.table(result.rows.map(row => ({
                Property: row.property_name.substring(0, 30),
                Holder: row.holder_wallet.substring(0, 20) + '...',
                Tokens: row.token_amount.toLocaleString(),
                'Token Mint': row.token_mint ? row.token_mint.substring(0, 8) + '...' : 'N/A',
                Updated: new Date(row.last_updated).toLocaleDateString()
            })));
        }
        
        console.log(`\nTotal holdings: ${result.rows.length}`);
    } catch (error) {
        console.error('Error fetching token holdings:', error.message);
    }
}

async function viewRentDistributions() {
    try {
        const result = await client.query(`
            SELECT rd.total_amount_usdc, rd.rate_per_token, rd.distribution_date,
                   rd.tx_signature, p.name as property_name
            FROM rent_distributions rd
            JOIN properties p ON rd.property_id = p.id
            ORDER BY rd.distribution_date DESC
        `);
        
        console.log('\n💰 Rent Distributions:');
        if (result.rows.length === 0) {
            console.log('No rent distributions found. These are created when property owners distribute rental income.');
        } else {
            console.table(result.rows.map(row => ({
                Property: row.property_name.substring(0, 30),
                'Amount (USDC)': `$${row.total_amount_usdc}`,
                'Rate/Token': `$${row.rate_per_token}`,
                Date: new Date(row.distribution_date).toLocaleDateString(),
                'TX Signature': row.tx_signature ? row.tx_signature.substring(0, 8) + '...' : 'N/A'
            })));
        }
        
        console.log(`\nTotal distributions: ${result.rows.length}`);
    } catch (error) {
        console.error('Error fetching rent distributions:', error.message);
    }
}

async function showCorrelation() {
    try {
        const result = await client.query(`
            SELECT 
                p.id,
                p.name,
                p.status,
                p.on_chain_address,
                p.token_mint,
                p.metadata_hash,
                COALESCE(th.total_tokens_held, 0) as tokens_held,
                COALESCE(rd.total_distributions, 0) as rent_distributions,
                COALESCE(rd.total_rent_paid, 0) as total_rent_paid
            FROM properties p
            LEFT JOIN (
                SELECT property_id, 
                       SUM(token_amount) as total_tokens_held,
                       COUNT(*) as holders
                FROM token_holdings 
                WHERE token_amount > 0
                GROUP BY property_id
            ) th ON p.id = th.property_id
            LEFT JOIN (
                SELECT property_id,
                       COUNT(*) as total_distributions,
                       SUM(total_amount_usdc) as total_rent_paid
                FROM rent_distributions
                GROUP BY property_id
            ) rd ON p.id = rd.property_id
            ORDER BY p.created_at DESC
        `);
        
        console.log('\n🔗 On-Chain vs Database Correlation:');
        console.log('=====================================');
        
        result.rows.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.name}`);
            console.log(`   Status: ${row.status}`);
            console.log(`   Database ID: ${row.id}`);
            console.log(`   On-Chain Address: ${row.on_chain_address || 'Not deployed'}`);
            console.log(`   Token Mint: ${row.token_mint || 'Not tokenized'}`);
            console.log(`   Metadata Hash: ${row.metadata_hash || 'Not set'}`);
            console.log(`   Tokens Held: ${row.tokens_held.toLocaleString()}`);
            console.log(`   Rent Distributions: ${row.rent_distributions}`);
            console.log(`   Total Rent Paid: $${row.total_rent_paid || 0}`);
            
            // Analysis
            const hasOnChain = row.on_chain_address && row.token_mint;
            const hasTokens = row.tokens_held > 0;
            const hasRent = row.rent_distributions > 0;
            
            console.log(`   🔍 Analysis:`);
            if (hasOnChain && hasTokens) {
                console.log(`      ✅ Properly tokenized with active holders`);
            } else if (hasOnChain && !hasTokens) {
                console.log(`      ⚠️  Tokenized but no token holders recorded`);
            } else if (!hasOnChain && row.status === 'tokenized') {
                console.log(`      ❌ Status shows tokenized but missing on-chain data`);
            } else {
                console.log(`      ℹ️  Not yet tokenized (status: ${row.status})`);
            }
            
            if (hasRent) {
                console.log(`      💰 Has rent distribution history`);
            }
        });
        
        // Summary
        const tokenizedCount = result.rows.filter(r => r.on_chain_address).length;
        const withTokensCount = result.rows.filter(r => r.tokens_held > 0).length;
        const withRentCount = result.rows.filter(r => r.rent_distributions > 0).length;
        
        console.log('\n📊 Summary:');
        console.log(`   Total Properties: ${result.rows.length}`);
        console.log(`   On-Chain Deployed: ${tokenizedCount}`);
        console.log(`   With Token Holders: ${withTokensCount}`);
        console.log(`   With Rent History: ${withRentCount}`);
        
    } catch (error) {
        console.error('Error showing correlation:', error.message);
    }
}

async function propertyAnalytics() {
    try {
        console.log('\n📈 Property Analytics:');
        console.log('=====================');
        
        // Value distribution
        const valueResult = await client.query(`
            SELECT 
                CASE 
                    WHEN asset_value_inr < 10000000 THEN 'Under ₹1CR'
                    WHEN asset_value_inr < 50000000 THEN '₹1-5CR'
                    WHEN asset_value_inr < 100000000 THEN '₹5-10CR'
                    ELSE 'Over ₹10CR'
                END as value_range,
                COUNT(*) as count,
                AVG(asset_value_inr) as avg_value
            FROM properties
            WHERE asset_value_inr IS NOT NULL
            GROUP BY value_range
            ORDER BY avg_value
        `);
        
        console.log('\n💰 Value Distribution:');
        console.table(valueResult.rows);
        
        // Property types
        const typeResult = await client.query(`
            SELECT property_type, COUNT(*) as count,
                   AVG(asset_value_inr) as avg_value
            FROM properties 
            WHERE property_type IS NOT NULL
            GROUP BY property_type
            ORDER BY count DESC
        `);
        
        console.log('\n🏢 Property Types:');
        console.table(typeResult.rows.map(row => ({
            Type: row.property_type,
            Count: row.count,
            'Avg Value (CR)': row.avg_value ? `₹${(row.avg_value / 10000000).toFixed(1)}CR` : 'N/A'
        })));
        
        // Status progression
        const statusResult = await client.query(`
            SELECT status, COUNT(*) as count,
                   ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM properties), 1) as percentage
            FROM properties
            GROUP BY status
            ORDER BY count DESC
        `);
        
        console.log('\n📊 Status Distribution:');
        console.table(statusResult.rows.map(row => ({
            Status: row.status,
            Count: row.count,
            Percentage: `${row.percentage}%`
        })));
        
    } catch (error) {
        console.error('Error generating analytics:', error.message);
    }
}

async function runCustomQuery() {
    return new Promise((resolve) => {
        rl.question('\n💻 Enter SQL query: ', async (query) => {
            try {
                const result = await client.query(query);
                
                if (result.rows.length === 0) {
                    console.log('No results returned.');
                } else {
                    console.log(`\n📋 Query Results (${result.rows.length} rows):`);
                    console.table(result.rows);
                }
            } catch (error) {
                console.error('Query error:', error.message);
            }
            resolve();
        });
    });
}

async function main() {
    console.log('🏠 ProofEstate Database Inspector');
    console.log('=================================');
    
    const connected = await connectDB();
    if (!connected) {
        process.exit(1);
    }
    
    while (true) {
        await showMenu();
        
        const choice = await new Promise((resolve) => {
            rl.question('\nSelect option (1-9): ', resolve);
        });
        
        switch (choice) {
            case '1':
                await viewProperties();
                break;
            case '2':
                await viewPropertiesByStatus();
                break;
            case '3':
                await viewUsers();
                break;
            case '4':
                await viewTokenHoldings();
                break;
            case '5':
                await viewRentDistributions();
                break;
            case '6':
                await showCorrelation();
                break;
            case '7':
                await propertyAnalytics();
                break;
            case '8':
                await runCustomQuery();
                break;
            case '9':
                console.log('\n👋 Goodbye!');
                await client.end();
                rl.close();
                process.exit(0);
            default:
                console.log('Invalid option. Please try again.');
        }
        
        await new Promise((resolve) => {
            rl.question('\nPress Enter to continue...', resolve);
        });
    }
}

// Handle cleanup
process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down...');
    await client.end();
    rl.close();
    process.exit(0);
});

if (require.main === module) {
    main().catch(console.error);
}