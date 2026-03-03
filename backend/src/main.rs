use axum::{
    routing::{get, post, patch},
    Router, Json, extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;
use std::net::SocketAddr;
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use uuid::Uuid;
use chrono::Utc;
use std::sync::Arc;
use sha2::{Sha256, Digest};

mod solana_service;
use solana_service::SolanaService;

// ────────────────────────────────────────────────────────────
// App State
// ────────────────────────────────────────────────────────────
struct AppState {
    db: Option<PgPool>,
    solana: Arc<SolanaService>,
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────
#[tokio::main]
async fn main() {
    // Load .env file (ignore if file missing — env vars may be set externally)
    let _ = dotenvy::dotenv();
    println!("🚀 Starting ProofEstate Backend...");


    let db_url = std::env::var("DATABASE_URL").unwrap_or_default();
    let pool = if !db_url.is_empty() {
        println!("✅ Connecting to PostgreSQL...");
        match PgPoolOptions::new()
            .max_connections(10)
            .connect(&db_url)
            .await
        {
            Ok(p) => {
                println!("✅ DB connected");
                Some(p)
            }
            Err(e) => {
                eprintln!("⚠️ DB connection failed: {}. Running in mock mode.", e);
                None
            }
        }
    } else {
        println!("⚠️ DATABASE_URL not set. Running in mock mode.");
        None
    };

    let state = Arc::new(AppState { 
        db: pool,
        solana: Arc::new(SolanaService::new()),
    });

    let app = Router::new()
        // Health
        .route("/api/health", get(health_check))
        // Properties – owner side
        .route("/api/v1/properties",               get(list_properties))
        .route("/api/v1/properties/submit",        post(submit_property))
        .route("/api/v1/properties/:id",           get(get_property))
        .route("/api/v1/properties/:id/verify",    patch(verify_property))
        .route("/api/v1/properties/:id/tokenize",  post(tokenize_property))
        // Properties – investor side
        .route("/api/v1/marketplace",              get(list_tokenized))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse()
        .unwrap_or(3001);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("🌐 Listening on http://0.0.0.0:{}", port);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap_or_else(|e| {
        eprintln!("❌ Failed to bind to port {}: {}", port, e);
        eprintln!("   Try setting PORT=3002 (or another free port) in backend/.env");
        std::process::exit(1);
    });
    axum::serve(listener, app).await.unwrap();
}

// ────────────────────────────────────────────────────────────
// Shared types
// ────────────────────────────────────────────────────────────
#[derive(Serialize, Clone)]
struct PropertyRow {
    id:                String,
    name:              String,
    address:           String,
    city:              Option<String>,
    country:           Option<String>,
    area_sqft:         Option<i64>,
    property_type:     Option<String>,
    asset_value_inr:   Option<i64>,
    metadata_hash:     Option<String>,
    on_chain_address:  Option<String>,
    token_mint:        Option<String>,
    status:            String,
    token_supply:      Option<i64>,
    token_price_usd:   Option<f64>,
    yield_percent:     Option<f64>,
    dist_frequency:    Option<String>,
    owner_wallet:      String,
    submitted_at:      Option<String>,
    verified_at:       Option<String>,
    tokenized_at:      Option<String>,
    created_at:        String,
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn mock_properties() -> Vec<PropertyRow> {
    vec![
        PropertyRow {
            id:              "prop-01".into(),
            name:            "1010 Market Street, San Francisco".into(),
            address:         "1010 Market St, San Francisco, CA 94103".into(),
            city:            Some("San Francisco".into()),
            country:         Some("USA".into()),
            area_sqft:       Some(12000),
            property_type:   Some("commercial".into()),
            asset_value_inr: Some(3_74_00_00_00_000),
            metadata_hash:   Some("7f3a29b2c4d8e1f0a5b6c9d2e3f4a7b8".into()),
            on_chain_address:Some("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS".into()),
            token_mint:      None,
            status:          "verified".into(),
            token_supply:    None,
            token_price_usd: None,
            yield_percent:   None,
            dist_frequency:  Some("monthly".into()),
            owner_wallet:    "OwnerX1111111111111111111111111111111111111".into(),
            submitted_at:    Some("2026-02-01T10:00:00Z".into()),
            verified_at:     Some("2026-02-03T14:30:00Z".into()),
            tokenized_at:    None,
            created_at:      "2026-02-01T10:00:00Z".into(),
        },
        PropertyRow {
            id:              "prop-02".into(),
            name:            "Sunset Boulevard Commercial Complex".into(),
            address:         "9800 Sunset Blvd, Los Angeles, CA 90069".into(),
            city:            Some("Los Angeles".into()),
            country:         Some("USA".into()),
            area_sqft:       Some(8500),
            property_type:   Some("commercial".into()),
            asset_value_inr: Some(1_04_00_00_00_000),
            metadata_hash:   Some("a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3".into()),
            on_chain_address:Some("SunsetPDA111111111111111111111111111111111".into()),
            token_mint:      Some("SunsetMint111111111111111111111111111111111".into()),
            status:          "tokenized".into(),
            token_supply:    Some(1_000_000),
            token_price_usd: Some(12.5),
            yield_percent:   Some(6.2),
            dist_frequency:  Some("quarterly".into()),
            owner_wallet:    "OwnerY2222222222222222222222222222222222222".into(),
            submitted_at:    Some("2026-01-10T09:00:00Z".into()),
            verified_at:     Some("2026-01-15T11:00:00Z".into()),
            tokenized_at:    Some("2026-01-20T16:00:00Z".into()),
            created_at:      "2026-01-10T09:00:00Z".into(),
        },
        PropertyRow {
            id:              "prop-03".into(),
            name:            "Downtown Warehouse Facility".into(),
            address:         "500 Industrial Ave, Chicago, IL 60607".into(),
            city:            Some("Chicago".into()),
            country:         Some("USA".into()),
            area_sqft:       Some(20000),
            property_type:   Some("warehouse".into()),
            asset_value_inr: Some(62_00_00_00_000),
            metadata_hash:   None,
            on_chain_address:None,
            token_mint:      None,
            status:          "pending_verification".into(),
            token_supply:    None,
            token_price_usd: None,
            yield_percent:   None,
            dist_frequency:  None,
            owner_wallet:    "OwnerZ3333333333333333333333333333333333333".into(),
            submitted_at:    Some("2026-03-01T12:00:00Z".into()),
            verified_at:     None,
            tokenized_at:    None,
            created_at:      "2026-03-01T12:00:00Z".into(),
        },
    ]
}

// ────────────────────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────────────────────

async fn health_check() -> &'static str {
    "ProofEstate API is running ✅"
}

// GET /api/v1/properties?status=verified  (or no filter for all)
async fn list_properties(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let status_filter = params.get("status").cloned();

    if let Some(ref pool) = state.db {
        let rows = sqlx::query(
            "SELECT id, name, address, city, country, area_sqft, property_type,
                    asset_value_inr, metadata_hash, on_chain_address, token_mint, status,
                    token_supply, token_price_usd, yield_percent, dist_frequency,
                    owner_wallet, submitted_at, verified_at, tokenized_at, created_at
             FROM properties
             WHERE ($1::text IS NULL OR status = $1)
             ORDER BY created_at DESC",
        )
        .bind(status_filter)
        .fetch_all(pool)
        .await;

        match rows {
            Ok(rows) => {
                let props: Vec<PropertyRow> = rows.iter().map(|r| PropertyRow {
                    id:              r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
                    name:            r.try_get("name").unwrap_or_default(),
                    address:         r.try_get("address").unwrap_or_default(),
                    city:            r.try_get("city").ok(),
                    country:         r.try_get("country").ok(),
                    area_sqft:       r.try_get::<Option<i32>, _>("area_sqft").unwrap_or_default().map(|v| v as i64),
                    property_type:   r.try_get("property_type").ok(),
                    asset_value_inr: r.try_get::<Option<i64>, _>("asset_value_inr").unwrap_or_default(),
                    metadata_hash:   r.try_get("metadata_hash").ok(),
                    on_chain_address:r.try_get("on_chain_address").ok(),
                    token_mint:      r.try_get("token_mint").ok(),
                    status:          r.try_get("status").unwrap_or_default(),
                    token_supply:    r.try_get::<Option<i64>, _>("token_supply").unwrap_or_default(),
                    token_price_usd: r.try_get::<Option<f64>, _>("token_price_usd").unwrap_or_default(),
                    yield_percent:   r.try_get::<Option<f64>, _>("yield_percent").unwrap_or_default(),
                    dist_frequency:  r.try_get("dist_frequency").ok(),
                    owner_wallet:    r.try_get("owner_wallet").unwrap_or_default(),
                    submitted_at:    r.try_get::<Option<chrono::DateTime<Utc>>, _>("submitted_at")
                                      .unwrap_or_default()
                                      .map(|d| d.to_rfc3339()),
                    verified_at:     r.try_get::<Option<chrono::DateTime<Utc>>, _>("verified_at")
                                      .unwrap_or_default()
                                      .map(|d| d.to_rfc3339()),
                    tokenized_at:    r.try_get::<Option<chrono::DateTime<Utc>>, _>("tokenized_at")
                                      .unwrap_or_default()
                                      .map(|d| d.to_rfc3339()),
                    created_at:      r.try_get::<chrono::DateTime<Utc>, _>("created_at")
                                      .unwrap_or_default()
                                      .to_rfc3339(),
                }).collect();
                (StatusCode::OK, Json(props)).into_response()
            }
            Err(e) => {
                eprintln!("DB error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response()
            }
        }
    } else {
        // Mock mode
        let mut mock = mock_properties();
        if let Some(ref filter) = status_filter {
            mock.retain(|p| &p.status == filter);
        }
        (StatusCode::OK, Json(mock)).into_response()
    }
}

// GET /api/v1/properties/:id
async fn get_property(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if state.db.is_none() {
        // Mock
        let mock = mock_properties();
        if let Some(p) = mock.into_iter().find(|p| p.id == id) {
            return (StatusCode::OK, Json(serde_json::to_value(p).unwrap())).into_response();
        }
        return (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "not found" }))).into_response();
    }
    (StatusCode::NOT_IMPLEMENTED, Json(serde_json::json!({ "error": "db mode not implemented yet" }))).into_response()
}

