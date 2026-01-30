import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SecuritySettings } from "@/components/settings/SecuritySettings";

// Mock Supabase client
const mockListFactors = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(() => ({
    auth: {
      mfa: {
        listFactors: mockListFactors,
      },
    },
  })),
}));

// Mock MFAEnrollment component
jest.mock("@/components/auth/MFAEnrollment", () => {
  return function MockMFAEnrollment({ onEnrolled }: { onEnrolled?: () => void }) {
    return (
      <div data-testid="mfa-enrollment">
        MFA Enrollment Component
        <button onClick={onEnrolled}>Simulate Enrollment</button>
      </div>
    );
  };
});

describe("SecuritySettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Silence console.error for expected errors
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it("renders loading state initially", async () => {
    // Return a promise that doesn't resolve immediately to check loading state
    mockListFactors.mockReturnValue(new Promise(() => {}));

    render(<SecuritySettings />);
    expect(screen.getByText("Loading security settings...")).toBeInTheDocument();
  });

  it("renders error state when API fails", async () => {
    mockListFactors.mockResolvedValue({
      data: null,
      error: { message: "Network error" },
    });

    await act(async () => {
      render(<SecuritySettings />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading security settings...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText(/Unable to load security settings/i)).toBeInTheDocument();
    expect(screen.queryByTestId("mfa-enrollment")).not.toBeInTheDocument();
  });

  it("renders MFA setup when no factors are verified", async () => {
    mockListFactors.mockResolvedValue({
      data: { totp: [] },
      error: null,
    });

    await act(async () => {
      render(<SecuritySettings />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading security settings...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText(/Add an extra layer of security/i)).toBeInTheDocument();
    expect(screen.getByTestId("mfa-enrollment")).toBeInTheDocument();
    expect(screen.queryByText("Two-Factor Authentication is enabled")).not.toBeInTheDocument();
  });

  it("renders enabled state when verified factor exists", async () => {
    mockListFactors.mockResolvedValue({
      data: { totp: [{ id: "123", status: "verified" }] },
      error: null,
    });

    await act(async () => {
      render(<SecuritySettings />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading security settings...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Two-Factor Authentication is enabled")).toBeInTheDocument();
    expect(screen.queryByTestId("mfa-enrollment")).not.toBeInTheDocument();
  });

  it("updates state when enrollment completes", async () => {
    mockListFactors.mockResolvedValue({
      data: { totp: [] },
      error: null,
    });

    await act(async () => {
      render(<SecuritySettings />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mfa-enrollment")).toBeInTheDocument();
    });

    // Click the button in the mock to trigger onEnrolled
    await act(async () => {
      screen.getByText("Simulate Enrollment").click();
    });

    expect(screen.getByText("Two-Factor Authentication is enabled")).toBeInTheDocument();
    expect(screen.queryByTestId("mfa-enrollment")).not.toBeInTheDocument();
  });
});