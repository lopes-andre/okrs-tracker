/**
 * Test Setup File
 *
 * This file runs before all tests and sets up:
 * - React Testing Library matchers
 * - Global mocks (window, localStorage, etc.)
 * - Supabase client mocks
 * - React Query test utilities
 */

import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

// Mock window.matchMedia (used by many UI libraries)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (used by many lazy loading components)
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor() {}

  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver (used by many responsive components)
class MockResizeObserver {
  constructor() {}
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

// Mock scrollTo
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// ============================================================================
// NEXT.JS ROUTER MOCK
// ============================================================================

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useParams: () => ({}),
}));

// ============================================================================
// SUPABASE MOCK
// ============================================================================

// The Supabase mock is defined in src/test/mocks/supabase.ts
// and should be imported where needed

// ============================================================================
// SUPPRESS CONSOLE NOISE IN TESTS
// ============================================================================

// Suppress specific React warnings during tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress act() warnings - these are often false positives
  if (typeof args[0] === "string" && args[0].includes("Warning: An update to")) {
    return;
  }
  // Suppress React 19 specific warnings
  if (typeof args[0] === "string" && args[0].includes("React does not recognize")) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// ============================================================================
// CLEANUP
// ============================================================================

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
