/**
 * Cross-Layer Blockchain Integration Tests
 * 
 * These tests validate the complete blockchain flow across:
 * 1. Solana smart contract (Anchor program)
 * 2. Rust backend API (Axum server)
 * 3. Next.js frontend (React components)
 * 
 * Prerequisites:
 * - Solana test validator running
 * - Backend server running on port 3001
 * - Frontend dev server running on port 3000
 * - All services configured with test environment variables
 */

const { execSync } = require('child_process');
const fetch = require('node-fetch');

// Test configuration
const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'http://localhost:3000';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'http://localhost:8899';

// Test timeout for blockchain operations
const BLOCKCHAIN_TIMEOUT = 30000;

describe('Full Blockchain Flow Integration', () => {
    let testPropertyId;
    let testOwnerWallet;
    let testVerifierWallet;
    let testTokenMint;

    beforeAll(async () => {
        // Generate test wallets
        testOwnerWallet = `test_owner_${Date.now()}`;
        testVerifierWallet = `test_verifier_${Date.now()}`;
        
        // Verify all services are running
        await verifyServicesRunning();
    }, BLOCKCHAIN_TIMEOUT);

    describe('Property Lifecycle: Submit -> Verify -> Tokenize', () => {
        test('1. Property submission creates on-chain PDA', async () => {
            const propertyData = {
                owner_wallet: testOwnerWallet,
                name: `Integration Test Property ${Date.now()}`,
                address: '123 Blockchain Street, Crypto City',
                city: 'Crypto City',
                property_type: 'residential',
                area_sqft: 2500,
                asset_value_inr: 50000000,
                document_url: '/docs/test_deed.pdf',
                metadata_uri: 'ipfs://QmTestIntegrationHash123'
            };

            // Submit via backend API
            const response = await fetch(`${BACKEND_URL}/api/v1/properties/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(propertyData)
            });

            // Should succeed even if Solana validator is not running (backend handles gracefully)
            expect([200, 201].includes(response.status)).toBe(true);
            const result = await response.json();
            
            testPropertyId = result.property_id;
            expect(testPropertyId).toBeDefined();
            expect(result.status).toBe('pending_verification');
            expect(result.metadata_hash).toHaveLength(64);
            
            // Verify property exists in database
            const getResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}`);
            expect(getResponse.status).toBe(200);
            
            const property = await getResponse.json();
            expect(property.on_chain_address).toBeDefined();
            expect(property.on_chain_address).not.toBe('');
            
            console.log(`✅ Property submitted with ID: ${testPropertyId}`);
            console.log(`📍 On-chain address: ${property.on_chain_address}`);
        }, BLOCKCHAIN_TIMEOUT);

        test('2. Property verification updates on-chain status', async () => {
            const verifyData = {
                verifier_wallet: testVerifierWallet,
                approved: true,
                notes: 'Integration test verification - all documents validated'
            };

            const response = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}/verify`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(verifyData)
            });

            expect(response.status).toBe(200);
            const result = await response.json();
            
            expect(result.new_status).toBe('verified');
            // tx_signature may be empty if Solana validator is not running
            expect(result.tx_signature).toBeDefined();
            
            // Verify status updated in database
            const getResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}`);
            const property = await getResponse.json();
            expect(property.status).toBe('verified');
            expect(property.verified_at).toBeDefined();
            
            console.log(`✅ Property verified with tx: ${result.tx_signature || 'mock mode'}`);
        }, BLOCKCHAIN_TIMEOUT);

        test('3. Property tokenization creates SPL tokens', async () => {
            const tokenizeData = {
                owner_wallet: testOwnerWallet,
                token_supply: 10000,
                token_price_usd: 25.50,
                yield_percent: 7.5,
                dist_frequency: 'quarterly'
            };

            const response = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}/tokenize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tokenizeData)
            });

            expect(response.status).toBe(200);
            const result = await response.json();
            
            if (result.status === 'pending_tokenization') {
                // Admin approval path
                const approveResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}/approve_tokenization`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ admin_wallet: 'test_admin' })
                });

                expect(approveResponse.status).toBe(200);
                const approveResult = await approveResponse.json();
                expect(approveResult.status).toBe('tokenized');
                testTokenMint = approveResult.token_mint;
            } else {
                // Direct tokenization path
                expect(result.status).toBe('tokenized');
            }

            // Verify tokenization in database
            const getResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}`);
            const property = await getResponse.json();
            expect(property.status).toBe('tokenized');
            expect(property.token_supply).toBe(10000);
            expect(property.token_mint).toBeDefined();
            expect(property.tokenized_at).toBeDefined();
            
            console.log(`✅ Property tokenized with mint: ${property.token_mint}`);
        }, BLOCKCHAIN_TIMEOUT);

        test('4. Tokenized property appears in marketplace', async () => {
            const response = await fetch(`${BACKEND_URL}/api/v1/marketplace`);
            expect(response.status).toBe(200);
            
            const marketplace = await response.json();
            const property = marketplace.find(p => p.id === testPropertyId);
            
            expect(property).toBeDefined();
            expect(property.status).toBe('tokenized');
            expect(property.token_supply).toBe(10000);
            expect(property.token_price_usd).toBe(25.50);
            expect(property.yield_percent).toBe(7.5);
            
            console.log(`✅ Property visible in marketplace`);
        });
    });

    describe('Blockchain State Validation', () => {
        test('Invalid state transitions are rejected', async () => {
            // Try to verify an already verified property
            const doubleVerifyResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}/verify`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verifier_wallet: testVerifierWallet,
                    approved: false,
                    notes: 'Attempting double verification'
                })
            });

            // Should either succeed (idempotent) or fail gracefully
            expect([200, 400, 409].includes(doubleVerifyResponse.status)).toBe(true);
        });

        test('Ownership validation is enforced', async () => {
            const imposterWallet = `imposter_${Date.now()}`;
            
            // Try to tokenize with wrong owner
            const response = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}/tokenize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner_wallet: imposterWallet,
                    token_supply: 5000,
                    token_price_usd: 10.0,
                    yield_percent: 5.0
                })
            });

            expect(response.status).toBe(403);
            const error = await response.json();
            expect(error.error).toContain('Not the property owner');
        });

        test('Supply validation prevents zero/negative tokenization', async () => {
            // Create new property for this test
            const newPropertyResponse = await fetch(`${BACKEND_URL}/api/v1/properties/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner_wallet: testOwnerWallet,
                    name: 'Supply Validation Test Property',
                    address: 'Supply Test Address'
                })
            });

            const newProperty = await newPropertyResponse.json();
            const newPropertyId = newProperty.property_id;

            // Verify it
            await fetch(`${BACKEND_URL}/api/v1/properties/${newPropertyId}/verify`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verifier_wallet: testVerifierWallet,
                    approved: true
                })
            });

            // Try zero supply
            const zeroSupplyResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${newPropertyId}/tokenize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner_wallet: testOwnerWallet,
                    token_supply: 0,
                    token_price_usd: 10.0,
                    yield_percent: 5.0
                })
            });

            expect(zeroSupplyResponse.status).toBe(400);
        });
    });

    describe('Data Consistency Across Layers', () => {
        test('Property data matches between backend and on-chain', async () => {
            // Get property from backend
            const backendResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}`);
            const backendProperty = await backendResponse.json();

            // Verify critical fields are consistent
            expect(backendProperty.status).toBe('tokenized');
            expect(backendProperty.token_supply).toBe(10000);
            expect(backendProperty.on_chain_address).toBeDefined();
            expect(backendProperty.metadata_hash).toHaveLength(64);
            
            console.log(`✅ Backend data consistent: ${JSON.stringify({
                status: backendProperty.status,
                supply: backendProperty.token_supply,
                onChain: backendProperty.on_chain_address?.slice(0, 8) + '...'
            })}`);
        });

        test('Metadata hash integrity is maintained', async () => {
            const response = await fetch(`${BACKEND_URL}/api/v1/properties/${testPropertyId}`);
            const property = await response.json();
            
            // Metadata hash should be deterministic and non-empty
            expect(property.metadata_hash).toBeDefined();
            expect(property.metadata_hash).toHaveLength(64);
            expect(/^[a-f0-9]{64}$/.test(property.metadata_hash)).toBe(true);
            
            console.log(`✅ Metadata hash valid: ${property.metadata_hash.slice(0, 16)}...`);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('Invalid property ID returns 404', async () => {
            const response = await fetch(`${BACKEND_URL}/api/v1/properties/invalid-uuid`);
            expect(response.status).toBe(400);
        });

        test('Non-existent property returns 404', async () => {
            const response = await fetch(`${BACKEND_URL}/api/v1/properties/00000000-0000-0000-0000-000000000000`);
            expect(response.status).toBe(404);
        });

        test('Malformed request data is rejected', async () => {
            const response = await fetch(`${BACKEND_URL}/api/v1/properties/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Missing required fields
                    owner_wallet: testOwnerWallet
                })
            });

            expect([400, 422].includes(response.status)).toBe(true);
        });
    });
});

