import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VerifyPage from "@/app/verify/page";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockedApi = api as jest.Mocked<typeof api>;

const mockUseAuth = jest.fn();
jest.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  mockUseAuth.mockReset();
  mockedApi.submitProperty.mockReset();
  (global.alert as jest.Mock).mockReset();
});

describe("VerifyPage (Submit Property)", () => {
  it("renders step 0 — property details form", () => {
    mockUseAuth.mockReturnValue({ user: { wallet: "clerk_123", role: "owner" } });
    render(<VerifyPage />);
    expect(screen.getByText("Asset Specifications")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. The Obsidian Tower")).toBeInTheDocument();
  });

  it("pre-fills owner_wallet from auth context", () => {
    mockUseAuth.mockReturnValue({ user: { wallet: "clerk_123", role: "owner" } });
    render(<VerifyPage />);
    const walletInput = screen.getByPlaceholderText("Not connected") as HTMLInputElement;
    expect(walletInput.value).toBe("clerk_123");
  });

  it("disables Proceed button when required fields are empty", () => {
    mockUseAuth.mockReturnValue({ user: { wallet: "w", role: "owner" } });
    render(<VerifyPage />);
    const btn = screen.getByText("Proceed Next");
    expect(btn).toBeDisabled();
  });

  it("enables Proceed button when name, address, city are filled", () => {
    mockUseAuth.mockReturnValue({ user: { wallet: "w", role: "owner" } });
    render(<VerifyPage />);

    fireEvent.change(screen.getByPlaceholderText("e.g. The Obsidian Tower"), {
      target: { value: "Test Property" },
    });
    fireEvent.change(screen.getByPlaceholderText("Plot 42, Financial District"), {
      target: { value: "Test Address" },
    });
    fireEvent.change(screen.getByPlaceholderText("Neo-Mumbai"), {
      target: { value: "Delhi" },
    });

    expect(screen.getByText("Proceed Next")).not.toBeDisabled();
  });

  it("navigates through all 3 steps", () => {
    mockUseAuth.mockReturnValue({ user: { wallet: "w", role: "owner" } });
    render(<VerifyPage />);

    // Step 0: Fill form
    fireEvent.change(screen.getByPlaceholderText("e.g. The Obsidian Tower"), {
      target: { value: "My Property" },
    });
    fireEvent.change(screen.getByPlaceholderText("Plot 42, Financial District"), {
      target: { value: "123 Test" },
    });
    fireEvent.change(screen.getByPlaceholderText("Neo-Mumbai"), {
      target: { value: "Delhi" },
    });
    fireEvent.click(screen.getByText("Proceed Next"));

    // Step 1: Document upload
    expect(screen.getByText("Document Cryptography")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm Hash & Proceed"));

    // Step 2: Review & submit
    expect(screen.getByText("Sign & Authorize Submission")).toBeInTheDocument();
  });

  it("shows Go Back button on step 1 and returns to step 0", () => {
    mockUseAuth.mockReturnValue({ user: { wallet: "w", role: "owner" } });
    render(<VerifyPage />);

    // Navigate to step 1
    fireEvent.change(screen.getByPlaceholderText("e.g. The Obsidian Tower"), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByPlaceholderText("Plot 42, Financial District"), {
      target: { value: "Y" },
    });
    fireEvent.change(screen.getByPlaceholderText("Neo-Mumbai"), {
      target: { value: "Z" },
    });
    fireEvent.click(screen.getByText("Proceed Next"));
    expect(screen.getByText("Document Cryptography")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Go Back"));
    expect(screen.getByText("Asset Specifications")).toBeInTheDocument();
  });

  it("submits property and shows success", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: "owner_w", role: "owner" } });
    mockedApi.submitProperty.mockResolvedValue({
      property_id: "new-uuid",
      metadata_hash: "abcdef123456",
      status: "pending_verification",
      message: "Submitted!",
    });

    render(<VerifyPage />);

    // Step 0
    fireEvent.change(screen.getByPlaceholderText("e.g. The Obsidian Tower"), {
      target: { value: "My House" },
    });
    fireEvent.change(screen.getByPlaceholderText("Plot 42, Financial District"), {
      target: { value: "Addr" },
    });
    fireEvent.change(screen.getByPlaceholderText("Neo-Mumbai"), {
      target: { value: "City" },
    });
    fireEvent.click(screen.getByText("Proceed Next"));

    // Step 1
    fireEvent.click(screen.getByText("Confirm Hash & Proceed"));

    // Step 2
    fireEvent.click(screen.getByText("Authorize On-Chain"));

    await waitFor(() => {
      expect(mockedApi.submitProperty).toHaveBeenCalled();
      expect(screen.getByText("Protocol Initiated")).toBeInTheDocument();
      expect(screen.getByText("new-uuid")).toBeInTheDocument();
    });
  });

  it("shows error when not logged in and trying to submit", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<VerifyPage />);

    // Navigate to step 2
    fireEvent.change(screen.getByPlaceholderText("e.g. The Obsidian Tower"), {
      target: { value: "P" },
    });
    fireEvent.change(screen.getByPlaceholderText("Plot 42, Financial District"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("Neo-Mumbai"), {
      target: { value: "C" },
    });
    fireEvent.click(screen.getByText("Proceed Next"));
    fireEvent.click(screen.getByText("Confirm Hash & Proceed"));
    fireEvent.click(screen.getByText("Authorize On-Chain"));

    await waitFor(() => {
      expect(screen.getByText(/must be logged in/i)).toBeInTheDocument();
    });
  });

  it("shows API error on submission failure", async () => {
    mockUseAuth.mockReturnValue({ user: { wallet: "w", role: "owner" } });
    mockedApi.submitProperty.mockRejectedValue(new Error("Server down"));

    render(<VerifyPage />);

    fireEvent.change(screen.getByPlaceholderText("e.g. The Obsidian Tower"), {
      target: { value: "P" },
    });
    fireEvent.change(screen.getByPlaceholderText("Plot 42, Financial District"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("Neo-Mumbai"), {
      target: { value: "C" },
    });
    fireEvent.click(screen.getByText("Proceed Next"));
    fireEvent.click(screen.getByText("Confirm Hash & Proceed"));
    fireEvent.click(screen.getByText("Authorize On-Chain"));

    await waitFor(() => {
      expect(screen.getByText("Server down")).toBeInTheDocument();
    });
  });

  it("renders stepper with 3 steps", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<VerifyPage />);
    expect(screen.getByText("Property Details")).toBeInTheDocument();
    expect(screen.getByText("Document Hash")).toBeInTheDocument();
    expect(screen.getByText("Sign & Submit")).toBeInTheDocument();
  });

  it("renders property_type select with all options", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<VerifyPage />);
    expect(screen.getByText("Commercial Space")).toBeInTheDocument();
    expect(screen.getByText("Residential Unit")).toBeInTheDocument();
    expect(screen.getByText("Raw Land / Plot")).toBeInTheDocument();
    expect(screen.getByText("Industrial / Warehouse")).toBeInTheDocument();
  });
});
