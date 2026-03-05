import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
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
  mockedApi.verifyProperty.mockReset();
  mockedApi.approveTokenize.mockReset();
  (global.alert as jest.Mock).mockReset();
});

const pendingProp: api.Property = {
  id: "p1",
  name: "Pending Prop",
  address: "123 St",
  status: "pending_verification",
  owner_wallet: "w1",
  created_at: "2024-01-01",
};

const tokenizeProp: api.Property = {
  id: "p2",
  name: "Tokenize Prop",
  address: "456 Ave",
  status: "pending_tokenization",
  owner_wallet: "w1",
  created_at: "2024-01-02",
  token_supply: 1000,
  token_price_usd: 25,
  yield_percent: 7,
};

describe("AdminPage", () => {
  it("shows restricted access for non-admin users", () => {
    mockUseAuth.mockReturnValue({ user: { role: "investor", wallet: "w" } });
    render(<AdminPage />);
    expect(screen.getByText("Restricted Access")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "admin" } });
    mockedApi.listProperties.mockReturnValue(new Promise(() => {}));
    render(<AdminPage />);
    // No assertion — just verifying it doesn't crash while loading
  });

  it("shows empty queue when no pending properties", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "admin" } });
    mockedApi.listProperties.mockResolvedValue([]);
    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByText("Queue Clear")).toBeInTheDocument();
    });
  });

  it("shows pending verification items", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "admin" } });
    mockedApi.listProperties.mockResolvedValue([pendingProp]);
    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByText("Pending Prop")).toBeInTheDocument();
      expect(screen.getByText("Execute Approval")).toBeInTheDocument();
      expect(screen.getByText("Reject")).toBeInTheDocument();
    });
  });

  it("shows pending tokenization items", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "admin" } });
    mockedApi.listProperties.mockResolvedValue([tokenizeProp]);
    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByText("Tokenize Prop")).toBeInTheDocument();
      expect(screen.getByText("Authorize Token Mint")).toBeInTheDocument();
    });
  });

  it("calls verifyProperty on approve click", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "admin" } });
    mockedApi.listProperties.mockResolvedValue([pendingProp]);
    mockedApi.verifyProperty.mockResolvedValue({ new_status: "verified", message: "Approved!" });

    render(<AdminPage />);
    await waitFor(() => screen.getByText("Execute Approval"));

    fireEvent.click(screen.getByText("Execute Approval"));
    await waitFor(() => {
      expect(mockedApi.verifyProperty).toHaveBeenCalledWith("p1", "admin", true, expect.any(String));
      expect(global.alert).toHaveBeenCalledWith("Approved!");
    });
  });

  it("calls verifyProperty with approved=false on reject", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "admin" } });
    mockedApi.listProperties.mockResolvedValue([pendingProp]);
    mockedApi.verifyProperty.mockResolvedValue({ new_status: "rejected", message: "Rejected" });

    render(<AdminPage />);
    await waitFor(() => screen.getByText("Reject"));

    fireEvent.click(screen.getByText("Reject"));
    await waitFor(() => {
      expect(mockedApi.verifyProperty).toHaveBeenCalledWith("p1", "admin", false, expect.any(String));
    });
  });

  it("calls approveTokenize on mint authorization", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "admin" } });
    mockedApi.listProperties.mockResolvedValue([tokenizeProp]);
    mockedApi.approveTokenize.mockResolvedValue({
      property_id: "p2",
      token_mint: "MintXYZ",
      status: "tokenized",
      message: "Done",
    });

    render(<AdminPage />);
    await waitFor(() => screen.getByText("Authorize Token Mint"));

    fireEvent.click(screen.getByText("Authorize Token Mint"));
    await waitFor(() => {
      expect(mockedApi.approveTokenize).toHaveBeenCalledWith("p2", "admin");
    });
  });

  it("shows error state when API fails", async () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "admin" } });
    mockedApi.listProperties.mockRejectedValue(new Error("Network error"));

    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("renders for null user (loading state)", () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockedApi.listProperties.mockReturnValue(new Promise(() => {}));
    const { container } = render(<AdminPage />);
    expect(container).toBeTruthy();
  });
});