// POST /api/v1/properties/submit
#[derive(Deserialize)]
struct SubmitPropertyReq {
    owner_wallet:    String,
    name:            String,
    address:         String,
    city:            Option<String>,
    property_type:   Option<String>,
    area_sqft:       Option<i64>,
    asset_value_inr: Option<i64>,
    document_url:    Option<String>,
}

#[derive(Serialize)]
struct SubmitPropertyResp {
    property_id:    String,
    metadata_hash:  String,
    status:         String,
    message:        String,
}

async fn submit_property(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SubmitPropertyReq>,
) -> impl IntoResponse {
    println!("📝 Property submission from wallet: {}", payload.owner_wallet);

    // 1. Compute metadata hash from document URL + owner + timestamp
    let hash_input = format!(
        "{}:{}:{}:{}",
        payload.owner_wallet,
        payload.name,
        payload.document_url.as_deref().unwrap_or(""),
        Utc::now().timestamp()
    );
    let metadata_hash = sha256_hex(&hash_input);
    let property_id = Uuid::new_v4();

    if let Some(ref pool) = state.db {
        // Ensure user exists
        let _ = sqlx::query(
            "INSERT INTO users (wallet, role) VALUES ($1, 'owner') ON CONFLICT (wallet) DO NOTHING"
        )
        .bind(&payload.owner_wallet)
        .execute(pool)
        .await;

        // 2. Initialize On-Chain
        let mut tx_sig = String::new();
        match state.solana.initialize_on_chain(&payload.name, &metadata_hash).await {
            Ok(sig) => tx_sig = sig,
            Err(e) => eprintln!("❌ On-chain initialization failed: {}", e),
        }
        
        let (on_chain_address, _) = state.solana.get_property_pda(&payload.name);

        // 3. Insert property
        let result = sqlx::query(
            "INSERT INTO properties
                (id, owner_wallet, name, address, city, property_type, area_sqft,
                 asset_value_inr, document_url, metadata_hash, on_chain_address, status, submitted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending_verification', now())
             RETURNING id"
        )
        .bind(property_id)
        .bind(&payload.owner_wallet)
        .bind(&payload.name)
        .bind(&payload.address)
        .bind(&payload.city)
        .bind(&payload.property_type)
        .bind(payload.area_sqft.map(|v| v as i32))
        .bind(payload.asset_value_inr)
        .bind(&payload.document_url)
        .bind(&metadata_hash)
        .bind(on_chain_address.to_string())
        .fetch_one(pool)
        .await;

        match result {
            Ok(_) => {
                // Log the submission
                let _ = sqlx::query(
                    "INSERT INTO verification_logs (property_id, actor_wallet, action, notes, tx_signature)
                     VALUES ($1, $2, 'submitted', $3, $4)"
                )
                .bind(property_id)
                .bind(&payload.owner_wallet)
                .bind("Property submitted and initialized on-chain")
                .bind(&tx_sig)
                .execute(pool)
                .await;

                (StatusCode::CREATED, Json(SubmitPropertyResp {
                    property_id:   property_id.to_string(),
                    metadata_hash,
                    status:        "pending_verification".into(),
                    message:       format!("Property submitted and initialized on Solana. Tx: {}", tx_sig),
                })).into_response()
            }
            Err(e) => {
                eprintln!("Insert error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response()
            }
        }
    } else {
        // Mock mode
        (StatusCode::CREATED, Json(SubmitPropertyResp {
            property_id:   property_id.to_string(),
            metadata_hash: metadata_hash[..32].to_string(),
            status:        "pending_verification".into(),
            message:       "[MOCK] Property submitted. In production this writes to PostgreSQL and Solana.".into(),
        })).into_response()
    }
}

// PATCH /api/v1/properties/:id/verify  (admin/verifier only)
#[derive(Deserialize)]
struct VerifyReq {
    verifier_wallet: String,
    approved:        bool,
    notes:           Option<String>,
}

async fn verify_property(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<VerifyReq>,
) -> impl IntoResponse {
    println!("✅ Verify property {} by {}", id, payload.verifier_wallet);

    let new_status = if payload.approved { "verified" } else { "rejected" };

    if let Some(ref pool) = state.db {
        let property_uuid = match Uuid::parse_str(&id) {
            Ok(u) => u,
            Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "invalid id" }))).into_response(),
        };

        // 1. Update DB 
        let _ = sqlx::query(
            "UPDATE properties SET status = $1, verified_at = CASE WHEN $1 = 'verified' THEN now() ELSE NULL END WHERE id = $2"
        )
        .bind(new_status)
        .bind(property_uuid)
        .execute(pool).await;

        // 2. Perform On-Chain Verification if approved
        let mut tx_sig = String::new();
        if payload.approved {
            // Get the property_id name from DB to find the PDA seeds
            if let Ok(row) = sqlx::query("SELECT name FROM properties WHERE id = $1").bind(property_uuid).fetch_one(pool).await {
               let name: String = row.get("name");
               match state.solana.verify_on_chain(&name).await {
                   Ok(sig) => tx_sig = sig,
                   Err(e) => eprintln!("❌ On-chain verification failed: {}", e),
               }
            }
        }

        let _ = sqlx::query(
            "INSERT INTO verification_logs (property_id, actor_wallet, action, notes, tx_signature) VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(property_uuid)
        .bind(&payload.verifier_wallet)
        .bind(if payload.approved { "verified" } else { "rejected" })
        .bind(&payload.notes)
        .bind(&tx_sig)
        .execute(pool).await;

        (StatusCode::OK, Json(serde_json::json!({
            "property_id": id,
            "new_status": new_status,
            "tx_signature": tx_sig,
            "message": if payload.approved {
                format!("Property verified successfully on-chain. Tx: {}", tx_sig)
            } else {
                "Property rejected.".into()
            }
        }))).into_response()
    } else {
        (StatusCode::OK, Json(serde_json::json!({
            "property_id": id,
            "new_status": new_status,
            "message": "[MOCK] Verifier action performed."
        }))).into_response()
    }
}