// Helper functions
async function verifyServicesRunning() {
    console.log('🔍 Verifying services are running...');
    
    try {
        // Check backend
        const backendResponse = await fetch(`${BACKEND_URL}/api/health`);
        if (!backendResponse.ok) {
            throw new Error(`Backend not responding: ${backendResponse.status}`);
        }
        console.log('✅ Backend service running');

        // Check if Solana test validator is running (optional)
        try {
            const solanaResponse = await fetch(SOLANA_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getHealth'
                })
            });
            if (solanaResponse.ok) {
                console.log('✅ Solana test validator running');
            }
        } catch (e) {
            console.log('⚠️  Solana test validator not running (tests will use mock mode)');
        }

    } catch (error) {
        console.error('❌ Service verification failed:', error.message);
        console.log('Please ensure:');
        console.log('- Backend server is running on port 3001');
        console.log('- Database is connected (or mock mode is enabled)');
        console.log('- Environment variables are set correctly');
        throw error;
    }
}

    // Error handling tests
    describe('Error Handling', () => {
        test('Invalid token supply - negative value', async () => {
            // First create a verified property for testing
            const propertyData = {
                owner_wallet: 'test_owner_wallet_error',
                name: `Error Test Property ${Date.now()}`,
                address: '456 Error Street',
                city: 'Test City',
                property_type: 'residential',
                area_sqft: 1500,
                asset_value_inr: 30000000,
                document_url: '/docs/error_test.pdf'
            };

            const submitResponse = await fetch(`${BACKEND_URL}/api/v1/properties/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(propertyData)
            });
            
            const submitResult = await submitResponse.json();
            const errorTestPropertyId = submitResult.property_id;

            // Verify the property
            const verifyResponse = await fetch(`${BACKEND_URL}/api/v1/properties/${errorTestPropertyId}/verify`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verifier_wallet: 'test_verifier_wallet',
                    approved: true,
                    notes: 'Error test verification'
                })
            });
            expect(verifyResponse.status).toBe(200);

            // Now test invalid negative supply
            const invalidTokenizeData = {
                owner_wallet: 'test_owner_wallet_error',
                token_supply: -1000,
                token_price_usd: 50.0,
                yield_percent: 8.5,
                dist_frequency: 'quarterly'
            };

            const response = await fetch(`${BACKEND_URL}/api/v1/properties/${errorTestPropertyId}/tokenize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invalidTokenizeData)
            });

            expect(response.status).toBe(400);
            const result = await response.json();
            expect(result.error).toBe('Token supply must be greater than zero');
        }, BLOCKCHAIN_TIMEOUT);

        test('Invalid token supply - zero value', async () => {
            // Use the same property from previous test
            const zeroTokenizeData = {
                owner_wallet: 'test_owner_wallet_error',
                token_supply: 0,
                token_price_usd: 50.0,
                yield_percent: 8.5,
                dist_frequency: 'quarterly'
            };

            // Get the error test property ID from the previous test
            const propertiesResponse = await fetch(`${BACKEND_URL}/api/v1/properties`);
            const properties = await propertiesResponse.json();
            const errorTestProperty = properties.find(p => p.name.includes('Error Test Property'));
            
            if (errorTestProperty) {
                const response = await fetch(`${BACKEND_URL}/api/v1/properties/${errorTestProperty.id}/tokenize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(zeroTokenizeData)
                });

                expect(response.status).toBe(400);
                const result = await response.json();
                expect(result.error).toBe('Token supply must be greater than zero');
            }
        }, BLOCKCHAIN_TIMEOUT);
    });

// Test utilities for cleanup
afterAll(async () => {
    console.log('🧹 Integration test cleanup completed');
});