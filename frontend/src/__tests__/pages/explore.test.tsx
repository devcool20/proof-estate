import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ExplorePage from "@/app/explore/page";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockedApi = api as jest.Mocked<typeof api>;

const sampleProps: api.Property[] = [
  {
    id: "1",
    name: "Delhi Tower",
    address: "Nehru Place",
    status: "tokenized",
    owner_wallet: "w1",
    created_at: "2024-01-01",
    city: "Delhi",
    property_type: "commercial",
    yield_percent: 8.5,
    token_price_usd: 45,
    asset_value_inr: 120000000,
    document_url: "/docs/deed.png",
  },
  {
    id: "2",
    name: "Okhla Plot",
    address: "Okhla",
    status: "verified",
    owner_wallet: "w2",
    created_at: "2024-01-02",
    city: "Delhi",
    property_type: "warehouse",
    yield_percent: 6.0,
    token_price_usd: 10,
    asset_value_inr: 18000000,
  },
];

describe("ExplorePage", () => {
  it("shows loading skeletons initially", () => {
    mockedApi.listMarketplace.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ExplorePage />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders property cards after loading", async () => {
    mockedApi.listMarketplace.mockResolvedValue(sampleProps);
    render(<ExplorePage />);
    await waitFor(() => {
      expect(screen.getByText("Delhi Tower")).toBeInTheDocument();
      expect(screen.getByText("Okhla Plot")).toBeInTheDocument();
    });
  });

  it("displays empty state when no properties", async () => {
    mockedApi.listMarketplace.mockResolvedValue([]);
    render(<ExplorePage />);
    await waitFor(() => {
      expect(screen.getByText("No active listings synchronized.")).toBeInTheDocument();
    });
  });

  it("shows yield and price on cards", async () => {
    mockedApi.listMarketplace.mockResolvedValue(sampleProps);
    render(<ExplorePage />);
    await waitFor(() => {
      expect(screen.getByText("8.5%")).toBeInTheDocument();
      expect(screen.getByText("$45")).toBeInTheDocument();
    });
  });

  it("renders metric cards", async () => {
    mockedApi.listMarketplace.mockResolvedValue(sampleProps);
    render(<ExplorePage />);
    await waitFor(() => {
      expect(screen.getByText("Protocol Listings")).toBeInTheDocument();
      expect(screen.getByText("Target Yield")).toBeInTheDocument();
      expect(screen.getByText("Registry TVL")).toBeInTheDocument();
    });
  });

  it("computes average yield correctly", async () => {
    mockedApi.listMarketplace.mockResolvedValue(sampleProps);
    render(<ExplorePage />);
    // Average of 8.5 and 6.0 = 7.3
    await waitFor(() => {
      expect(screen.getByText("7.3%")).toBeInTheDocument();
    });
  });

  it("renders listing count in metrics", async () => {
    mockedApi.listMarketplace.mockResolvedValue(sampleProps);
    render(<ExplorePage />);
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("links each card to /explore/:id", async () => {
    mockedApi.listMarketplace.mockResolvedValue(sampleProps);
    render(<ExplorePage />);
    await waitFor(() => {
      const links = document.querySelectorAll('a[href^="/explore/"]');
      expect(links.length).toBe(2);
    });
  });
});
