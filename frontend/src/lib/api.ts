// ProofEstate API client
// Talks to the Rust/Axum backend at localhost:8080

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type PropertyStatus = "draft" | "pending_verification" | "verified" | "tokenized" | "rejected";
export type PropertyType = "residential" | "commercial" | "land" | "warehouse";
export type DistFrequency = "monthly" | "quarterly" | "annually";

export interface Property {
    id: string;
    name: string;
    address: string;
    city?: string;
    country?: string;
    area_sqft?: number;
    property_type?: PropertyType;
    asset_value_inr?: number;
    metadata_hash?: string;
    on_chain_address?: string;
    token_mint?: string;
    status: PropertyStatus;
    token_supply?: number;
    token_price_usd?: number;
    yield_percent?: number;
    dist_frequency?: DistFrequency;
    owner_wallet: string;
    submitted_at?: string;
    verified_at?: string;
    tokenized_at?: string;
    created_at: string;
    document_url?: string;
}

export interface SubmitPropertyPayload {
    owner_wallet: string;
    name: string;
    address: string;
    city?: string;
    property_type?: PropertyType;
    area_sqft?: number;
    asset_value_inr?: number;
    document_url?: string;
}

export interface TokenizePayload {
    owner_wallet: string;
    token_supply: number;
    token_price_usd: number;
    yield_percent: number;
    dist_frequency?: DistFrequency;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "API error");
    }
    return res.json() as Promise<T>;
}

// List all properties (optionally filtered by status)
export async function listProperties(status?: PropertyStatus): Promise<Property[]> {
    const qs = status ? `?status=${status}` : "";
    return request<Property[]>(`/api/v1/properties${qs}`);
}

// Get a single property
export async function getProperty(id: string): Promise<Property> {
    return request<Property>(`/api/v1/properties/${id}`);
}

// Submit a property for verification
export async function submitProperty(payload: SubmitPropertyPayload) {
    return request<{ property_id: string; metadata_hash: string; status: string; message: string }>(
        "/api/v1/properties/submit",
        { method: "POST", body: JSON.stringify(payload) }
    );
}

// Verify a property (admin/verifier only)
export async function verifyProperty(id: string, verifier_wallet: string, approved: boolean, notes?: string) {
    return request<{ new_status: string; message: string }>(
        `/api/v1/properties/${id}/verify`,
        { method: "PATCH", body: JSON.stringify({ verifier_wallet, approved, notes }) }
    );
}

// Tokenize a verified property
export async function tokenizeProperty(id: string, payload: TokenizePayload) {
    return request<{ property_id: string; token_mint: string; token_supply: number; status: string; message: string }>(
        `/api/v1/properties/${id}/tokenize`,
        { method: "POST", body: JSON.stringify(payload) }
    );
}

// List tokenized properties for investors/marketplace
export async function listMarketplace(): Promise<Property[]> {
    return request<Property[]>("/api/v1/marketplace");
}
