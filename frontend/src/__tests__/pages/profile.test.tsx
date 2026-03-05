import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "@/app/profile/page";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockedApi = api as jest.Mocked<typeof api>;

const mockSetUser = jest.fn();
const mockUseAuth = jest.fn();
jest.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({ publicKey: { toBase58: () => "SolWallet123" } }),
}));

beforeEach(() => {
  mockUseAuth.mockReset();
  mockSetUser.mockReset();
  mockedApi.createUserProfile.mockReset();
  (global.alert as jest.Mock).mockReset();
});

describe("ProfilePage", () => {
  it("renders profile form", () => {
    mockUseAuth.mockReturnValue({ user: null, setUser: mockSetUser });
    render(<ProfilePage />);
    expect(screen.getByText("Protocol Profile")).toBeInTheDocument();
  });

  it("shows wallet address from Solana adapter", () => {
    mockUseAuth.mockReturnValue({ user: null, setUser: mockSetUser });
    render(<ProfilePage />);
    expect(screen.getByText("SolWallet123")).toBeInTheDocument();
  });

  it("pre-fills name and role from existing user", () => {
    mockUseAuth.mockReturnValue({
      user: { wallet: "w1", name: "Alice", email: "a@b.com", role: "investor" },
      setUser: mockSetUser,
    });
    render(<ProfilePage />);
    const nameInput = screen.getByPlaceholderText("E.g. Wayne Enterprises") as HTMLInputElement;
    expect(nameInput.value).toBe("Alice");
  });

  it("shows role toggles for non-elevated users", () => {
    mockUseAuth.mockReturnValue({
      user: { wallet: "w1", role: "investor" },
      setUser: mockSetUser,
    });
    render(<ProfilePage />);
    expect(screen.getByText("Retail Investor")).toBeInTheDocument();
    expect(screen.getByText("Property Owner")).toBeInTheDocument();
  });

  it("shows elevated role notice for admin users", () => {
    mockUseAuth.mockReturnValue({
      user: { wallet: "w1", role: "admin" },
      setUser: mockSetUser,
    });
    render(<ProfilePage />);
    expect(screen.getByText("Elevated Role Active")).toBeInTheDocument();
  });

  it("shows elevated role notice for verifier users", () => {
    mockUseAuth.mockReturnValue({
      user: { wallet: "w1", role: "verifier" },
      setUser: mockSetUser,
    });
    render(<ProfilePage />);
    expect(screen.getByText("Elevated Role Active")).toBeInTheDocument();
  });

  it("submits updated profile on form submit", async () => {
    const updatedUser = { wallet: "SolWallet123", name: "Bob", email: "b@c.com", role: "owner", created_at: "2024" };
    mockedApi.createUserProfile.mockResolvedValue(updatedUser);
    mockUseAuth.mockReturnValue({
      user: { wallet: "SolWallet123", name: "Alice", role: "investor" },
      setUser: mockSetUser,
    });

    render(<ProfilePage />);

    fireEvent.change(screen.getByPlaceholderText("E.g. Wayne Enterprises"), {
      target: { value: "Bob" },
    });

    const ownerLabel = screen.getByText("Property Owner").closest("label")!;
    fireEvent.click(ownerLabel);

    fireEvent.click(screen.getByText("Sync to Protocol"));

    await waitFor(() => {
      expect(mockedApi.createUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ wallet: "SolWallet123", name: "Bob", role: "owner" })
      );
      expect(mockSetUser).toHaveBeenCalledWith(updatedUser);
    });
  });

  it("shows success message after saving", async () => {
    mockedApi.createUserProfile.mockResolvedValue({
      wallet: "SolWallet123",
      name: "X",
      role: "investor",
      created_at: "2024",
    });
    mockUseAuth.mockReturnValue({
      user: { wallet: "SolWallet123", role: "investor" },
      setUser: mockSetUser,
    });

    render(<ProfilePage />);
    fireEvent.change(screen.getByPlaceholderText("E.g. Wayne Enterprises"), {
      target: { value: "X" },
    });
    fireEvent.click(screen.getByText("Sync to Protocol"));

    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully/)).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    mockedApi.createUserProfile.mockRejectedValue(new Error("Server error"));
    mockUseAuth.mockReturnValue({
      user: { wallet: "SolWallet123", role: "investor" },
      setUser: mockSetUser,
    });

    render(<ProfilePage />);
    fireEvent.change(screen.getByPlaceholderText("E.g. Wayne Enterprises"), {
      target: { value: "X" },
    });
    fireEvent.click(screen.getByText("Sync to Protocol"));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("has Cancel link pointing to home", () => {
    mockUseAuth.mockReturnValue({ user: null, setUser: mockSetUser });
    render(<ProfilePage />);
    const cancelLink = screen.getByText("Cancel");
    expect(cancelLink.closest("a")).toHaveAttribute("href", "/");
  });
});
