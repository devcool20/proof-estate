// ProofEstate API client
// Talks to the Rust/Axum backend at localhost:8080

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const GET_CACHE_TTL_MS = 30_000;

const responseCache = new Map<string, { expiry: number; data: unknown }>();
const inflightCache = new Map<string, Promise<unknown>>();

export type PropertyStatus = "draft" | "pending_verification" | "verified" | "pending_tokenization" | "tokenized" | "rejected";
export type PropertyType = "residential" | "commercial" | "land" | "warehouse";
export type DistFrequency = "monthly" | "quarterly" | "annually";

export type UserRole = "owner" | "investor" | "verifier" | "admin";

export interface User {
    wallet: string;
    name?: string;
    email?: string;
    role: UserRole;
    created_at: string;
}

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
    image_url?: string;
    description?: string;
    amenities?: string[];
    location_benefits?: string[];
    market_analysis?: string;
    risk_assessment?: string;
    legal_status?: string;
    environmental_clearance?: boolean;
    building_approvals?: string[];
    total_floors?: number;
    parking_spaces?: number;
    construction_year?: number;
    last_renovation_year?: number;
    latitude?: number;
    longitude?: number;
    images?: string[];
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
    image_url?: string;
}

export interface TokenizePayload {
    owner_wallet: string;
    token_supply: number;
    token_price_usd: number;
    yield_percent: number;
    dist_frequency?: DistFrequency;
    token_mint?: string;
    tx_signature?: string;
}

function isGetRequest(options?: RequestInit): boolean {
    return !options?.method || options.method.toUpperCase() === "GET";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const cacheKey = `${API_BASE}${path}`;
    const canUseCache = isGetRequest(options);

    if (canUseCache) {
        const cached = responseCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            return cached.data as T;
        }

        const inflight = inflightCache.get(cacheKey);
        if (inflight) {
            return inflight as Promise<T>;
        }
    }

    const requestPromise = (async (): Promise<T> => {
        let res: Response;
        try {
            res = await fetch(cacheKey, {
                headers: { "Content-Type": "application/json" },
                ...options,
            });
        } catch {
            throw new Error(`Backend unavailable at ${API_BASE}`);
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || "API error");
        }

        const data = (await res.json()) as T;
        if (canUseCache) {
            responseCache.set(cacheKey, { expiry: Date.now() + GET_CACHE_TTL_MS, data });
        } else {
            responseCache.delete(cacheKey);
        }
        return data;
    })();

    if (canUseCache) {
        inflightCache.set(cacheKey, requestPromise as Promise<unknown>);
    }

    try {
        return await requestPromise;
    } finally {
        if (canUseCache) inflightCache.delete(cacheKey);
    }
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

// Tokenize requested by owner
export async function requestTokenize(id: string, payload: TokenizePayload) {
    return request<{ property_id: string; status: string; message: string }>(
        `/api/v1/properties/${id}/tokenize`,
        { method: "POST", body: JSON.stringify(payload) }
    );
}

// Tokenize approved by admin
export async function approveTokenize(id: string, admin_wallet: string) {
    return request<{ property_id: string; token_mint: string; status: string; message: string }>(
        `/api/v1/properties/${id}/approve_tokenization`,
        { method: "POST", body: JSON.stringify({ admin_wallet }) }
    );
}

// List tokenized properties for investors/marketplace
export async function listMarketplace(): Promise<Property[]> {
    return request<Property[]>("/api/v1/marketplace");
}

// User Profiles
export async function getUserProfile(wallet: string): Promise<User | null> {
    try {
        return await request<User>(`/api/v1/users/${wallet}`);
    } catch (e: unknown) {
        if (e instanceof Error && e.message === "User not found") return null;
        throw e;
    }
}

export async function createUserProfile(payload: { wallet: string; name?: string; email?: string; role: string }): Promise<User> {
    return request<User>("/api/v1/users", { method: "POST", body: JSON.stringify(payload) });
}

// Helper to get absolute URL for documents from backend
export function getDocUrl(path?: string) {
    if (!path || path.length < 5 || (!path.includes("/") && !path.includes("\\") && !path.includes("."))) {
        return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=2000";
    }
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE}${cleanPath}`;
}
