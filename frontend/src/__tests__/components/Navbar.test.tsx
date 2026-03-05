import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────
const mockUseAuth = jest.fn();
jest.mock("@/lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children }: any) => <div data-testid="sign-in-btn">{children}</div>,
  Show: ({ when, children }: any) => <div data-testid={`show-${when}`}>{children}</div>,
  UserButton: Object.assign(
    ({ children }: any) => <div data-testid="user-button">{children}</div>,
    {
      MenuItems: ({ children }: any) => <div>{children}</div>,
      Link: ({ label }: any) => <span>{label}</span>,
    }
  ),
}));

jest.mock("@/components/WalletButton", () => ({
  WalletConnectButton: () => <button data-testid="wallet-btn">Connect</button>,
}));

import { Navbar } from "@/components/Navbar";

beforeEach(() => {
  mockUseAuth.mockReset();
});

// ================================================================
// Rendering
// ================================================================
describe("Navbar", () => {
  it("renders the brand name ProofEstate", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<Navbar />);
    expect(screen.getByText("ProofEstate")).toBeInTheDocument();
  });

  it("always shows Home link", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<Navbar />);
    expect(screen.getAllByText("Home").length).toBeGreaterThanOrEqual(1);
  });
});

// ================================================================
// Role-based navigation
// ================================================================
describe("role-based navigation links", () => {
  it("shows owner links for owner role", () => {
    mockUseAuth.mockReturnValue({ user: { role: "owner", wallet: "w1" } });
    render(<Navbar />);
    expect(screen.getAllByText("My Properties").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Submit Asset").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Marketplace for investor role", () => {
    mockUseAuth.mockReturnValue({ user: { role: "investor", wallet: "w2" } });
    render(<Navbar />);
    expect(screen.getAllByText("Marketplace").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Admin Dashboard for admin role", () => {
    mockUseAuth.mockReturnValue({ user: { role: "admin", wallet: "w3" } });
    render(<Navbar />);
    expect(screen.getAllByText("Admin Dashboard").length).toBeGreaterThanOrEqual(1);
  });

  it("hides role-specific links when no user", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<Navbar />);
    expect(screen.queryByText("My Properties")).not.toBeInTheDocument();
    expect(screen.queryByText("Marketplace")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
  });
});

// ================================================================
// Mobile menu
// ================================================================
describe("mobile menu toggle", () => {
  it("toggles mobile drawer on button click", () => {
    mockUseAuth.mockReturnValue({ user: { role: "owner", wallet: "w" } });
    render(<Navbar />);

    const toggleBtn = screen.getByText("menu").closest("button")!;
    fireEvent.click(toggleBtn);

    // After opening, the close icon should appear
    expect(screen.getByText("close")).toBeInTheDocument();
  });
});

// ================================================================
// Search bar
// ================================================================
describe("search input", () => {
  it("renders search input in desktop view", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<Navbar />);
    const inputs = screen.getAllByPlaceholderText("Search portfolio...");
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });
});
