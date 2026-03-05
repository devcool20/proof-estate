import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import PropertiesPage from "@/app/properties/page";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockedApi = api as jest.Mocked<typeof api>;

const mockUseAuth = jest.fn();
jest.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  mockUseAuth.mockReset();
  mockedApi.listProperties.mockReset();
});

const ownerWallet = "owner_w1";

const props: api.Property[] = [
  {
    id: "1",
    name: "Verified Prop",
    address: "123 St",
    status: "verified",
    owner_wallet: ownerWallet,
    created_at: "2024-01-01",
    asset_value_inr: 850000000,
  },
  {
    id: "2",
    name: "Tokenized Prop",
    address: "456 Ave",
    status: "tokenized",
    owner_wallet: ownerWallet,
    created_at: "2024-01-02",
    token_mint: "MintXYZ",
    metadata_hash: "abc123",
  },
  {
    id: "3",
    name: "Other Owner Prop",
    address: "789 Blvd",
    status: "verified",
    owner_wallet: "different_owner",
    created_at: "2024-01-03",
  },
  {
    id: "4",
    name: "Pending Prop",
    address: "Pending St",
    status: "pending_verification",
    owner_wallet: ownerWallet,
    created_at: "2024-01-04",
  },
  {
    id: "5",
    name: "Rejected Prop",
    address: "Rejected Rd",
    status: "rejected",
    owner_wallet: ownerWallet,
    created_at: "2024-01-05",
  },
];

describe("PropertiesPage", () => {
  it("shows empty state when no user is logged in", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<PropertiesPage />);
    await waitFor(() => {
      expect(screen.getByText("Registry Empty")).toBeInTheDocument();
    });
  });

  it("filters properties to only show the current owner's", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockResolvedValue(props);

    render(<PropertiesPage />);
    await waitFor(() => {
      expect(screen.getByText("Verified Prop")).toBeInTheDocument();
      expect(screen.getByText("Tokenized Prop")).toBeInTheDocument();
      expect(screen.queryByText("Other Owner Prop")).not.toBeInTheDocument();
    });
  });

  it("shows tokenization CTA for verified properties", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockResolvedValue(props);

    render(<PropertiesPage />);
    await waitFor(() => {
      expect(screen.getByText("Initialize Tokenization")).toBeInTheDocument();
    });
  });

  it("shows 'Trading Live on Solana' for tokenized properties", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockResolvedValue(props);

    render(<PropertiesPage />);
    await waitFor(() => {
      expect(screen.getByText("Trading Live on Solana")).toBeInTheDocument();
    });
  });

  it("shows pending verification status badge", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockResolvedValue(props);

    render(<PropertiesPage />);
    await waitFor(() => {
      expect(screen.getByText("Registry Verification")).toBeInTheDocument();
    });
  });

  it("shows rejected status badge", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockResolvedValue(props);

    render(<PropertiesPage />);
    await waitFor(() => {
      expect(screen.getByText("Validation Failed")).toBeInTheDocument();
    });
  });

  it("displays token_mint and metadata_hash on tokenized cards", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockResolvedValue(props);

    render(<PropertiesPage />);
    await waitFor(() => {
      expect(screen.getByText("MintXYZ")).toBeInTheDocument();
      expect(screen.getByText("abc123")).toBeInTheDocument();
    });
  });

  it("shows error when API fails", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockRejectedValue(new Error("Connection refused"));

    render(<PropertiesPage />);
    await waitFor(() => {
      expect(screen.getByText("Connection refused")).toBeInTheDocument();
    });
  });

  it("has a 'Register New Asset' link pointing to /verify", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockResolvedValue([]);

    render(<PropertiesPage />);
    await waitFor(() => {
      const link = screen.getByText("Initialize Asset");
      expect(link.closest("a")).toHaveAttribute("href", "/verify");
    });
  });

  it("renders status legend badges", () => {
    mockUseAuth.mockReturnValue({ user: { wallet: ownerWallet, role: "owner" } });
    mockedApi.listProperties.mockReturnValue(new Promise(() => {}));
    render(<PropertiesPage />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Under Review")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Tokenizing")).toBeInTheDocument();
    expect(screen.getByText("Tokenized")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });
});
