/**
 * @jest-environment node
 */
let notifyBlogPostSuspended: typeof import("@/lib/email").notifyBlogPostSuspended;
let notifyOrderStatusChange: typeof import("@/lib/email").notifyOrderStatusChange;
let __resetResendForTests: typeof import("@/lib/email").__resetResendForTests;
let mockSend: jest.Mock;
let ResendMock: jest.Mock;

describe("notifyBlogPostSuspended", () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env.RESEND_API_KEY = "re_123";

        mockSend = jest.fn().mockResolvedValue({
            data: { id: "mock-email-id" },
            error: null,
        });

        jest.doMock("resend", () => ({
            Resend: jest.fn().mockImplementation(() => ({
                emails: {
                    send: mockSend,
                },
            })),
        }));

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const emailModule = require("@/lib/email") as typeof import("@/lib/email");
        notifyBlogPostSuspended = emailModule.notifyBlogPostSuspended;
        __resetResendForTests = emailModule.__resetResendForTests;

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        ResendMock = (require("resend").Resend as unknown as jest.Mock);
    });

    afterEach(() => {
        __resetResendForTests();
    });

    afterAll(() => {
        delete process.env.RESEND_API_KEY;
    });

    it("sends an email to the author with correct subject and body", async () => {
        const userEmail = "author@example.com";
        const postTitle = "Controversial Post";
        const reason = "Violation of terms";

        const result = await notifyBlogPostSuspended(userEmail, postTitle, reason);

        expect(result.success).toBe(true);

        expect(ResendMock).toHaveBeenCalled();
        
        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            to: userEmail,
            subject: expect.stringContaining("Your blog post was suspended"),
            html: expect.stringContaining(postTitle),
        }));
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            html: expect.stringContaining(reason),
        }));
    });

    it("handles failure gracefully", async () => {
        mockSend.mockResolvedValueOnce({ data: null, error: { message: "Failed to send" } });

        const result = await notifyBlogPostSuspended("fail@example.com", "Title", "Reason");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});

/**
 * Story 8.13: AC 8.13.4 - Email Notification on Status Change
 */
describe("notifyOrderStatusChange (AC 8.13.4)", () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env.RESEND_API_KEY = "re_123";
        process.env.NEXT_PUBLIC_APP_URL = "https://example.com";

        mockSend = jest.fn().mockResolvedValue({
            data: { id: "mock-email-id" },
            error: null,
        });

        jest.doMock("resend", () => ({
            Resend: jest.fn().mockImplementation(() => ({
                emails: {
                    send: mockSend,
                },
            })),
        }));

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const emailModule = require("@/lib/email") as typeof import("@/lib/email");
        notifyOrderStatusChange = emailModule.notifyOrderStatusChange;
        __resetResendForTests = emailModule.__resetResendForTests;

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        ResendMock = (require("resend").Resend as unknown as jest.Mock);
    });

    afterEach(() => {
        __resetResendForTests();
    });

    afterAll(() => {
        delete process.env.RESEND_API_KEY;
        delete process.env.NEXT_PUBLIC_APP_URL;
    });

    it("sends email with correct subject format: 'Update on your [Service Name] Request'", async () => {
        const userEmail = "author@example.com";
        const orderId = "order-123-abc";
        const serviceType = "isbn";
        const status = "completed";

        const result = await notifyOrderStatusChange(userEmail, orderId, serviceType, status);

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            to: userEmail,
            subject: "Update on your ISBN Registration Request",
        }));
    });

    it("includes current status in email body", async () => {
        const result = await notifyOrderStatusChange(
            "user@example.com",
            "order-456",
            "cover_design",
            "in_progress"
        );

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            html: expect.stringContaining("In Progress"),
        }));
    });

    it("includes link to /dashboard/orders/[id] in email body", async () => {
        const orderId = "order-789-xyz";
        const result = await notifyOrderStatusChange(
            "user@example.com",
            orderId,
            "editing",
            "completed"
        );

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            html: expect.stringContaining(`/dashboard/orders/${orderId}`),
        }));
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining(`/dashboard/orders/${orderId}`),
        }));
    });

    it("includes additional info when provided", async () => {
        const additionalInfo = "Your assigned ISBN: 978-1234567890";
        const result = await notifyOrderStatusChange(
            "user@example.com",
            "order-abc",
            "isbn",
            "completed",
            additionalInfo
        );

        expect(result.success).toBe(true);
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            html: expect.stringContaining("978-1234567890"),
        }));
    });

    it("escapes HTML entities in HTML body but not in text body", async () => {
        const additionalInfo = "Note: Use format <ISBN> & verify it's correct";
        const result = await notifyOrderStatusChange(
            "user@example.com",
            "order-special",
            "isbn",
            "completed",
            additionalInfo
        );

        expect(result.success).toBe(true);
        
        // HTML body should have escaped entities
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            html: expect.stringContaining("&lt;ISBN&gt; &amp; verify it&#039;s correct"),
        }));
        
        // Text body should NOT have escaped entities (raw text)
        expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining("Note: Use format <ISBN> & verify it's correct"),
        }));
    });

    it("handles all status types correctly", async () => {
        const statuses = ["pending", "paid", "in_progress", "completed", "cancelled", "failed"];

        for (const status of statuses) {
            mockSend.mockClear();
            const result = await notifyOrderStatusChange(
                "user@example.com",
                "order-test",
                "isbn",
                status
            );
            expect(result.success).toBe(true);
        }
    });

    it("handles failure gracefully", async () => {
        mockSend.mockResolvedValueOnce({ data: null, error: { message: "Failed to send" } });

        const result = await notifyOrderStatusChange(
            "fail@example.com",
            "order-fail",
            "isbn",
            "completed"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
