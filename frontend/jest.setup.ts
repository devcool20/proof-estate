import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link — use createElement instead of JSX (setup file is .ts, not .tsx)
jest.mock("next/link", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef(function MockLink(
      { children, href, ...rest }: any,
      ref: any
    ) {
      return React.createElement("a", { href, ref, ...rest }, children);
    }),
  };
});

// Mock next/dynamic
jest.mock("next/dynamic", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: () => {
      function DynamicComponent(props: any) {
        return React.createElement("div", { "data-testid": "dynamic-component", ...props });
      }
      return DynamicComponent;
    },
  };
});

// Mock window.alert as a jest.fn()
global.alert = jest.fn();

// Suppress noisy console warnings during tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("Wallet Connection")) return;
  originalWarn.call(console, ...args);
};
