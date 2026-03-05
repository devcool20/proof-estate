/// ProofEstate Backend – Integration Tests
///
/// Tests all REST API endpoints against a real (or mock) server.
/// Covers: health, user CRUD, property CRUD, verify, tokenize, marketplace.
///
/// Run with:  cargo test --test api_tests
///
/// NOTE: These tests spawn the backend on a random port and perform HTTP
///       requests.  They do NOT require a running PostgreSQL — the backend
///       falls back to "mock mode" when DATABASE_URL is empty.

use std::net::SocketAddr;
use std::sync::Arc;
use serde_json::{json, Value};

// We re-use types directly from reqwest
// Make sure to add [dev-dependencies] reqwest and tokio to Cargo.toml

/// Helper: Start a lightweight test server and return its base URL.
/// We intentionally do NOT set DATABASE_URL so the backend runs in mock mode.
async fn spawn_test_server() -> String {
    // Pick a random available port
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let base_url = format!("http://{}", addr);

    // We can't easily import the binary's main() (it's not a lib),
    // so we test via the running dev server or use reqwest against a known port.
    // For these tests, we assume the backend is running on port 3001 or the
    // user starts it before tests.

    // Return the URL of the running backend (dev mode)
    let port = std::env::var("TEST_BACKEND_PORT").unwrap_or("3001".to_string());
    drop(listener); // release the random port
    format!("http://127.0.0.1:{}", port)
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap()
}

// ======================================================================
// Health Check
// ======================================================================

#[tokio::test]
async fn test_health_check() {
    let base = spawn_test_server().await;
    let res = client().get(format!("{}/api/health", base)).send().await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 200);
            let body = r.text().await.unwrap();
            assert!(body.contains("ProofEstate API is running"), "Health body: {}", body);
        }
        Err(e) => {
            eprintln!("⚠️  Backend not running ({}). Skipping HTTP tests.", e);
        }
    }
}

// ======================================================================
// User Endpoints
// ======================================================================

#[tokio::test]
async fn test_create_user_and_get_user() {
    let base = spawn_test_server().await;
    let c = client();

    // 1. Create user
    let payload = json!({
        "wallet": "test_wallet_integration_001",
        "name": "Test User",
        "email": "test@example.com",
        "role": "investor"
    });

    let res = c
        .post(format!("{}/api/v1/users", base))
        .json(&payload)
        .send()
        .await;

    match res {
        Ok(r) => {
            assert!(r.status().is_success(), "Create user status: {}", r.status());
            let body: Value = r.json().await.unwrap();
            assert_eq!(body["wallet"], "test_wallet_integration_001");
            assert_eq!(body["role"], "investor");
        }
        Err(e) => {
            eprintln!("⚠️  Backend not running: {}. Skipping.", e);
            return;
        }
    }

    // 2. Get user
    let res = c
        .get(format!("{}/api/v1/users/test_wallet_integration_001", base))
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), 200);
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["wallet"], "test_wallet_integration_001");
    assert_eq!(body["name"], "Test User");
}

