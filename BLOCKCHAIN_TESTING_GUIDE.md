# Comprehensive Blockchain Testing Guide

This guide covers the complete blockchain testing strategy for the ProofEstate real estate tokenization platform, ensuring every component of the blockchain flow is thoroughly validated.

## 🏗️ Architecture Overview

The blockchain flow spans three layers:
1. **Solana Smart Contract** (Anchor/Rust) - On-chain logic and state
2. **Backend API** (Axum/Rust) - Off-chain coordination and database
3. **Frontend** (Next.js/React) - User interface and wallet integration

## 🧪 Test Categories

### 1. Smart Contract Tests (`contracts/tests/proof_estate.ts`)

**Core Functionality:**
- ✅ Verifier registration and authorization
- ✅ Property initialization with metadata validation
- ✅ Property verification (approve/reject) by authorized verifiers
- ✅ Property tokenization with SPL token minting
- ✅ Rent deposit and proportional distribution
- ✅ Rent claiming with precision validation

**Edge Cases Added:**
- ✅ Rent claim rounding to zero (NothingToClaim error)
- ✅ Vault exhaustion after full claim (VaultEmpty error)
- ✅ Multi-holder precision validation
- ✅ String length validation (property_id, metadata_hash, metadata_uri)
- ✅ Invalid state transitions
- ✅ Unauthorized access attempts

**Run Tests:**
```bash
cd contracts
anchor test
```

### 2. Backend API Tests (`backend/tests/api_tests.rs`)

**Lifecycle Validation:**
- ✅ Full property lifecycle (submit → verify → tokenize → marketplace)
- ✅ Pending tokenization workflow with admin approval
- ✅ State transition enforcement
- ✅ Ownership validation
- ✅ Supply validation (positive numbers only)
- ✅ On-chain PDA consistency
- ✅ Metadata integrity

**New Tests Added:**
- ✅ `test_full_blockchain_lifecycle_with_pending_tokenization`
- ✅ `test_tokenize_rejects_non_positive_supply`
- ✅ `test_blockchain_state_transitions_are_enforced`
- ✅ `test_property_ownership_validation`
- ✅ `test_on_chain_pda_consistency`
- ✅ `test_blockchain_metadata_integrity`

**Run Tests:**
```bash
cd backend
cargo test --test api_tests
```

### 3. Frontend Tests (`frontend/src/__tests__/`)

**Solana Integration:**
- ✅ PROGRAM_ID validation
- ✅ Complete IDL structure matching on-chain program
- ✅ PropertyStatus enum with all variants (including Rejected)
- ✅ All instruction definitions (6 total)
- ✅ Account structure validation
- ✅ Error code mapping

**Updated IDL:**
- ✅ All 6 instructions: `initializeVerifier`, `initializeProperty`, `verifyProperty`, `tokenizeProperty`, `depositRent`, `claimRent`
- ✅ Complete PropertyAccount struct with all 8 fields
- ✅ All 11 error codes with proper mapping
- ✅ Verifier account structure

**Run Tests:**
```bash
cd frontend
npm test
```

### 4. Integration Tests (`integration-tests/blockchain-flow.test.js`)

**Cross-Layer Validation:**
- ✅ End-to-end property lifecycle across all layers
- ✅ On-chain PDA creation verification
- ✅ State consistency between backend and blockchain
- ✅ Marketplace integration
- ✅ Error handling and edge cases
- ✅ Data integrity validation

**Run Tests:**
```bash
cd integration-tests
npm test blockchain-flow.test.js
```

## 🚀 Running All Tests

### Quick Test (Individual Layers)
```bash
# Smart Contract
cd contracts && anchor test

# Backend
cd backend && cargo test --test api_tests

# Frontend
cd frontend && npm test -- --watchAll=false
```

### Comprehensive Test Suite
```bash
# Make script executable
chmod +x run-blockchain-tests.sh

# Run all tests
./run-blockchain-tests.sh
```

## 🔍 Test Coverage Summary

### Smart Contract Coverage
- **Instructions**: 6/6 tested (100%)
  - `initialize_verifier` ✅
  - `initialize_property` ✅
  - `verify_property` ✅
  - `tokenize_property` ✅
  - `deposit_rent` ✅
  - `claim_rent` ✅

