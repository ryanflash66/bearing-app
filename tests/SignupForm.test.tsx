import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SignupForm from "@/components/auth/SignupForm";
import { createClient } from "@/utils/supabase/client";

// Mock the Supabase client
jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
}));

describe("SignupForm", () => {
  const mockAuth = {
    signUp: jest.fn(),
  };

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue({
      auth: mockAuth,
    });
    mockAuth.signUp.mockClear();
  });

  it("renders signup form", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows success message on successful signup", async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: {} }, error: null });
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it("shows error message on signup failure", async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: null }, error: { message: "Invalid email" } });
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "invalid@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
