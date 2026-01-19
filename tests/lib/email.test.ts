/**
 * @jest-environment node
 */
let notifyBlogPostSuspended: typeof import("@/lib/email").notifyBlogPostSuspended;
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
