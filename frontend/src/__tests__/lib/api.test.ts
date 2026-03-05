import {
  listProperties,
  getProperty,
  submitProperty,
  verifyProperty,
  requestTokenize,
  approveTokenize,
  listMarketplace,
  getUserProfile,
  createUserProfile,
  getDocUrl,
} from "@/lib/api";

// ── Global fetch mock ──────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Helpers ────────────────────────────────────────────────────
function jsonOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

function jsonError(status: number, body: { error: string }) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: "Error",
    json: () => Promise.resolve(body),
  } as Response);
}

// ================================================================
// listProperties
// ================================================================
describe("listProperties", () => {
  it("fetches all properties when no status filter given", async () => {
    const props = [{ id: "1", name: "A" }];
    mockFetch.mockReturnValueOnce(jsonOk(props));

    const result = await listProperties();
    expect(result).toEqual(props);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/properties"),
      expect.objectContaining({ headers: { "Content-Type": "application/json" } })
    );
  });

  it("appends ?status= when filter provided", async () => {
    mockFetch.mockReturnValueOnce(jsonOk([]));
    await listProperties("verified");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/properties?status=verified"),
      expect.anything()
    );
  });

  it("throws on API error", async () => {
    mockFetch.mockReturnValueOnce(jsonError(500, { error: "DB fail" }));
    await expect(listProperties()).rejects.toThrow("DB fail");
  });
});

// ================================================================
// getProperty
// ================================================================
describe("getProperty", () => {
  it("fetches a single property by ID", async () => {
    const prop = { id: "abc-123", name: "Test Prop" };
    mockFetch.mockReturnValueOnce(jsonOk(prop));
    const result = await getProperty("abc-123");
    expect(result).toEqual(prop);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/properties/abc-123"),
      expect.anything()
    );
  });

  it("throws on 404", async () => {
    mockFetch.mockReturnValueOnce(jsonError(404, { error: "Property not found" }));
    await expect(getProperty("nonexistent")).rejects.toThrow("Property not found");
  });

  it("throws on invalid uuid (400)", async () => {
    mockFetch.mockReturnValueOnce(jsonError(400, { error: "invalid uuid" }));
    await expect(getProperty("bad")).rejects.toThrow("invalid uuid");
  });
});

// ================================================================
// submitProperty
// ================================================================
describe("submitProperty", () => {
  it("posts property submission payload", async () => {
    const resp = { property_id: "p-1", metadata_hash: "abc", status: "pending_verification", message: "ok" };
    mockFetch.mockReturnValueOnce(jsonOk(resp));

    const result = await submitProperty({
      owner_wallet: "wallet1",
      name: "Test",
      address: "123 St",
    });
    expect(result).toEqual(resp);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/properties/submit");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.owner_wallet).toBe("wallet1");
    expect(body.name).toBe("Test");
  });

  it("throws on missing required field (422)", async () => {
    mockFetch.mockReturnValueOnce(jsonError(422, { error: "name is required" }));
    await expect(
      submitProperty({ owner_wallet: "w", name: "", address: "" })
    ).rejects.toThrow("name is required");
  });
});

// ================================================================
// verifyProperty
// ================================================================
describe("verifyProperty", () => {
  it("sends PATCH with verifier info and approval flag", async () => {
    const resp = { new_status: "verified", message: "done" };
    mockFetch.mockReturnValueOnce(jsonOk(resp));

    const result = await verifyProperty("id-1", "verifier_w", true, "looks good");
    expect(result).toEqual(resp);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/properties/id-1/verify");
    expect(opts.method).toBe("PATCH");
    const body = JSON.parse(opts.body);
    expect(body.approved).toBe(true);
    expect(body.notes).toBe("looks good");
  });

  it("sends rejection when approved=false", async () => {
    mockFetch.mockReturnValueOnce(jsonOk({ new_status: "rejected", message: "rejected" }));
    await verifyProperty("id-1", "v", false);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.approved).toBe(false);
  });
});