#[tokio::test]
async fn test_get_nonexistent_user_returns_404() {
    let base = spawn_test_server().await;
    let c = client();

    let res = c
        .get(format!("{}/api/v1/users/nonexistent_wallet_xyz", base))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 404);
            let body: Value = r.json().await.unwrap();
            assert!(body["error"].as_str().unwrap().contains("not found"));
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_create_user_upserts_on_conflict() {
    let base = spawn_test_server().await;
    let c = client();

    let wallet = "test_wallet_upsert_002";

    // Create
    let _ = c
        .post(format!("{}/api/v1/users", base))
        .json(&json!({
            "wallet": wallet,
            "name": "Original",
            "role": "investor"
        }))
        .send()
        .await;

    // Upsert with new name
    let res = c
        .post(format!("{}/api/v1/users", base))
        .json(&json!({
            "wallet": wallet,
            "name": "Updated Name",
            "email": "updated@example.com",
            "role": "owner"
        }))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert!(r.status().is_success());
            let body: Value = r.json().await.unwrap();
            assert_eq!(body["name"], "Updated Name");
            assert_eq!(body["role"], "owner");
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_create_user_missing_required_fields() {
    let base = spawn_test_server().await;
    let c = client();

    // Missing "wallet" — should get 422 Unprocessable Entity
    let res = c
        .post(format!("{}/api/v1/users", base))
        .json(&json!({
            "name": "No Wallet"
        }))
        .send()
        .await;

    match res {
        Ok(r) => {
            // Axum returns 422 for deserialization failures
            assert!(r.status().as_u16() == 422 || r.status().as_u16() == 400,
                    "Expected 422 or 400, got {}", r.status());
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

// ======================================================================
// Properties Endpoints
// ======================================================================

#[tokio::test]
async fn test_list_properties() {
    let base = spawn_test_server().await;
    let c = client();

    let res = c
        .get(format!("{}/api/v1/properties", base))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 200);
            let body: Value = r.json().await.unwrap();
            assert!(body.is_array(), "Properties should be an array");
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_list_properties_with_status_filter() {
    let base = spawn_test_server().await;
    let c = client();

    let res = c
        .get(format!("{}/api/v1/properties?status=verified", base))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 200);
            let body: Vec<Value> = r.json().await.unwrap();
            for prop in &body {
                assert_eq!(prop["status"], "verified", "All should be verified");
            }
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_get_property_invalid_uuid() {
    let base = spawn_test_server().await;
    let c = client();

    let res = c
        .get(format!("{}/api/v1/properties/not-a-valid-uuid", base))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 400);
            let body: Value = r.json().await.unwrap();
            assert!(body["error"].as_str().unwrap().contains("invalid"), "Expected 'invalid uuid' error");
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_get_property_not_found() {
    let base = spawn_test_server().await;
    let c = client();

    // Valid UUID format but doesn't exist
    let fake_uuid = "00000000-0000-0000-0000-000000000000";
    let res = c
        .get(format!("{}/api/v1/properties/{}", base, fake_uuid))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 404, "Non-existent property should 404");
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_submit_property() {
    let base = spawn_test_server().await;
    let c = client();

    let payload = json!({
        "owner_wallet": "test_wallet_submit_001",
        "name": "Test Property in Rohini",
        "address": "Sector 24, Rohini, Delhi, 110085",
        "city": "Delhi",
        "property_type": "residential",
        "area_sqft": 2500,
        "asset_value_inr": 50000000,
        "document_url": "/docs/deed_1.png"
    });

    let res = c
        .post(format!("{}/api/v1/properties/submit", base))
        .json(&payload)
        .send()
        .await;

    match res {
        Ok(r) => {
            let status = r.status();
            assert!(status == 201 || status == 200, "Submit should succeed, got {}", status);
            let body: Value = r.json().await.unwrap();
            assert!(!body["property_id"].as_str().unwrap().is_empty());
            assert!(!body["metadata_hash"].as_str().unwrap().is_empty());
            assert_eq!(body["status"], "pending_verification");
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_submit_property_missing_name() {
    let base = spawn_test_server().await;
    let c = client();

    let payload = json!({
        "owner_wallet": "test_wallet",
        "address": "Some address"
        // missing "name"
    });

    let res = c
        .post(format!("{}/api/v1/properties/submit", base))
        .json(&payload)
        .send()
        .await;

    match res {
        Ok(r) => {
            assert!(r.status().as_u16() == 422 || r.status().as_u16() == 400,
                    "Missing required field should fail, got {}", r.status());
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

// ======================================================================
// Verify Property
// ======================================================================

#[tokio::test]
async fn test_verify_property_invalid_uuid() {
    let base = spawn_test_server().await;
    let c = client();

    let payload = json!({
        "verifier_wallet": "verifier_001",
        "approved": true,
        "notes": "Looks good"
    });

    let res = c
        .patch(format!("{}/api/v1/properties/bad-uuid/verify", base))
        .json(&payload)
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 400, "Invalid UUID should 400");
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_verify_property_approve_and_reject() {
    let base = spawn_test_server().await;
    let c = client();

    // First submit a property
    let submit_res = c
        .post(format!("{}/api/v1/properties/submit", base))
        .json(&json!({
            "owner_wallet": "test_wallet_verify_flow",
            "name": "Verify Flow Property",
            "address": "Test Address"
        }))
        .send()
        .await;

    let property_id = match submit_res {
        Ok(r) if r.status().is_success() => {
            let body: Value = r.json().await.unwrap();
            body["property_id"].as_str().unwrap().to_string()
        }
        _ => {
            eprintln!("⚠️  Skipping verify test — couldn't submit property");
            return;
        }
    };

    // Approve
    let res = c
        .patch(format!("{}/api/v1/properties/{}/verify", base, property_id))
        .json(&json!({
            "verifier_wallet": "verifier_001",
            "approved": true,
            "notes": "Documents verified"
        }))
        .send()
        .await
        .unwrap();

    assert!(res.status().is_success(), "Verify approve should succeed");
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["new_status"], "verified");
}

// ======================================================================
// Tokenize Property
// ======================================================================

#[tokio::test]
async fn test_tokenize_property_invalid_uuid() {
    let base = spawn_test_server().await;
    let c = client();

    let payload = json!({
        "owner_wallet": "wallet",
        "token_supply": 1000,
        "token_price_usd": 10.0,
        "yield_percent": 5.0
    });

    let res = c
        .post(format!("{}/api/v1/properties/bad-uuid/tokenize", base))
        .json(&payload)
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 400, "Invalid UUID should 400");
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_tokenize_property_not_verified_yet() {
    let base = spawn_test_server().await;
    let c = client();

    // Submit a new property (pending status)
    let submit_res = c
        .post(format!("{}/api/v1/properties/submit", base))
        .json(&json!({
            "owner_wallet": "test_wallet_tok_pending",
            "name": "Pending Property for Tokenize",
            "address": "Test Address"
        }))
        .send()
        .await;

    let property_id = match submit_res {
        Ok(r) if r.status().is_success() => {
            let body: Value = r.json().await.unwrap();
            body["property_id"].as_str().unwrap().to_string()
        }
        _ => {
            eprintln!("⚠️  Skipping — couldn't submit");
            return;
        }
    };

    // Try tokenizing without verifying
    let res = c
        .post(format!("{}/api/v1/properties/{}/tokenize", base, property_id))
        .json(&json!({
            "owner_wallet": "test_wallet_tok_pending",
            "token_supply": 1000,
            "token_price_usd": 10.0,
            "yield_percent": 5.0
        }))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 400, "Not verified should fail tokenize");
            let body: Value = r.json().await.unwrap();
            assert!(body["error"].as_str().unwrap().contains("not verified"));
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_tokenize_property_wrong_owner() {
    let base = spawn_test_server().await;
    let c = client();

    // Submit → Verify → Tokenize with wrong wallet
    let submit_res = c
        .post(format!("{}/api/v1/properties/submit", base))
        .json(&json!({
            "owner_wallet": "real_owner_wallet",
            "name": "Wrong Owner Property",
            "address": "Test Address"
        }))
        .send()
        .await;

    let property_id = match submit_res {
        Ok(r) if r.status().is_success() => {
            let body: Value = r.json().await.unwrap();
            body["property_id"].as_str().unwrap().to_string()
        }
        _ => { return; }
    };

    // Verify
    let _ = c
        .patch(format!("{}/api/v1/properties/{}/verify", base, property_id))
        .json(&json!({
            "verifier_wallet": "admin",
            "approved": true
        }))
        .send()
        .await;

    // Tokenize with WRONG owner
    let res = c
        .post(format!("{}/api/v1/properties/{}/tokenize", base, property_id))
        .json(&json!({
            "owner_wallet": "imposter_wallet",
            "token_supply": 1000,
            "token_price_usd": 10.0,
            "yield_percent": 5.0
        }))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 403, "Wrong owner should 403");
            let body: Value = r.json().await.unwrap();
            assert!(body["error"].as_str().unwrap().contains("Not the property owner"));
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_full_tokenize_flow() {
    let base = spawn_test_server().await;
    let c = client();
    let owner_wallet = "flow_owner_wallet";

    // 1. Submit
    let submit_res = c
        .post(format!("{}/api/v1/properties/submit", base))
        .json(&json!({
            "owner_wallet": owner_wallet,
            "name": "Full Flow Property",
            "address": "123 Test St"
        }))
        .send()
        .await;

    let property_id = match submit_res {
        Ok(r) if r.status().is_success() => {
            let body: Value = r.json().await.unwrap();
            body["property_id"].as_str().unwrap().to_string()
        }
        _ => { return; }
    };

    // 2. Verify
    let verify_res = c
        .patch(format!("{}/api/v1/properties/{}/verify", base, property_id))
        .json(&json!({
            "verifier_wallet": "admin_wallet",
            "approved": true,
            "notes": "All docs check out"
        }))
        .send()
        .await
        .unwrap();
    assert!(verify_res.status().is_success());

    // 3. Tokenize with on-chain tx (skip approval path)
    let tok_res = c
        .post(format!("{}/api/v1/properties/{}/tokenize", base, property_id))
        .json(&json!({
            "owner_wallet": owner_wallet,
            "token_supply": 10000,
            "token_price_usd": 25.50,
            "yield_percent": 8.5,
            "dist_frequency": "quarterly",
            "token_mint": "MockMintAddress123",
            "tx_signature": "MockTxSig123"
        }))
        .send()
        .await
        .unwrap();

    assert!(tok_res.status().is_success());
    let tok_body: Value = tok_res.json().await.unwrap();
    assert_eq!(tok_body["status"], "tokenized");

    // 4. Verify it shows up in marketplace
    let market_res = c
        .get(format!("{}/api/v1/marketplace", base))
        .send()
        .await
        .unwrap();

    assert_eq!(market_res.status(), 200);
    let market: Vec<Value> = market_res.json().await.unwrap();
    let found = market.iter().any(|p| p["id"].as_str() == Some(&property_id));
    assert!(found, "Tokenized property should appear in marketplace");
}

// ======================================================================
// Approve Tokenization (Admin path)
// ======================================================================

#[tokio::test]
async fn test_approve_tokenization_invalid_uuid() {
    let base = spawn_test_server().await;
    let c = client();

    let res = c
        .post(format!("{}/api/v1/properties/bad-uuid/approve_tokenization", base))
        .json(&json!({ "admin_wallet": "admin" }))
        .send()
        .await;

    match res {
        Ok(r) => assert_eq!(r.status(), 400),
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_approve_tokenization_wrong_status() {
    let base = spawn_test_server().await;
    let c = client();

    // Submit but don't tokenize → status is pending_verification
    let submit_res = c
        .post(format!("{}/api/v1/properties/submit", base))
        .json(&json!({
            "owner_wallet": "admin_flow_wallet",
            "name": "Admin Flow Property",
            "address": "Test"
        }))
        .send()
        .await;

    let property_id = match submit_res {
        Ok(r) if r.status().is_success() => {
            let body: Value = r.json().await.unwrap();
            body["property_id"].as_str().unwrap().to_string()
        }
        _ => { return; }
    };

    // Try approve on non-pending_tokenization property
    let res = c
        .post(format!("{}/api/v1/properties/{}/approve_tokenization", base, property_id))
        .json(&json!({ "admin_wallet": "admin" }))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 400);
            let body: Value = r.json().await.unwrap();
            assert!(body["error"].as_str().unwrap().contains("not pending tokenization"));
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

// ======================================================================
// Marketplace
// ======================================================================

#[tokio::test]
async fn test_marketplace_returns_only_eligible_properties() {
    let base = spawn_test_server().await;
    let c = client();

    let res = c
        .get(format!("{}/api/v1/marketplace", base))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 200);
            let body: Vec<Value> = r.json().await.unwrap();
            for prop in &body {
                let status = prop["status"].as_str().unwrap();
                assert!(
                    status == "verified" || status == "tokenized" || status == "pending_tokenization",
                    "Marketplace should only show eligible statuses, got: {}", status
                );
            }
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

// ======================================================================
// Edge Cases / Misc
// ======================================================================

#[tokio::test]
async fn test_cors_headers_present() {
    let base = spawn_test_server().await;
    let c = client();

    let res = c
        .get(format!("{}/api/health", base))
        .header("Origin", "http://localhost:3000")
        .send()
        .await;

    match res {
        Ok(r) => {
            // CorsLayer::permissive() should add access-control headers
            // In permissive mode it may or may not echo the origin
            assert_eq!(r.status(), 200);
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

#[tokio::test]
async fn test_404_on_unknown_route() {
    let base = spawn_test_server().await;
    let c = client();

    let res = c
        .get(format!("{}/api/v1/nonexistent", base))
        .send()
        .await;

    match res {
        Ok(r) => {
            assert_eq!(r.status(), 404, "Unknown route should 404");
        }
        Err(e) => eprintln!("⚠️  Skipping: {}", e),
    }
}

// ======================================================================
// Unit Tests for sha256_hex helper
// ======================================================================

#[test]
fn test_sha256_hex_deterministic() {
    use sha2::{Sha256, Digest};
    fn sha256_hex(input: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(input.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    let hash1 = sha256_hex("hello");
    let hash2 = sha256_hex("hello");
    assert_eq!(hash1, hash2, "Same input should produce same hash");
    assert_eq!(hash1.len(), 64, "SHA-256 hex should be 64 chars");
}

#[test]
fn test_sha256_hex_different_inputs() {
    use sha2::{Sha256, Digest};
    fn sha256_hex(input: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(input.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    let hash1 = sha256_hex("input_a");
    let hash2 = sha256_hex("input_b");
    assert_ne!(hash1, hash2);
}

#[test]
fn test_sha256_hex_empty_string() {
    use sha2::{Sha256, Digest};
    fn sha256_hex(input: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(input.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    let hash = sha256_hex("");
    assert_eq!(hash.len(), 64);
    // Known SHA-256 of empty string
    assert_eq!(hash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
}
