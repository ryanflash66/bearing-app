
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateTicketForm from "@/components/support/CreateTicketForm";
import userEvent from "@testing-library/user-event";

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: "ticket-1" }),
  })
) as jest.Mock;

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe("CreateTicketForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders form fields", () => {
    render(<CreateTicketForm />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("submits the form with data", async () => {
    render(<CreateTicketForm />);
    
    await userEvent.type(screen.getByLabelText(/subject/i), "Help needed");
    await userEvent.type(screen.getByLabelText(/message/i), "I have a problem");
    
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/support/tickets", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          subject: "Help needed",
          message: "I have a problem"
        })
      }));
    });
  });
});