// ================================================================
// requestTokenize
// ================================================================
describe("requestTokenize", () => {
  it("posts tokenization request with all fields", async () => {
    const resp = { property_id: "p-1", status: "pending_tokenization", message: "ok" };
    mockFetch.mockReturnValueOnce(jsonOk(resp));

    const payload = {
      owner_wallet: "w1",
      token_supply: 1000,
      token_price_usd: 10,
      yield_percent: 5,
      dist_frequency: "monthly" as const,
      token_mint: "MintXYZ",
      tx_signature: "TxSig123",
    };

    const result = await requestTokenize("p-1", payload);
    expect(result).toEqual(resp);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/properties/p-1/tokenize");
    expect(opts.method).toBe("POST");
  });

  it("throws when property is not verified (400)", async () => {
    mockFetch.mockReturnValueOnce(jsonError(400, { error: "Property is not verified yet" }));
    await expect(
      requestTokenize("p-1", {
        owner_wallet: "w", token_supply: 1, token_price_usd: 1, yield_percent: 1,
      })
    ).rejects.toThrow("Property is not verified yet");
  });

  it("throws when wrong owner (403)", async () => {
    mockFetch.mockReturnValueOnce(jsonError(403, { error: "Not the property owner" }));
    await expect(
      requestTokenize("p-1", {
        owner_wallet: "wrong", token_supply: 1, token_price_usd: 1, yield_percent: 1,
      })
    ).rejects.toThrow("Not the property owner");
  });
});

// ================================================================
// approveTokenize
// ================================================================
describe("approveTokenize", () => {
  it("sends admin approval POST", async () => {
    const resp = { property_id: "p", token_mint: "Mint1", status: "tokenized", message: "ok" };
    mockFetch.mockReturnValueOnce(jsonOk(resp));

    const result = await approveTokenize("p", "admin_wallet");
    expect(result).toEqual(resp);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.admin_wallet).toBe("admin_wallet");
  });

  it("throws when not pending tokenization", async () => {
    mockFetch.mockReturnValueOnce(jsonError(400, { error: "Property is not pending tokenization" }));
    await expect(approveTokenize("p", "admin")).rejects.toThrow("not pending tokenization");
  });
});

// ================================================================
// listMarketplace
// ================================================================
describe("listMarketplace", () => {
  it("fetches marketplace properties", async () => {
    const props = [{ id: "1", status: "tokenized" }];
    mockFetch.mockReturnValueOnce(jsonOk(props));
    const result = await listMarketplace();
    expect(result).toEqual(props);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/marketplace"),
      expect.anything()
    );
  });
});

// ================================================================
// getUserProfile
// ================================================================
describe("getUserProfile", () => {
  it("returns user on success", async () => {
    const user = { wallet: "w1", name: "Alice", role: "investor", created_at: "2024-01-01" };
    mockFetch.mockReturnValueOnce(jsonOk(user));
    const result = await getUserProfile("w1");
    expect(result).toEqual(user);
  });

  it("returns null when user not found", async () => {
    mockFetch.mockReturnValueOnce(jsonError(404, { error: "User not found" }));
    const result = await getUserProfile("nonexistent");
    expect(result).toBeNull();
  });

  it("throws on unexpected errors", async () => {
    mockFetch.mockReturnValueOnce(jsonError(500, { error: "Server error" }));
    await expect(getUserProfile("w1")).rejects.toThrow("Server error");
  });
});

// ================================================================
// createUserProfile
// ================================================================
describe("createUserProfile", () => {
  it("creates a user profile via POST", async () => {
    const user = { wallet: "w1", name: "Bob", role: "owner", created_at: "2024-01-01" };
    mockFetch.mockReturnValueOnce(jsonOk(user));

    const result = await createUserProfile({ wallet: "w1", name: "Bob", role: "owner" });
    expect(result).toEqual(user);
    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
  });
});

// ================================================================
// getDocUrl
// ================================================================
describe("getDocUrl", () => {
  it("returns default image when path is undefined", () => {
    const url = getDocUrl(undefined);
    expect(url).toContain("unsplash.com");
  });

  it("returns the path as-is when it starts with http", () => {
    expect(getDocUrl("https://example.com/doc.pdf")).toBe("https://example.com/doc.pdf");
  });

  it("prepends API_BASE for relative paths", () => {
    const url = getDocUrl("/docs/deed.png");
    expect(url).toContain("/docs/deed.png");
    expect(url).toContain("localhost:3001");
  });

  it("returns default image for empty string", () => {
    const url = getDocUrl("");
    expect(url).toContain("unsplash.com");
  });
});

// ================================================================
// request() error handling edge cases
// ================================================================
describe("request error handling", () => {
  it("handles non-JSON error responses gracefully", async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      } as any)
    );
    await expect(listProperties()).rejects.toThrow("Internal Server Error");
  });

  it("handles network failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(listProperties()).rejects.toThrow("Failed to fetch");
  });
});
