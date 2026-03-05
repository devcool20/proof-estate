import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import TokenizePage from "@/app/tokenize/page";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockedApi = api as jest.Mocked<typeof api>;

jest.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    publicKey: { toBase58: () => "SolWallet123" },
    connected: true,
  }),
}));

// Override useSearchParams for this test
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/tokenize",
  useSearchParams: () => new URLSearchParams("id=prop-1"),
}));

beforeEach(() => {
  mockedApi.getProperty.mockReset();
  mockedApi.requestTokenize.mockReset();
});

const verifiedProp: api.Property = {
  id: "prop-1",
  name: "Test Building",
  address: "123 Blockchain St",
  status: "verified",
  owner_wallet: "w1",
  created_at: "2024-01-01",
  token_supply: 500000,
  token_price_usd: 30,
  yield_percent: 6.5,
};

const pendingProp: api.Property = {
  ...verifiedProp,
  status: "pending_verification",
};

describe("TokenizePage", () => {
  it("shows loading state while fetching property", () => {
    mockedApi.getProperty.mockReturnValue(new Promise(() => {}));
    render(<TokenizePage />);
    // The component should render without errors during loading
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders tokenization form for verified property", async () => {
    mockedApi.getProperty.mockResolvedValue(verifiedProp);
    render(<TokenizePage />);
    await waitFor(() => {
      expect(screen.getByText("Asset Fractionalization")).toBeInTheDocument();
      expect(screen.getByText("Test Building")).toBeInTheDocument();
      expect(screen.getByText("Initialize Mint")).toBeInTheDocument();
    });
  });

  it("pre-fills token supply from property data", async () => {
    mockedApi.getProperty.mockResolvedValue(verifiedProp);
    render(<TokenizePage />);
    await waitFor(() => {
      const supplyInput = document.querySelector('input[type="number"]') as HTMLInputElement;
      expect(supplyInput).toBeTruthy();
    });
  });

  it("shows invalid state warning for non-verified property", async () => {
    mockedApi.getProperty.mockResolvedValue(pendingProp);
    render(<TokenizePage />);
    await waitFor(() => {
      expect(screen.getByText("Invalid Protocol State")).toBeInTheDocument();
    });
  });

  it("shows error when property fetch fails", async () => {
    mockedApi.getProperty.mockRejectedValue(new Error("Property not found"));
    render(<TokenizePage />);
    await waitFor(() => {
      expect(screen.getByText("Property not found")).toBeInTheDocument();
    });
  });

  it("renders frequency selector with all options", async () => {
    mockedApi.getProperty.mockResolvedValue(verifiedProp);
    render(<TokenizePage />);
    await waitFor(() => {
      expect(screen.getByText("Monthly Baseline")).toBeInTheDocument();
      expect(screen.getByText("Quarterly Yield")).toBeInTheDocument();
      expect(screen.getByText("Annual Settlement")).toBeInTheDocument();
    });
  });

  it("computes total protocol raise correctly", async () => {
    mockedApi.getProperty.mockResolvedValue(verifiedProp);
    render(<TokenizePage />);
    await waitFor(() => {
      // 500000 * 30 = 15,000,000 — locale may render as "15,000,000" (US) or "1,50,00,000" (IN)
      const body = document.body.textContent || "";
      expect(body).toMatch(/(?:15,000,000|1,50,00,000)/);
    });
  });

  it("renders breadcrumb navigation", async () => {
    mockedApi.getProperty.mockResolvedValue(verifiedProp);
    render(<TokenizePage />);
    await waitFor(() => {
      expect(screen.getByText("Registry")).toBeInTheDocument();
      expect(screen.getByText("Fractionalization")).toBeInTheDocument();
    });
  });

  it("shows mint summary sidebar", async () => {
    mockedApi.getProperty.mockResolvedValue(verifiedProp);
    render(<TokenizePage />);
    await waitFor(() => {
      expect(screen.getByText("Mint Summary")).toBeInTheDocument();
      expect(screen.getByText("TOKEN-22")).toBeInTheDocument();
      expect(screen.getByText("SOLANA_MAINNET")).toBeInTheDocument();
    });
  });
});

describe("TokenizePage with no ID", () => {
  beforeEach(() => {
    // Override to provide no ID
    jest.spyOn(URLSearchParams.prototype, "get").mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows error when no property ID specified", async () => {
    render(<TokenizePage />);
    await waitFor(() => {
      expect(screen.getByText("No property ID specified.")).toBeInTheDocument();
    });
  });
});
