// ────────────────────────────────────────────────────────────
// Real-time Data Endpoints
// ────────────────────────────────────────────────────────────

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::Serialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::AppState;

#[derive(Serialize, sqlx::FromRow)]
pub struct RentDistribution {
    pub id: i32,
    pub property_id: String,
    pub distribution_date: String,
    pub total_amount_usdc: f64,
    pub total_tokens_eligible: i64,
    pub rate_per_token: f64,
    pub tx_signature: Option<String>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct TokenHolding {
    pub id: i32,
    pub property_id: String,
    pub holder_wallet: String,
    pub token_amount: i64,
    pub last_updated: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct PropertyCorrelation {
    pub id: String,
    pub name: String,
    pub status: String,
    pub on_chain_address: Option<String>,
    pub token_mint: Option<String>,
    pub metadata_hash: Option<String>,
    pub token_supply: Option<i64>,
    pub tokens_held: Option<i64>,
    pub rent_distributions: Option<i64>,
    pub total_rent_paid: Option<f64>,
    pub created_at: String,
    pub tokenized_at: Option<String>,
}

#[derive(Serialize)]
pub struct CorrelationAnalysis {
    pub property: PropertyCorrelation,
    pub analysis: Vec<String>,
    pub status_check: String,
}

// GET /api/v1/properties/:id/rent_distributions
pub async fn get_rent_distributions(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if let Some(ref pool) = state.db {
        let property_uuid = match Uuid::parse_str(&id) {
            Ok(uuid) => uuid,
            Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid property ID format" }))).into_response(),
        };

        let result = sqlx::query_as::<_, RentDistribution>(
            "SELECT id, property_id::text, distribution_date::text, 
                    total_amount_usdc::float8, total_tokens_eligible, rate_per_token::float8, tx_signature
             FROM rent_distributions 
             WHERE property_id = $1 
             ORDER BY distribution_date DESC"
        )
        .bind(property_uuid)
        .fetch_all(pool)
        .await;

        match result {
            Ok(distributions) => (StatusCode::OK, Json(distributions)).into_response(),
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

// GET /api/v1/properties/:id/token_holdings
pub async fn get_token_holdings(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if let Some(ref pool) = state.db {
        let property_uuid = match Uuid::parse_str(&id) {
            Ok(uuid) => uuid,
            Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid property ID format" }))).into_response(),
        };

        let result = sqlx::query_as::<_, TokenHolding>(
            "SELECT id, property_id::text, holder_wallet, token_amount, last_updated::text
             FROM token_holdings 
             WHERE property_id = $1 AND token_amount > 0
             ORDER BY token_amount DESC"
        )
        .bind(property_uuid)
        .fetch_all(pool)
        .await;

        match result {
            Ok(holdings) => (StatusCode::OK, Json(holdings)).into_response(),
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

// GET /api/v1/properties/:id/claimable_rent/:wallet
pub async fn get_claimable_rent(
    Path((id, wallet)): Path<(String, String)>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if let Some(ref pool) = state.db {
        let property_uuid = match Uuid::parse_str(&id) {
            Ok(uuid) => uuid,
            Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "Invalid property ID format" }))).into_response(),
        };

        // Get user's token balance
        let token_balance_result = sqlx::query_scalar::<_, i64>(
            "SELECT COALESCE(token_amount, 0) FROM token_holdings WHERE property_id = $1 AND holder_wallet = $2"
        )
        .bind(property_uuid)
        .bind(&wallet)
        .fetch_optional(pool)
        .await;

        let token_balance = match token_balance_result {
            Ok(Some(balance)) => balance,
            Ok(None) => 0,
            Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        };

        if token_balance == 0 {
            return (StatusCode::OK, Json(serde_json::json!({ 
                "claimable_usdc": "0.00",
                "token_balance": 0,
                "distributions_count": 0 
            }))).into_response();
        }

        // Calculate claimable rent from all distributions
        let claimable_result = sqlx::query_scalar::<_, f64>(
            "SELECT COALESCE(SUM(rate_per_token * $2), 0) 
             FROM rent_distributions 
             WHERE property_id = $1"
        )
        .bind(property_uuid)
        .bind(token_balance as f64)
        .fetch_one(pool)
        .await;

        let distributions_count_result = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM rent_distributions WHERE property_id = $1"
        )
        .bind(property_uuid)
        .fetch_one(pool)
        .await;

        match (claimable_result, distributions_count_result) {
            (Ok(claimable), Ok(count)) => {
                (StatusCode::OK, Json(serde_json::json!({ 
                    "claimable_usdc": format!("{:.2}", claimable),
                    "token_balance": token_balance,
                    "distributions_count": count 
                }))).into_response()
            }
            (Err(e), _) | (_, Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}

// GET /api/v1/admin/correlation_analysis
pub async fn get_correlation_analysis(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if let Some(ref pool) = state.db {
        let result = sqlx::query_as::<_, PropertyCorrelation>(
            "SELECT 
                p.id::text,
                p.name,
                p.status,
                p.on_chain_address,
                p.token_mint,
                p.metadata_hash,
                p.token_supply,
                COALESCE(th.total_tokens_held, 0) as tokens_held,
                COALESCE(rd.total_distributions, 0) as rent_distributions,
                COALESCE(rd.total_rent_paid, 0) as total_rent_paid,
                p.created_at::text,
                p.tokenized_at::text
            FROM properties p
            LEFT JOIN (
                SELECT property_id, 
                       SUM(token_amount) as total_tokens_held
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
            ORDER BY p.created_at DESC"
        )
        .fetch_all(pool)
        .await;

        match result {
            Ok(properties) => {
                let analysis: Vec<CorrelationAnalysis> = properties.into_iter().map(|prop| {
                    let mut analysis_points = Vec::new();
                    let mut status_check = String::new();

                    // Check on-chain vs database consistency
                    let has_on_chain = prop.on_chain_address.is_some() && prop.token_mint.is_some();
                    let has_tokens = prop.tokens_held.unwrap_or(0) > 0;
                    let has_rent = prop.rent_distributions.unwrap_or(0) > 0;

                    match prop.status.as_str() {
                        "pending_verification" => {
                            status_check = "⏳ Awaiting verification".to_string();
                            analysis_points.push("Property submitted and pending admin review".to_string());
                        }
                        "verified" => {
                            status_check = "✅ Verified, ready for tokenization".to_string();
                            analysis_points.push("Property verified by admin, can be tokenized".to_string());
                        }
                        "pending_tokenization" => {
                            status_check = "⏳ Tokenization requested".to_string();
                            analysis_points.push("Owner requested tokenization, awaiting admin approval".to_string());
                        }
                        "tokenized" => {
                            if has_on_chain && has_tokens {
                                status_check = "✅ Fully tokenized and active".to_string();
                                analysis_points.push("Property successfully tokenized with active token holders".to_string());
                            } else if has_on_chain && !has_tokens {
                                status_check = "⚠️ Tokenized but no holders".to_string();
                                analysis_points.push("On-chain deployment successful but no token holders recorded".to_string());
                                analysis_points.push("This could indicate tokens haven't been distributed yet".to_string());
                            } else {
                                status_check = "❌ Data inconsistency".to_string();
                                analysis_points.push("Status shows 'tokenized' but missing on-chain deployment data".to_string());
                                analysis_points.push("This indicates a problem in the tokenization process".to_string());
                            }
                        }
                        _ => {
                            status_check = format!("ℹ️ Status: {}", prop.status);
                        }
                    }

                    // Token supply analysis
                    if let (Some(supply), Some(held)) = (prop.token_supply, prop.tokens_held) {
                        let percentage = (held as f64 / supply as f64) * 100.0;
                        analysis_points.push(format!("Token distribution: {:.1}% ({} of {} tokens held)", 
                            percentage, held, supply));
                        
                        if percentage < 50.0 {
                            analysis_points.push("Low token distribution - consider marketing to investors".to_string());
                        } else if percentage > 95.0 {
                            analysis_points.push("Nearly fully distributed - high investor interest".to_string());
                        }
                    }

                    // Rent distribution analysis
                    if has_rent {
                        let total_rent = prop.total_rent_paid.unwrap_or(0.0);
                        analysis_points.push(format!("Rent history: {} distributions totaling ${:.2}", 
                            prop.rent_distributions.unwrap_or(0), total_rent));
                        
                        if total_rent > 1000.0 {
                            analysis_points.push("Strong rental income performance".to_string());
                        }
                    } else if prop.status == "tokenized" {
                        analysis_points.push("No rent distributions yet - property may be newly tokenized".to_string());
                    }

                    // Blockchain verification suggestions
                    if has_on_chain {
                        analysis_points.push(format!("On-chain verification: Check token mint {} on Solana explorer", 
                            prop.token_mint.as_ref().unwrap_or(&"N/A".to_string())));
                    }

                    CorrelationAnalysis {
                        property: prop,
                        analysis: analysis_points,
                        status_check,
                    }
                }).collect();

                (StatusCode::OK, Json(analysis)).into_response()
            }
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": e.to_string() }))).into_response(),
        }
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({ "error": "Database not connected" }))).into_response()
    }
}