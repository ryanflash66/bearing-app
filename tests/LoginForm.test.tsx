import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginForm from "@/components/auth/LoginForm";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

// Mock the Supabase client
jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("LoginForm", () => {
  const mockAuth = {
    signInWithPassword: jest.fn(),
    mfa: {
      getAuthenticatorAssuranceLevel: jest.fn(),
      listFactors: jest.fn(),
      challenge: jest.fn(),
      verify: jest.fn(),
    },
  };

  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue({
      auth: mockAuth,
    });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it("renders login form", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("successful login redirects to dashboard", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    mockAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } });
    mockAuth.mfa.listFactors.mockResolvedValue({ data: { totp: [] } });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    }, { timeout: 4000 });
  });

  it("prompts for MFA code if factors are enrolled", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    mockAuth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' } });
    mockAuth.mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: 'factor1', status: 'verified' }] } });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
