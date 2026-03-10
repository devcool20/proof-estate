use axum::{
    routing::{get, post, patch},
    Router, Json, extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;
use std::net::SocketAddr;
use std::str::FromStr;
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use uuid::Uuid;
use chrono::Utc;
use std::sync::Arc;
use sha2::{Sha256, Digest};
use solana_sdk::pubkey::Pubkey;

mod solana_service;
mod real_time_endpoints;
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

                let _ = sqlx::query("
                    ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_url VARCHAR;
                ").execute(&p).await;

                // Add new columns for dynamic content
                let _ = sqlx::query("
                    ALTER TABLE properties 
                    ADD COLUMN IF NOT EXISTS description TEXT,
                    ADD COLUMN IF NOT EXISTS amenities TEXT[],
                    ADD COLUMN IF NOT EXISTS location_benefits TEXT[],
                    ADD COLUMN IF NOT EXISTS market_analysis TEXT,
                    ADD COLUMN IF NOT EXISTS risk_assessment TEXT,
                    ADD COLUMN IF NOT EXISTS legal_status TEXT,
                    ADD COLUMN IF NOT EXISTS environmental_clearance BOOLEAN DEFAULT false,
                    ADD COLUMN IF NOT EXISTS building_approvals TEXT[],
                    ADD COLUMN IF NOT EXISTS total_floors INTEGER,
                    ADD COLUMN IF NOT EXISTS parking_spaces INTEGER,
                    ADD COLUMN IF NOT EXISTS construction_year INTEGER,
                    ADD COLUMN IF NOT EXISTS last_renovation_year INTEGER;
                ").execute(&p).await;

                // Create rent_distributions table for tracking real rent payments
                let _ = sqlx::query("
                    CREATE TABLE IF NOT EXISTS rent_distributions (
                        id SERIAL PRIMARY KEY,
                        property_id UUID NOT NULL REFERENCES properties(id),
                        distribution_date TIMESTAMPTZ NOT NULL DEFAULT now(),
                        total_amount_usdc DECIMAL(18,6) NOT NULL,
                        total_tokens_eligible BIGINT NOT NULL,
                        rate_per_token DECIMAL(18,12) NOT NULL,
                        tx_signature TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                ").execute(&p).await;

                // Create token_holdings table for tracking real token ownership
                let _ = sqlx::query("
                    CREATE TABLE IF NOT EXISTS token_holdings (
                        id SERIAL PRIMARY KEY,
                        property_id UUID NOT NULL REFERENCES properties(id),
                        holder_wallet TEXT NOT NULL,
                        token_amount BIGINT NOT NULL,
                        last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
                        UNIQUE(property_id, holder_wallet)
                    );
                ").execute(&p).await;
                
                // Set default images for the specific seeded properties in case they were backfilled with the same image
                let property_images = vec![
                    ("d1526e1e-8c27-4978-94d5-802e6b01216e", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000"), // Commercial Tower
                    ("d2526e1e-8c27-4978-94d5-802e6b01216f", "https://images.unsplash.com/photo-1586528116311-ad8ed7bc55f9?auto=format&fit=crop&q=80&w=2000"), // Warehouse
                    ("d3526e1e-8c27-4978-94d5-802e6b012170", "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000"), // Residential Plot
                    ("d4526e1e-8c27-4978-94d5-802e6b012171", "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000"), // Land
                    ("d5526e1e-8c27-4978-94d5-802e6b012172", "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000"), // Tech Park
                    ("d6526e1e-8c27-4978-94d5-802e6b012173", "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=2000"), // Industrial Shed
                ];
                
                for (id, img) in property_images {
                    let _ = sqlx::query("UPDATE properties SET image_url = $1 WHERE id = $2 AND (image_url = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=2000' OR image_url IS NULL)")
                        .bind(img)
                        .bind(uuid::Uuid::parse_str(id).unwrap())
                        .execute(&p).await;
                }

                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM properties")
                    .fetch_one(&p)
                    .await
                    .unwrap_or(0);

                // No hardcoded seed data - all properties come from real user submissions
                println!("✅ Database initialized. Ready for real property submissions (count: {})", count);
                
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

    let solana = Arc::new(SolanaService::new());
    
    // Auto-initialize the verifier PDA on startup
    let solana_init = solana.clone();
    tokio::spawn(async move {
        match solana_init.initialize_verifier().await {
            Ok(sig) => println!("🛡️ Solana Verifier initialized. Tx: {}", sig),
            Err(e) => println!("ℹ️ Solana Verifier already active or init skipped: {}", e),
        }
    });

    let state = Arc::new(AppState { 
        db: pool,
        solana,
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
        // Real-time data endpoints
        .route("/api/v1/properties/:id/rent_distributions", get(real_time_endpoints::get_rent_distributions))
        .route("/api/v1/properties/:id/token_holdings",     get(real_time_endpoints::get_token_holdings))
        .route("/api/v1/properties/:id/claimable_rent/:wallet", get(real_time_endpoints::get_claimable_rent))
        // Admin correlation analysis
        .route("/api/v1/admin/correlation_analysis", get(real_time_endpoints::get_correlation_analysis))
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
    id:                     String,
    name:                   String,
    address:                String,
    city:                   Option<String>,
    country:                Option<String>,
    area_sqft:              Option<i64>,
    property_type:          Option<String>,
    asset_value_inr:        Option<i64>,
    metadata_hash:          Option<String>,
    on_chain_address:       Option<String>,
    token_mint:             Option<String>,
    status:                 String,
    token_supply:           Option<i64>,
    token_price_usd:        Option<f64>,
    yield_percent:          Option<f64>,
    dist_frequency:         Option<String>,
    owner_wallet:           String,
    submitted_at:           Option<String>,
    verified_at:            Option<String>,
    tokenized_at:           Option<String>,
    created_at:             String,
    document_url:           Option<String>,
    image_url:              Option<String>,
    description:            Option<String>,
    amenities:              Option<Vec<String>>,
    location_benefits:      Option<Vec<String>>,
    market_analysis:        Option<String>,
    risk_assessment:        Option<String>,
    legal_status:           Option<String>,
    environmental_clearance: Option<bool>,
    building_approvals:     Option<Vec<String>>,
    total_floors:           Option<i32>,
    parking_spaces:         Option<i32>,
    construction_year:      Option<i32>,
    last_renovation_year:   Option<i32>,
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
                    owner_wallet, submitted_at, verified_at, tokenized_at, created_at, 
                    document_url, image_url, description, amenities, location_benefits,
                    market_analysis, risk_assessment, legal_status, environmental_clearance,
                    building_approvals, total_floors, parking_spaces, construction_year, last_renovation_year
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
                    document_url:           r.try_get("document_url").ok(),
                    image_url:              r.try_get("image_url").ok(),
                    description:            r.try_get("description").ok(),
                    amenities:              r.try_get::<Option<Vec<String>>, _>("amenities").unwrap_or_default(),
                    location_benefits:      r.try_get::<Option<Vec<String>>, _>("location_benefits").unwrap_or_default(),
                    market_analysis:        r.try_get("market_analysis").ok(),
                    risk_assessment:        r.try_get("risk_assessment").ok(),
                    legal_status:           r.try_get("legal_status").ok(),
                    environmental_clearance: r.try_get::<Option<bool>, _>("environmental_clearance").unwrap_or_default(),
                    building_approvals:     r.try_get::<Option<Vec<String>>, _>("building_approvals").unwrap_or_default(),
                    total_floors:           r.try_get::<Option<i32>, _>("total_floors").unwrap_or_default(),
                    parking_spaces:         r.try_get::<Option<i32>, _>("parking_spaces").unwrap_or_default(),
                    construction_year:      r.try_get::<Option<i32>, _>("construction_year").unwrap_or_default(),
                    last_renovation_year:   r.try_get::<Option<i32>, _>("last_renovation_year").unwrap_or_default(),
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
            "SELECT id, name, address, city, country, area_sqft, property_type,
                    asset_value_inr, metadata_hash, on_chain_address, token_mint, status,
                    token_supply, token_price_usd, yield_percent, dist_frequency,
                    owner_wallet, submitted_at, verified_at, tokenized_at, created_at, 
                    document_url, image_url, description, amenities, location_benefits,
                    market_analysis, risk_assessment, legal_status, environmental_clearance,
                    building_approvals, total_floors, parking_spaces, construction_year, last_renovation_year
             FROM properties WHERE id = $1"
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
                    document_url:           r.try_get("document_url").ok(),
                    image_url:              r.try_get("image_url").ok(),
                    description:            r.try_get("description").ok(),
                    amenities:              r.try_get::<Option<Vec<String>>, _>("amenities").unwrap_or_default(),
                    location_benefits:      r.try_get::<Option<Vec<String>>, _>("location_benefits").unwrap_or_default(),
                    market_analysis:        r.try_get("market_analysis").ok(),
                    risk_assessment:        r.try_get("risk_assessment").ok(),
                    legal_status:           r.try_get("legal_status").ok(),
                    environmental_clearance: r.try_get::<Option<bool>, _>("environmental_clearance").unwrap_or_default(),
                    building_approvals:     r.try_get::<Option<Vec<String>>, _>("building_approvals").unwrap_or_default(),
                    total_floors:           r.try_get::<Option<i32>, _>("total_floors").unwrap_or_default(),
                    parking_spaces:         r.try_get::<Option<i32>, _>("parking_spaces").unwrap_or_default(),
                    construction_year:      r.try_get::<Option<i32>, _>("construction_year").unwrap_or_default(),
                    last_renovation_year:   r.try_get::<Option<i32>, _>("last_renovation_year").unwrap_or_default(),
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
    owner_wallet:           String,
    name:                   String,
    address:                String,
    city:                   Option<String>,
    property_type:          Option<String>,
    area_sqft:              Option<i64>,
    asset_value_inr:        Option<i64>,
    document_url:           Option<String>,
    image_url:              Option<String>,
    /// IPFS / Arweave URI to the uploaded title deed document
    metadata_uri:           Option<String>,
    description:            Option<String>,
    amenities:              Option<Vec<String>>,
    location_benefits:      Option<Vec<String>>,
    market_analysis:        Option<String>,
    risk_assessment:        Option<String>,
    legal_status:           Option<String>,
    environmental_clearance: Option<bool>,
    building_approvals:     Option<Vec<String>>,
    total_floors:           Option<i32>,
    parking_spaces:         Option<i32>,
    construction_year:      Option<i32>,
    last_renovation_year:   Option<i32>,
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

        // 2. Initialize on-chain using a canonical 32-byte seed key.
        // We use UUID without hyphens so PDA derivation is stable and always seed-safe.
        let mut tx_sig = String::new();
        let meta_uri = payload.metadata_uri.as_deref().unwrap_or("");
        let property_seed_key = property_id.simple().to_string();
        match state.solana.initialize_on_chain(&property_seed_key, &metadata_hash, meta_uri).await {
            Ok(sig) => tx_sig = sig,
            Err(e) => eprintln!("❌ On-chain initialization failed: {}", e),
        }
        let (property_pda, _) = match state.solana.get_property_pda(&property_seed_key) {
            Ok(pda) => pda,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": format!("invalid property seed key: {}", e) })),
                )
                    .into_response();
            }
        };
        let on_chain_address = property_pda.to_string();

        // 3. Insert property
        let result = sqlx::query(
            "INSERT INTO properties
                (id, owner_wallet, name, address, city, property_type, area_sqft,
                 asset_value_inr, document_url, image_url, metadata_hash, on_chain_address, status, submitted_at,
                 description, amenities, location_benefits, market_analysis, risk_assessment, legal_status,
                 environmental_clearance, building_approvals, total_floors, parking_spaces, construction_year, last_renovation_year)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_verification', now(),
                     $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
        .bind(&payload.image_url)
        .bind(&metadata_hash)
        .bind(&on_chain_address)
        .bind(&payload.description)
        .bind(&payload.amenities)
        .bind(&payload.location_benefits)
        .bind(&payload.market_analysis)
        .bind(&payload.risk_assessment)
        .bind(&payload.legal_status)
        .bind(payload.environmental_clearance)
        .bind(&payload.building_approvals)
        .bind(payload.total_floors)
        .bind(payload.parking_spaces)
        .bind(payload.construction_year)
        .bind(payload.last_renovation_year)
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

        // 2. Perform on-chain verification (approved or rejected)
        let mut tx_sig = String::new();
        if let Ok(row) = sqlx::query("SELECT on_chain_address FROM properties WHERE id = $1").bind(property_uuid).fetch_one(pool).await {
            let on_chain_address: Option<String> = row.try_get("on_chain_address").ok();
            if let Some(address) = on_chain_address {
                match Pubkey::from_str(&address) {
                    Ok(property_pubkey) => {
                        match state.solana.verify_on_chain_by_address(&property_pubkey, payload.approved).await {
                            Ok(sig) => tx_sig = sig,
                            Err(e) => eprintln!("❌ On-chain verification failed: {}", e),
                        }
                    }
                    Err(e) => eprintln!("❌ Invalid on_chain_address '{}': {}", address, e),
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
    token_mint:      Option<String>,
    tx_signature:    Option<String>,
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

        // Validate token supply is positive
        if payload.token_supply <= 0 {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Token supply must be greater than zero" }))).into_response();
        }

        let skip_approval = payload.tx_signature.is_some();
        let new_status = if skip_approval { "tokenized" } else { "pending_tokenization" };

        let _ = sqlx::query(
            "UPDATE properties SET
                status = $1, token_supply = $2,
                token_price_usd = $3, yield_percent = $4, dist_frequency = $5,
                token_mint = $6, tokenized_at = CASE WHEN $1 = 'tokenized' THEN now() ELSE NULL END
             WHERE id = $7"
        )
        .bind(new_status)
        .bind(payload.token_supply)
        .bind(payload.token_price_usd)
        .bind(payload.yield_percent)
        .bind(payload.dist_frequency.as_deref().unwrap_or("monthly"))
        .bind(&payload.token_mint)
        .bind(property_uuid)
        .execute(pool).await;

        let notes = format!(
            "Supply: {}, Price: ${}, Yield: {}%. On-chain Tx: {}", 
            payload.token_supply, 
            payload.token_price_usd, 
            payload.yield_percent,
            payload.tx_signature.as_deref().unwrap_or("N/A")
        );

        let _ = sqlx::query(
            "INSERT INTO verification_logs (property_id, actor_wallet, action, notes, tx_signature) VALUES ($1, $2, 'tokenized', $3, $4)"
        )
        .bind(property_uuid)
        .bind(&payload.owner_wallet)
        .bind(notes)
        .bind(payload.tx_signature)
        .execute(pool).await;

        (StatusCode::OK, Json(TokenizeResp {
            property_id:  id,
            status:       new_status.into(),
            message:      if skip_approval { "Property tokenized on-chain successfully." } else { "Tokenization requested. Pending admin approval." }.into(),
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

    if let Some(ref pool) = state.db {
        let property_uuid = match Uuid::parse_str(&id) {
            Ok(u) => u,
            Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "invalid id" }))).into_response(),
        };

        let row = sqlx::query("SELECT status, token_mint FROM properties WHERE id = $1")
            .bind(property_uuid)
            .fetch_one(pool)
            .await;

        let token_mint: String;
        match row {
            Ok(r) => {
                let status: String = r.get("status");
                if status != "pending_tokenization" {
                    return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Property is not pending tokenization" }))).into_response();
                }
                token_mint = match r.try_get::<Option<String>, _>("token_mint").ok().flatten() {
                    Some(mint) => mint,
                    None => {
                        return (
                            StatusCode::BAD_REQUEST,
                            Json(serde_json::json!({
                                "error": "On-chain token mint missing. Owner must submit tokenization transaction first."
                            })),
                        )
                            .into_response();
                    }
                };
            }
            Err(e) => return (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }

        let _ = sqlx::query(
            "UPDATE properties SET status = 'tokenized', tokenized_at = now() WHERE id = $1"
        )
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
            token_mint: token_mint.clone(),
            status:       "tokenized".into(),
            message:      "Property tokenization approved with on-chain mint recorded.".into(),
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
            "SELECT id, name, address, city, country, area_sqft, property_type,
                    asset_value_inr, metadata_hash, on_chain_address, token_mint, status,
                    token_supply, token_price_usd, yield_percent, dist_frequency,
                    owner_wallet, submitted_at, verified_at, tokenized_at, created_at, 
                    document_url, image_url, description, amenities, location_benefits,
                    market_analysis, risk_assessment, legal_status, environmental_clearance,
                    building_approvals, total_floors, parking_spaces, construction_year, last_renovation_year
             FROM properties 
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
                    document_url:           r.try_get("document_url").ok(),
                    image_url:              r.try_get("image_url").ok(),
                    description:            r.try_get("description").ok(),
                    amenities:              r.try_get::<Option<Vec<String>>, _>("amenities").unwrap_or_default(),
                    location_benefits:      r.try_get::<Option<Vec<String>>, _>("location_benefits").unwrap_or_default(),
                    market_analysis:        r.try_get("market_analysis").ok(),
                    risk_assessment:        r.try_get("risk_assessment").ok(),
                    legal_status:           r.try_get("legal_status").ok(),
                    environmental_clearance: r.try_get::<Option<bool>, _>("environmental_clearance").unwrap_or_default(),
                    building_approvals:     r.try_get::<Option<Vec<String>>, _>("building_approvals").unwrap_or_default(),
                    total_floors:           r.try_get::<Option<i32>, _>("total_floors").unwrap_or_default(),
                    parking_spaces:         r.try_get::<Option<i32>, _>("parking_spaces").unwrap_or_default(),
                    construction_year:      r.try_get::<Option<i32>, _>("construction_year").unwrap_or_default(),
                    last_renovation_year:   r.try_get::<Option<i32>, _>("last_renovation_year").unwrap_or_default(),
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
