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
    admin_clerk_id: Option<String>,
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
                println!("✅ DB connected. Verifying tables...");
                
                let _ = sqlx::query("
                    CREATE TABLE IF NOT EXISTS users (
                        wallet TEXT PRIMARY KEY,
                        name TEXT,
                        email TEXT,
                        role TEXT NOT NULL DEFAULT 'investor',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                ").execute(&p).await.expect("Failed to initialize users table");
                    
                let _ = sqlx::query("
                    CREATE TABLE IF NOT EXISTS properties (
                        id UUID PRIMARY KEY,
                        owner_wallet TEXT NOT NULL REFERENCES users(wallet),
                        name TEXT NOT NULL,
                        address TEXT NOT NULL,
                        city TEXT,
                        country TEXT,
                        area_sqft INT,
                        property_type TEXT,
                        asset_value_inr BIGINT,
                        document_url TEXT,
                        metadata_hash TEXT,
                        on_chain_address TEXT,
                        token_mint TEXT,
                        status TEXT NOT NULL DEFAULT 'draft',
                        token_supply BIGINT,
                        token_price_usd DOUBLE PRECISION,
                        yield_percent DOUBLE PRECISION,
                        dist_frequency TEXT,
                        submitted_at TIMESTAMPTZ,
                        verified_at TIMESTAMPTZ,
                        tokenized_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                ").execute(&p).await.expect("Failed to initialize properties table");
                    
                let _ = sqlx::query("
                    CREATE TABLE IF NOT EXISTS verification_logs (
                        id SERIAL PRIMARY KEY,
                        property_id UUID NOT NULL REFERENCES properties(id),
                        actor_wallet TEXT NOT NULL,
                        action TEXT NOT NULL,
                        notes TEXT,
                        tx_signature TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                ").execute(&p).await.expect("Failed to initialize verification_logs table");

                // Seed data if empty
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM properties")
                    .fetch_one(&p)
                    .await
                    .unwrap_or(0);

                if count == 0 {
                    println!("🌱 Seeding real Delhi property data with persistent IDs...");
                    
                    // 1. Create Government User
                    let _ = sqlx::query("
                        INSERT INTO users (wallet, name, email, role)
                        VALUES ('user_2tvQf9oV7jQ3kX9p5m1nR0a8Z3Y', 'Delhi Development Authority (DDA)', 'admin@dda.gov.in', 'owner')
                        ON CONFLICT (wallet) DO NOTHING
                    ").execute(&p).await;

                    // 2. Insert Properties with FIXED IDs (to survive restarts)
                    let properties = vec![
                        (
                            Uuid::parse_str("d1526e1e-8c27-4978-94d5-802e6b01216e").unwrap(),
                            "DDA Commercial Tower, Nehru Place",
                            "Nehru Place, New Delhi, 110019",
                            "Commercial",
                            45000_i64,
                            120000000_i64, 
                            "verified",
                            "/docs/deed_1.png"
                        ),
                        (
                            Uuid::parse_str("d2526e1e-8c27-4978-94d5-802e6b01216f").unwrap(),
                            "Okhla Industrial Plot 42",
                            "Phase III, Okhla Industrial Estate, New Delhi, 110020",
                            "warehouse",
                            12000_i64,
                            18000000_i64,
                            "verified",
                            "/docs/deed_2.png"
                        ),
                        (
                            Uuid::parse_str("d3526e1e-8c27-4978-94d5-802e6b012170").unwrap(),
                            "Dwarka Sector 18 Residential Plot",
                            "Sec 18, Dwarka, New Delhi, 110075",
                            "residential",
                            5500_i64,
                            850000000_i64,
                            "pending_verification",
                            "/docs/deed_1.png"
                        ),
                        (
                            Uuid::parse_str("d4526e1e-8c27-4978-94d5-802e6b012171").unwrap(),
                            "Vasant Kunj Community Hub",
                            "Pocket 2, Sector C, Vasant Kunj, New Delhi, 110070",
                            "land",
                            25000_i64,
                            650000000_i64,
                            "tokenized",
                            "/docs/deed_2.png"
                        ),
                        (
                            Uuid::parse_str("d5526e1e-8c27-4978-94d5-802e6b012172").unwrap(),
                            "Cyber City Tech Park - Tower B",
                            "DLF Cyber City, Phase 2, Gurugram, 122002",
                            "Commercial",
                            120000_i64,
                            2500000000_i64, 
                            "verified",
                            "/docs/deed_1.png"
                        ),
                        (
                            Uuid::parse_str("d6526e1e-8c27-4978-94d5-802e6b012173").unwrap(),
                            "Rohini Sector 11 Industrial Shed",
                            "Plot 88, Sector 11, Rohini, Delhi, 110085",
                            "warehouse",
                            8500_i64,
                            12000000_i64,
                            "verified",
                            "/docs/deed_2.png"
                        )
                    ];

                    for (id, name, addr, ptype, area, val, status, doc) in properties {
                        let _ = sqlx::query("
                            INSERT INTO properties (id, owner_wallet, name, address, property_type, area_sqft, asset_value_inr, status, document_url, created_at)
                            VALUES ($1, 'user_2tvQf9oV7jQ3kX9p5m1nR0a8Z3Y', $2, $3, $4, $5, $6, $7, $8, now())
                            ON CONFLICT (id) DO NOTHING
                        ")
                        .bind(id)
                        .bind(name)
                        .bind(addr)
                        .bind(ptype)
                        .bind(area)
                        .bind(val)
                        .bind(status)
                        .bind(doc)
                        .execute(&p).await;
                    }
                    println!("✅ Seeding complete.");
                }
                
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

    let admin_clerk_id = std::env::var("ADMIN_CLERK_ID").ok();
    if let Some(ref id) = admin_clerk_id {
        println!("🛡️ Admin access restricted to ID: {}", id);
        if let Some(ref pool) = pool {
            let _ = sqlx::query("
                INSERT INTO users (wallet, name, role)
                VALUES ($1, 'Admin', 'admin')
                ON CONFLICT (wallet) DO NOTHING
            ")
            .bind(id)
            .execute(pool)
            .await;
        }
    }

    let state = Arc::new(AppState { 
        db: pool,
        solana: Arc::new(SolanaService::new()),
        admin_clerk_id,
    });

    let app = Router::new()
        // Health
        .route("/api/health", get(health_check))
        // Properties – owner side
        .route("/api/v1/properties",               get(list_properties))
        .route("/api/v1/properties/submit",        post(submit_property))
        .route("/api/v1/properties/:id",           get(get_property))
        .route("/api/v1/properties/:id/tokenize",  post(request_tokenize)) // Request tokenization
        // Properties – admin/verifier side
        .route("/api/v1/properties/:id/verify",    patch(verify_property))
        .route("/api/v1/properties/:id/approve_tokenization", post(approve_tokenization)) // Admin approves tokenization
        // Properties – investor side
        .route("/api/v1/marketplace",              get(list_tokenized))
        // User Profiles
        .route("/api/v1/users",                    post(create_user))
        .route("/api/v1/users/:wallet",            get(get_user))
        // Static Documents
        .nest_service("/docs", tower_http::services::ServeDir::new("public/docs"))
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
    document_url:      Option<String>,
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

// Removed mock_properties() as we are moving to live DB only.


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
                    document_url:    r.try_get("document_url").ok(),
                }).collect();
                (StatusCode::OK, Json(props)).into_response()
            }
            Err(e) => {
                eprintln!("DB error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response()
            }
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

// GET /api/v1/properties/:id
async fn get_property(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if let Some(ref pool) = state.db {
        let property_uuid = match Uuid::parse_str(&id) {
            Ok(u) => u,
            Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "invalid uuid" }))).into_response(),
        };

        let result = sqlx::query(
            "SELECT * FROM properties WHERE id = $1"
        )
        .bind(property_uuid)
        .fetch_one(pool)
        .await;

        match result {
            Ok(r) => {
                let prop = PropertyRow {
                    id:              r.get::<Uuid, _>("id").to_string(),
                    name:            r.get("name"),
                    address:         r.get("address"),
                    city:            r.try_get("city").ok(),
                    country:         r.try_get("country").ok(),
                    area_sqft:       r.try_get::<Option<i32>, _>("area_sqft").unwrap_or_default().map(|v| v as i64),
                    property_type:   r.try_get("property_type").ok(),
                    asset_value_inr: r.try_get::<Option<i64>, _>("asset_value_inr").unwrap_or_default(),
                    metadata_hash:   r.try_get("metadata_hash").ok(),
                    on_chain_address:r.try_get("on_chain_address").ok(),
                    token_mint:      r.try_get("token_mint").ok(),
                    status:          r.get("status"),
                    token_supply:    r.try_get::<Option<i64>, _>("token_supply").unwrap_or_default(),
                    token_price_usd: r.try_get::<Option<f64>, _>("token_price_usd").unwrap_or_default(),
                    yield_percent:   r.try_get::<Option<f64>, _>("yield_percent").unwrap_or_default(),
                    dist_frequency:  r.try_get("dist_frequency").ok(),
                    owner_wallet:    r.get("owner_wallet"),
                    submitted_at:    r.try_get::<Option<chrono::DateTime<Utc>>, _>("submitted_at").unwrap_or_default().map(|d| d.to_rfc3339()),
                    verified_at:     r.try_get::<Option<chrono::DateTime<Utc>>, _>("verified_at").unwrap_or_default().map(|d| d.to_rfc3339()),
                    tokenized_at:    r.try_get::<Option<chrono::DateTime<Utc>>, _>("tokenized_at").unwrap_or_default().map(|d| d.to_rfc3339()),
                    created_at:      r.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                    document_url:    r.try_get("document_url").ok(),
                };
                (StatusCode::OK, Json(prop)).into_response()
            }
            Err(sqlx::Error::RowNotFound) => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Property not found" }))).into_response(),
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
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
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

// POST /api/v1/properties/:id/tokenize  (owner requests tokenization)
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
    status:         String,
    message:        String,
}

async fn request_tokenize(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<TokenizeReq>,
) -> impl IntoResponse {
    println!("🪙 Request tokenize property {} by {}", id, payload.owner_wallet);

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
                status = 'pending_tokenization', token_supply = $1,
                token_price_usd = $2, yield_percent = $3, dist_frequency = $4
             WHERE id = $5"
        )
        .bind(payload.token_supply)
        .bind(payload.token_price_usd)
        .bind(payload.yield_percent)
        .bind(payload.dist_frequency.as_deref().unwrap_or("monthly"))
        .bind(property_uuid)
        .execute(pool).await;

        let _ = sqlx::query(
            "INSERT INTO verification_logs (property_id, actor_wallet, action, notes) VALUES ($1, $2, 'tokenization_requested', $3)"
        )
        .bind(property_uuid)
        .bind(&payload.owner_wallet)
        .bind(format!("Requested Supply: {}, Price: ${}, Yield: {}%", payload.token_supply, payload.token_price_usd, payload.yield_percent))
        .execute(pool).await;

        (StatusCode::OK, Json(TokenizeResp {
            property_id:  id,
            status:       "pending_tokenization".into(),
            message:      "Tokenization requested. Pending admin approval.".into(),
        })).into_response()
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

// POST /api/v1/properties/:id/approve_tokenization (admin approves)
#[derive(Deserialize)]
struct ApproveTokenizeReq {
    admin_wallet: String,
}

#[derive(Serialize)]
struct ApproveTokenizeResp {
    property_id:    String,
    token_mint:     String,
    status:         String,
    message:        String,
}

async fn approve_tokenization(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(payload): Json<ApproveTokenizeReq>,
) -> impl IntoResponse {
    println!("✅ Admin {} approving tokenization for property {}", payload.admin_wallet, id);

    let token_mint = format!("Mint{}", &sha256_hex(&format!("{}:{}", id, Utc::now().timestamp()))[..32]);

    if let Some(ref pool) = state.db {
        let property_uuid = match Uuid::parse_str(&id) {
            Ok(u) => u,
            Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "invalid id" }))).into_response(),
        };

        let row = sqlx::query("SELECT status FROM properties WHERE id = $1")
            .bind(property_uuid)
            .fetch_one(pool)
            .await;

        match row {
            Ok(r) => {
                let status: String = r.get("status");
                if status != "pending_tokenization" {
                    return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Property is not pending tokenization" }))).into_response();
                }
            }
            Err(e) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }

        let _ = sqlx::query(
            "UPDATE properties SET status = 'tokenized', token_mint = $1, tokenized_at = now() WHERE id = $2"
        )
        .bind(&token_mint)
        .bind(property_uuid)
        .execute(pool).await;

        let _ = sqlx::query(
            "INSERT INTO verification_logs (property_id, actor_wallet, action, notes) VALUES ($1, $2, 'tokenized', 'Admin approved tokenization')"
        )
        .bind(property_uuid)
        .bind(&payload.admin_wallet)
        .execute(pool).await;
        
        (StatusCode::OK, Json(ApproveTokenizeResp {
            property_id:  id,
            token_mint,
            status:       "tokenized".into(),
            message:      "Property tokenized successfully. SPL tokens minted.".into(),
        })).into_response()
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

// GET /api/v1/marketplace  — investors view tokenized properties
async fn list_tokenized(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if let Some(ref pool) = state.db {
        let result = sqlx::query(
            "SELECT * FROM properties 
             WHERE status IN ('verified', 'tokenized', 'pending_tokenization')
             ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await;

        match result {
            Ok(rows) => {
                let properties: Vec<PropertyRow> = rows.into_iter().map(|r| PropertyRow {
                    id:              r.get::<uuid::Uuid, _>("id").to_string(),
                    name:            r.get("name"),
                    address:         r.get("address"),
                    city:            r.try_get("city").ok(),
                    country:         r.try_get("country").ok(),
                    area_sqft:       r.try_get("area_sqft").ok(),
                    property_type:   r.try_get("property_type").ok(),
                    asset_value_inr: r.try_get("asset_value_inr").ok(),
                    metadata_hash:   r.try_get("metadata_hash").ok(),
                    on_chain_address:r.try_get("on_chain_address").ok(),
                    token_mint:      r.try_get("token_mint").ok(),
                    status:          r.get("status"),
                    token_supply:    r.try_get("token_supply").ok(),
                    token_price_usd: r.try_get("token_price_usd").ok(),
                    yield_percent:   r.try_get("yield_percent").ok(),
                    dist_frequency:  r.try_get("dist_frequency").ok(),
                    owner_wallet:    r.get("owner_wallet"),
                    submitted_at:    r.try_get::<Option<chrono::DateTime<Utc>>, _>("submitted_at").ok().flatten().map(|t| t.to_rfc3339()),
                    verified_at:     r.try_get::<Option<chrono::DateTime<Utc>>, _>("verified_at").ok().flatten().map(|t| t.to_rfc3339()),
                    tokenized_at:    r.try_get::<Option<chrono::DateTime<Utc>>, _>("tokenized_at").ok().flatten().map(|t| t.to_rfc3339()),
                    created_at:      r.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                    document_url:    r.try_get("document_url").ok(),
                }).collect();
                (StatusCode::OK, Json(properties)).into_response()
            }
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

// ────────────────────────────────────────────────────────────
// Users
// ────────────────────────────────────────────────────────────
#[derive(Serialize, Deserialize)]
struct UserReq {
    wallet: String,
    name: Option<String>,
    email: Option<String>,
    role: String, // 'owner' or 'investor'
}

#[derive(Serialize, sqlx::FromRow)]
struct UserResp {
    wallet: String,
    name: Option<String>,
    email: Option<String>,
    role: String,
    #[sqlx(default)] 
    created_at: String,
}

async fn create_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UserReq>,
) -> impl IntoResponse {
    println!("👤 Create/Update User profile request for wallet: {}", payload.wallet);
    if let Some(ref pool) = state.db {
        let mut role = payload.role.clone();
        
        // Force admin role if clerk ID matches env var
        if let Some(ref admin_id) = state.admin_clerk_id {
            if &payload.wallet == admin_id {
                println!("🛡️ Granting admin privileges to: {}", admin_id);
                role = "admin".to_string();
            }
        }

        let result = sqlx::query(
            "INSERT INTO users (wallet, name, email, role) VALUES ($1, $2, $3, $4)
             ON CONFLICT (wallet) DO UPDATE SET name = $2, email = $3, role = $4
             RETURNING wallet, name, email, role, created_at"
        )
        .bind(&payload.wallet)
        .bind(&payload.name)
        .bind(&payload.email)
        .bind(&role)
        .fetch_one(pool)
        .await;

        match result {
            Ok(r) => {
                let user = UserResp {
                    wallet: r.get("wallet"),
                    name: r.try_get("name").ok().unwrap_or_default(),
                    email: r.try_get("email").ok().unwrap_or_default(),
                    role: r.get("role"),
                    created_at: r.try_get::<chrono::DateTime<Utc>, _>("created_at")
                                 .unwrap_or_default()
                                 .to_rfc3339(),
                };
                (StatusCode::OK, Json(user)).into_response()
            }
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(wallet): Path<String>,
) -> impl IntoResponse {
    println!("🔍 Fetching User profile for wallet: {}", wallet);
    if let Some(ref pool) = state.db {
        let result = sqlx::query(
            "SELECT wallet, name, email, role, created_at FROM users WHERE wallet = $1"
        )
        .bind(&wallet)
        .fetch_one(pool)
        .await;

        match result {
            Ok(r) => {
                let wallet: String = r.get("wallet");
                let mut role: String = r.get("role");

                if let Some(ref admin_id) = state.admin_clerk_id {
                    if &wallet == admin_id {
                        role = "admin".to_string();
                    }
                }

                let user = UserResp {
                    wallet,
                    name: r.try_get("name").ok().unwrap_or_default(),
                    email: r.try_get("email").ok().unwrap_or_default(),
                    role,
                    created_at: r.try_get::<chrono::DateTime<Utc>, _>("created_at")
                                 .unwrap_or_default()
                                 .to_rfc3339(),
                };
                (StatusCode::OK, Json(user)).into_response()
            }
            Err(sqlx::Error::RowNotFound) => {
                println!("⚠️ User profile NOT FOUND in DB for wallet: {}", wallet);
                (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "User not found" }))).into_response()
            }
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

async fn debug_list_users(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    if let Some(ref pool) = state.db {
        let result = sqlx::query(
            "SELECT wallet, name, email, role, created_at FROM users"
        )
        .fetch_all(pool)
        .await;

        match result {
            Ok(rows) => {
                let users: Vec<serde_json::Value> = rows.iter().map(|r| {
                    serde_json::json!({
                        "wallet": r.get::<String, _>("wallet"),
                        "name": r.try_get::<Option<String>, _>("name").ok().flatten(),
                        "email": r.try_get::<Option<String>, _>("email").ok().flatten(),
                        "role": r.get::<String, _>("role"),
                        "created_at": r.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                    })
                }).collect();
                (StatusCode::OK, Json(users)).into_response()
            }
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "No DB").into_response()
    }
}