- **Error Conditions**: 11/11 tested (100%)
  - NotVerified, NotTokenized, AlreadyTokenized
  - InvalidStatus, UnauthorizedVerifier
  - InvalidSupply, InvalidAmount
  - VaultEmpty, NoTokensHeld, NothingToClaim
  - StringTooLong

- **Edge Cases**: Comprehensive
  - Precision rounding, vault exhaustion
  - Multi-holder scenarios, boundary conditions
  - Invalid state transitions, unauthorized access

### Backend API Coverage
- **Endpoints**: 8/8 tested (100%)
  - Health, Properties CRUD, Submit, Verify
  - Tokenize, Approve Tokenization, Marketplace, Users

- **Blockchain Integration**: Complete
  - On-chain PDA derivation and consistency
  - Solana transaction coordination
  - State synchronization between DB and blockchain

### Frontend Coverage
- **Solana Utils**: Complete IDL validation
- **Component Tests**: All major UI components
- **Page Tests**: All application pages
- **Integration**: Wallet connectivity and blockchain interaction

### Cross-Layer Integration
- **Data Flow**: Submit → Verify → Tokenize → Marketplace
- **State Consistency**: Backend ↔ Blockchain synchronization
- **Error Propagation**: Proper error handling across layers
- **Security**: Ownership and authorization validation

## 🛡️ Security Test Coverage

### Access Control
- ✅ Verifier authorization enforcement
- ✅ Property ownership validation
- ✅ Admin-only operations protection

### Input Validation
- ✅ String length limits (64, 200 chars)
- ✅ Positive number validation
- ✅ UUID format validation
- ✅ Wallet address validation

### State Management
- ✅ Invalid state transition prevention
- ✅ Double-spending prevention
- ✅ Atomic operations

### Financial Security
- ✅ Rent distribution precision
- ✅ Token supply validation
- ✅ Vault balance protection

## 📊 Performance Considerations

### Blockchain Operations
- Transaction confirmation times
- Gas cost optimization
- Concurrent operation handling

### Database Operations
- Connection pooling efficiency
- Query optimization
- Concurrent request handling

### Frontend Performance
- Wallet connection optimization
- State management efficiency
- Component rendering optimization

## 🔧 Test Environment Setup

### Prerequisites
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"

# Install Anchor
npm install -g @coral-xyz/anchor-cli

# Start local Solana validator
solana-test-validator

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

### Database Setup (Optional)
```bash
# Start PostgreSQL with Docker
docker run --name postgres-test -e POSTGRES_PASSWORD=test -p 5432:5432 -d postgres

# Set DATABASE_URL in backend/.env
DATABASE_URL=postgresql://postgres:test@localhost:5432/proofestate_test
```

## 📈 Continuous Integration

### GitHub Actions Workflow
```yaml
name: Blockchain Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Solana
        run: sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Run Blockchain Tests
        run: ./run-blockchain-tests.sh
```

## 🐛 Debugging Failed Tests

### Smart Contract Issues
```bash
# Check program logs
solana logs

# Verify program deployment
anchor deploy
anchor idl init <PROGRAM_ID> --filepath target/idl/proof_estate.json
```

### Backend Issues
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Verify Solana RPC connection
curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' $SOLANA_RPC_URL
```

### Frontend Issues
```bash
# Check environment variables
cat frontend/.env.local

# Verify API connectivity
curl http://localhost:3001/api/health
```

## 📝 Adding New Tests

### Smart Contract Tests
1. Add test cases to `contracts/tests/proof_estate.ts`
2. Follow existing patterns for setup and assertions
3. Test both success and failure scenarios
4. Include edge cases and boundary conditions

### Backend Tests
1. Add test functions to `backend/tests/api_tests.rs`
2. Use the `spawn_test_server()` helper
3. Test API endpoints and blockchain integration
4. Validate error responses and edge cases

### Frontend Tests
1. Add test files to `frontend/src/__tests__/`
2. Mock external dependencies (Solana, API calls)
3. Test component behavior and user interactions
4. Validate error states and loading states

## 🎯 Test Quality Metrics

- **Code Coverage**: >90% for critical paths
- **Edge Case Coverage**: All error conditions tested
- **Integration Coverage**: Full end-to-end flows validated
- **Performance**: All tests complete within reasonable time
- **Reliability**: Tests pass consistently across environments

## 📚 Additional Resources

- [Anchor Testing Guide](https://book.anchor-lang.com/anchor_in_depth/testing.html)
- [Solana Program Testing](https://docs.solana.com/developing/test-validator)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)