/**
 * Test Render Utilities
 *
 * Custom render functions that wrap components with necessary providers
 * for testing (React Query, Tooltip, etc.)
 *
 * Usage:
 *   import { render, screen } from "@/test/utils/render";
 *   render(<MyComponent />);
 *   expect(screen.getByText("Hello")).toBeInTheDocument();
 */

import React, { ReactElement, ReactNode } from "react";
import { render as rtlRender, RenderOptions, RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

// ============================================================================
// PROVIDERS WRAPPER
// ============================================================================

interface WrapperProps {
  children: ReactNode;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Turn off retries for tests
        retry: false,
        // Don't refetch on window focus in tests
        refetchOnWindowFocus: false,
        // Disable garbage collection in tests
        gcTime: Infinity,
        // Disable stale time for predictable tests
        staleTime: 0,
      },
      mutations: {
        // Turn off retries for tests
        retry: false,
      },
    },
  });
}

function AllProviders({ children }: WrapperProps): ReactElement {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// ============================================================================
// CUSTOM RENDER
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Custom query client (creates new one by default) */
  queryClient?: QueryClient;
  /** Initial route for router mocking */
  route?: string;
}

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { queryClient, ...renderOptions } = options;

  // Create wrapper with optional custom query client
  function Wrapper({ children }: WrapperProps): ReactElement {
    const client = queryClient || createTestQueryClient();
    return (
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={0}>
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// ============================================================================
// RENDER WITH QUERY CLIENT REFERENCE
// ============================================================================

interface RenderWithQueryClientResult extends RenderResult {
  queryClient: QueryClient;
}

/**
 * Render with access to the query client for testing cache interactions
 */
function renderWithQueryClient(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, "queryClient"> = {}
): RenderWithQueryClientResult {
  const queryClient = createTestQueryClient();
  const result = customRender(ui, { ...options, queryClient });
  return { ...result, queryClient };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export everything from testing-library
export * from "@testing-library/react";

// Override render with our custom version
export { customRender as render, renderWithQueryClient, createTestQueryClient };
