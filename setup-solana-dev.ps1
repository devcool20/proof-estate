# ProofEstate Solana Development Setup Script
Write-Host "🚀 Setting up Solana development environment..." -ForegroundColor Cyan

# Check if Solana CLI is available
Write-Host "1. Checking Solana CLI installation..." -ForegroundColor Yellow
try {
    $solanaVersion = & solana --version 2>$null
    Write-Host "✅ Solana CLI found: $solanaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Solana CLI not found in PATH" -ForegroundColor Red
    Write-Host "Please install Solana CLI or add it to your PATH" -ForegroundColor Yellow
    Write-Host "Installation guide: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Blue
    exit 1
}

# Set Solana to localhost for development
Write-Host "2. Configuring Solana for local development..." -ForegroundColor Yellow
& solana config set --url localhost
& solana config set --keypair ~/.config/solana/id.json

# Generate a keypair if it doesn't exist
Write-Host "3. Setting up development keypair..." -ForegroundColor Yellow
if (!(Test-Path "~/.config/solana/id.json")) {
    & solana-keygen new --no-bip39-passphrase --silent --outfile ~/.config/solana/id.json
    Write-Host "✅ New keypair generated" -ForegroundColor Green
} else {
    Write-Host "✅ Keypair already exists" -ForegroundColor Green
}

# Check if test validator is running
Write-Host "4. Checking test validator status..." -ForegroundColor Yellow
try {
    $clusterInfo = & solana cluster-version 2>$null
    Write-Host "✅ Test validator is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Test validator not running" -ForegroundColor Yellow
    Write-Host "Starting Solana test validator..." -ForegroundColor Yellow
    Write-Host "Run this command in a separate terminal:" -ForegroundColor Blue
    Write-Host "solana-test-validator --reset" -ForegroundColor Cyan
}

# Airdrop SOL for testing
Write-Host "5. Requesting SOL airdrop for testing..." -ForegroundColor Yellow
try {
    & solana airdrop 2
    $balance = & solana balance
    Write-Host "✅ Current balance: $balance" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Airdrop failed - test validator might not be running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Solana development setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start test validator: solana-test-validator --reset" -ForegroundColor White
Write-Host "2. Deploy contracts: cd contracts && anchor build && anchor deploy" -ForegroundColor White
Write-Host "3. Run tests: ./run-blockchain-tests.bat" -ForegroundColor White