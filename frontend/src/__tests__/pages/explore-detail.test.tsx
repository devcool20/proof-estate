import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockedApi = api as jest.Mocked<typeof api>;

const mockUseAuth = jest.fn();
jest.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    publicKey: { toBase58: () => "SolWallet123" },
    connected: true,
  }),
}));

// Mock React.use to return its argument directly (avoids async suspension in tests)
const originalUse = (React as any).use;
beforeAll(() => {
  (React as any).use = (usable: any) => usable;
});
afterAll(() => {
  (React as any).use = originalUse;
});

beforeEach(() => {
  mockUseAuth.mockReset();
  mockedApi.getProperty.mockReset();
  (global.alert as jest.Mock).mockReset();
});

const tokenizedProp: api.Property = {
  id: "prop-1",
  name: "Nehru Place Tower",
  address: "Nehru Place, New Delhi",
  city: "Delhi",
  status: "tokenized",
  owner_wallet: "w1",
  created_at: "2024-01-01",
  property_type: "commercial",
  yield_percent: 8.5,
  token_price_usd: 45,
  token_supply: 10000,
  dist_frequency: "quarterly",
  token_mint: "MintXYZ123",
  metadata_hash: "abc123def456",
};

const verifiedProp: api.Property = {
  ...tokenizedProp,
  status: "verified",
  token_mint: undefined,
};

import PropertyInvestPage from "@/app/explore/[id]/page";

function renderPage(id = "prop-1") {
  // Pass a plain object; React.use is mocked to return it directly
  return render(<PropertyInvestPage params={{ id } as any} />);
}

describe("PropertyInvestPage", () => {
  it("shows loading spinner initially", () => {
    mockedApi.getProperty.mockReturnValue(new Promise(() => {}));
    mockUseAuth.mockReturnValue({ user: null });
    renderPage();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("shows error state when property not found", async () => {
    mockedApi.getProperty.mockRejectedValue(new Error("Property not found"));
    mockUseAuth.mockReturnValue({ user: null });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error loading asset")).toBeInTheDocument();
    });
  });

  it("renders property details after loading", async () => {
    mockedApi.getProperty.mockResolvedValue(tokenizedProp);
    mockUseAuth.mockReturnValue({ user: { role: "investor", wallet: "w2" } });
    
    await act(async () => {
      renderPage();
    });
    
    await waitFor(() => {
      expect(screen.getByText("Nehru Place Tower")).toBeInTheDocument();
    });
  });

  it("shows yield and price stats", async () => {
    mockedApi.getProperty.mockResolvedValue(tokenizedProp);
    mockUseAuth.mockReturnValue({ user: { role: "investor", wallet: "w2" } });
    
    await act(async () => {
      renderPage();
    });
    
    await waitFor(() => {
      expect(screen.getByText("8.5%")).toBeInTheDocument();
    });
  });

  it("shows investment form for investor users", async () => {
    mockedApi.getProperty.mockResolvedValue(tokenizedProp);
    mockUseAuth.mockReturnValue({ user: { role: "investor", wallet: "w2" } });
    
    await act(async () => {
      renderPage();
    });
    
    await waitFor(() => {
      expect(screen.getByText("Participate")).toBeInTheDocument();
    });
  });

  it("shows lock message for non-investor users", async () => {
    mockedApi.getProperty.mockResolvedValue(tokenizedProp);
    mockUseAuth.mockReturnValue({ user: { role: "owner", wallet: "w2" } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Identity authorization required/)).toBeInTheDocument();
    });
  });

  it("shows lock message when no user logged in", async () => {
    mockedApi.getProperty.mockResolvedValue(tokenizedProp);
    mockUseAuth.mockReturnValue({ user: null });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Identity authorization required/)).toBeInTheDocument();
    });
  });

  it("shows metadata hash and token mint", async () => {
    mockedApi.getProperty.mockResolvedValue(tokenizedProp);
    mockUseAuth.mockReturnValue({ user: { role: "investor", wallet: "w2" } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("abc123def456")).toBeInTheDocument();
      expect(screen.getByText("MintXYZ123")).toBeInTheDocument();
    });
  });

  it("shows back to marketplace link on error", async () => {
    mockedApi.getProperty.mockRejectedValue(new Error("Not found"));
    mockUseAuth.mockReturnValue({ user: null });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Back to Marketplace")).toBeInTheDocument();
    });
  });

  it("renders Asset Intelligence section", async () => {
    mockedApi.getProperty.mockResolvedValue(tokenizedProp);
    mockUseAuth.mockReturnValue({ user: { role: "investor", wallet: "w2" } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Asset Intelligence")).toBeInTheDocument();
    });
  });

  it("shows Initializing State when no token_mint", async () => {
    mockedApi.getProperty.mockResolvedValue(verifiedProp);
    mockUseAuth.mockReturnValue({ user: { role: "investor", wallet: "w2" } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Initializing State/)).toBeInTheDocument();
    });
  });
});
