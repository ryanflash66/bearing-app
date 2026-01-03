import { render, screen, fireEvent } from "@testing-library/react";
import UserUsageTable from "@/components/admin/UserUsageTable";
import { UserUsageStat } from "@/lib/usage-admin";

// Mock toggleAiStatus action
jest.mock("@/app/dashboard/admin/actions", () => ({
  toggleAiStatus: jest.fn(),
  toggleMemberStatusAction: jest.fn(),
  saveNote: jest.fn(),
}));

const mockStats: UserUsageStat[] = [
  {
    user_id: "user1",
    email: "alice@example.com",
    display_name: "Alice",
    account_role: "author",
    ai_status: "active",
    member_status: "active",
    internal_note: null,
    total_tokens: 1000,
    total_checks: 5,
    last_activity: "2023-01-01",
  },
  {
      user_id: "user2",
      email: "bob@example.com",
      display_name: "Bob",
      account_role: "admin",
      ai_status: "disabled",
      member_status: "suspended",
      internal_note: "Test note",
      total_tokens: 0,
      total_checks: 0,
      last_activity: null,
  }
];

describe("UserUsageTable", () => {
  it("renders user stats", () => {
    render(<UserUsageTable stats={mockStats} accountId="acc1" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    // Check for Suspend/Activate buttons
    expect(screen.getByText("Suspend")).toBeInTheDocument();
    expect(screen.getByText("Activate")).toBeInTheDocument();
  });
  
  it("filters users", () => {
      render(<UserUsageTable stats={mockStats} accountId="acc1" />);
      const input = screen.getByPlaceholderText("Filter users...");
      fireEvent.change(input, { target: { value: "Bob" } });
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
