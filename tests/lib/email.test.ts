/**
 * @jest-environment node
 */
import { notifyBlogPostSuspended } from "@/lib/email";
import { Resend } from "resend";

// Define mock factory
jest.mock("resend", () => {
    return {
        // Return a mock implementation that returns a fresh object with mocks
        Resend: jest.fn().mockReturnValue({
            emails: {
                send: jest.fn().mockResolvedValue({ data: { id: "mock-email-id" }, error: null })
            }
        })
    };
});

describe("notifyBlogPostSuspended", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.RESEND_API_KEY = "re_123";
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

        // Access the mock class
        const ResendMock = Resend as unknown as jest.Mock;
        // Access the return value of the constructor (the instance)
        // Since notifyBlogPostSuspended calls new Resend(), we expect calls > 0
        expect(ResendMock).toHaveBeenCalled();
        
        // Grab the instance returned by the last call
        const mockInstance = ResendMock.mock.results[ResendMock.mock.results.length - 1].value;
        const send = mockInstance.emails.send;

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith(expect.objectContaining({
            to: userEmail,
            subject: expect.stringContaining("Your blog post was suspended"),
            html: expect.stringContaining(postTitle),
        }));
        expect(send).toHaveBeenCalledWith(expect.objectContaining({
            html: expect.stringContaining(reason),
        }));
    });

    it("handles failure gracefully", async () => {
        // Override the return value for this test
        const ResendMock = Resend as unknown as jest.Mock;
        ResendMock.mockReturnValueOnce({
            emails: {
                send: jest.fn().mockResolvedValue({ data: null, error: { message: "Failed to send" } })
            }
        });

        const result = await notifyBlogPostSuspended("fail@example.com", "Title", "Reason");

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
