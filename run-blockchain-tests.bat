@echo off
echo ========================================
echo ProofEstate Blockchain Test Suite
echo ========================================
echo.

echo 1. Running Backend API Tests...
echo ----------------------------------------
cd backend
cargo test --test api_tests
if %ERRORLEVEL% neq 0 (
    echo ❌ Backend tests failed
    exit /b 1
)
echo ✅ Backend tests passed
echo.

echo 2. Running Frontend Solana Utils Tests...
echo ----------------------------------------
cd ..\frontend
call npm test -- src/__tests__/lib/solana-utils.test.ts --watchAll=false
if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend tests failed
    exit /b 1
)
echo ✅ Frontend tests passed
echo.

echo 3. Running Integration Tests...
echo ----------------------------------------
cd ..\integration-tests
call npm test
if %ERRORLEVEL% neq 0 (
    echo ❌ Integration tests failed
    exit /b 1
)
echo ✅ Integration tests passed
echo.

echo ========================================
echo 🎉 All blockchain tests completed successfully!
echo ========================================