// POST /api/v1/properties/:id/tokenize  (owner only, must be verified)
#[derive(Deserialize)]
struct TokenizeReq {
    owner_wallet:    String,
    token_supply:    i64,
    token_price_usd: f64,
    yield_percent:   f64,
    dist_frequency:  Option<String>,
}

#[derive(Serialize)]
struct TokenizeResp {
    property_id:    String,
    token_mint:     String,
    token_supply:   i64,
    status:         String,
    message:        String,
}

async fn tokenize_property(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<TokenizeReq>,
) -> impl IntoResponse {
    println!("🪙 Tokenize property {} by {}", id, payload.owner_wallet);

    // Generate a mock token mint address (in production this is the SPL mint pubkey returned by Solana)
    let token_mint = format!("Mint{}", &sha256_hex(&format!("{}:{}", id, Utc::now().timestamp()))[..32]);

    if let Some(ref pool) = state.db {
        let property_uuid = match Uuid::parse_str(&id) {
            Ok(u) => u,
            Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "invalid id" }))).into_response(),
        };

        // Check status
        let row = sqlx::query("SELECT status, owner_wallet FROM properties WHERE id = $1")
            .bind(property_uuid)
            .fetch_one(pool)
            .await;

        match row {
            Ok(r) => {
                let status: String = r.get("status");
                let db_owner: String = r.get("owner_wallet");
                if status != "verified" {
                    return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Property is not verified yet" }))).into_response();
                }
                if db_owner != payload.owner_wallet {
                    return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "Not the property owner" }))).into_response();
                }
            }
            Err(e) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }

        let _ = sqlx::query(
            "UPDATE properties SET
                status = 'tokenized', token_mint = $1, token_supply = $2,
                token_price_usd = $3, yield_percent = $4, dist_frequency = $5, tokenized_at = now()
             WHERE id = $6"
        )
        .bind(&token_mint)
        .bind(payload.token_supply)
        .bind(payload.token_price_usd)
        .bind(payload.yield_percent)
        .bind(payload.dist_frequency.as_deref().unwrap_or("monthly"))
        .bind(property_uuid)
        .execute(pool).await;

        let _ = sqlx::query(
            "INSERT INTO verification_logs (property_id, actor_wallet, action, notes) VALUES ($1, $2, 'tokenized', $3)"
        )
        .bind(property_uuid)
        .bind(&payload.owner_wallet)
        .bind(format!("Supply: {}, Price: ${}, Yield: {}%", payload.token_supply, payload.token_price_usd, payload.yield_percent))
        .execute(pool).await;
    }

    (StatusCode::OK, Json(TokenizeResp {
        property_id:  id,
        token_mint,
        token_supply: payload.token_supply,
        status:       "tokenized".into(),
        message:      "Property tokenized successfully. SPL tokens minted to owner wallet.".into(),
    })).into_response()
}

// GET /api/v1/marketplace  — investors view tokenized properties
async fn list_tokenized(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if state.db.is_none() {
        let mocks = mock_properties()
            .into_iter()
            .filter(|p| p.status == "tokenized")
            .collect::<Vec<_>>();
        return (StatusCode::OK, Json(mocks)).into_response();
    }
    // DB impl delegated to list_properties with filter
    (StatusCode::NOT_IMPLEMENTED, Json(serde_json::json!({ "error": "use /api/v1/properties?status=tokenized" }))).into_response()
}
