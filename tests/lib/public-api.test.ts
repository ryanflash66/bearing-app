/**
 * Unit tests for public API helpers
 * Story 6.2: Public Author Profile/Blog
 */

import { getPublicClient } from "@/lib/public-api";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";

jest.mock("@/lib/supabase-admin", () => ({
  getServiceSupabaseClient: jest.fn(),
}));

describe("public-api", () => {
  it("uses the service role client for public data access", () => {
    const mockClient = { from: jest.fn() };
    (getServiceSupabaseClient as jest.Mock).mockReturnValue(mockClient);

    const client = getPublicClient();

    expect(getServiceSupabaseClient).toHaveBeenCalledTimes(1);
    expect(client).toBe(mockClient);
  });
});
