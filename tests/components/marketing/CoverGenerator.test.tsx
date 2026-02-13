import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoverGenerator from "@/components/marketing/CoverGenerator";
import { createClient } from "@/utils/supabase/client";

jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(),
}));

describe("CoverGenerator", () => {
  const mockManuscriptUpdateEq = jest.fn().mockResolvedValue({ error: null });
  const mockSupabase = {
    from: jest.fn((table: string) => {
      if (table === "cover_jobs") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "manuscripts") {
        return {
          update: jest.fn().mockReturnValue({
            eq: mockManuscriptUpdateEq,
          }),
        };
      }

      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("renders Cover Lab form controls", () => {
    render(
      <CoverGenerator
        manuscriptId="manu-1"
        manuscriptTitle="Test Manuscript"
        authorName="Author Name"
        manuscriptMetadata={{}}
      />
    );

    expect(screen.getByText("Cover Lab")).toBeInTheDocument();
    expect(screen.getByLabelText("Genre")).toBeInTheDocument();
    expect(screen.getByLabelText("Mood")).toBeInTheDocument();
    expect(screen.getByLabelText("Art Style")).toBeInTheDocument();
    expect(screen.getByLabelText("Visual Description")).toBeInTheDocument();
  });

  it("generates and renders progressive image with alt text from description", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: "job-11" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          job_id: "job-11",
          status: "completed",
          images: [{ url: "https://cdn.example.com/tmp/covers/m/1.webp", seed: 1, safety_status: "ok" }],
          completed_images: [{ url: "https://cdn.example.com/tmp/covers/m/1.webp", seed: 1, safety_status: "ok" }],
          retry_after: null,
          error_message: null,
        }),
      }) as unknown as typeof fetch;

    render(
      <CoverGenerator
        manuscriptId="manu-1"
        manuscriptTitle="Test Manuscript"
        authorName="Author Name"
        manuscriptMetadata={{}}
      />
    );

    fireEvent.change(screen.getByLabelText("Visual Description"), {
      target: { value: "A bright sunrise above a city skyline and river" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByAltText("A bright sunrise above a city skyline and river")).toBeInTheDocument();
    });
  });

  it("persists overlay settings to manuscript metadata", async () => {
    render(
      <CoverGenerator
        manuscriptId="manu-1"
        manuscriptTitle="Test Manuscript"
        authorName="Author Name"
        manuscriptMetadata={{}}
      />
    );

    fireEvent.change(screen.getByLabelText("Position"), {
      target: { value: "top" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Overlay Settings" }));

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("manuscripts");
    });
  });

  it("shows a user-facing error when generate request fails at network layer", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    render(
      <CoverGenerator
        manuscriptId="manu-1"
        manuscriptTitle="Test Manuscript"
        authorName="Author Name"
        manuscriptMetadata={{}}
      />
    );

    fireEvent.change(screen.getByLabelText("Visual Description"), {
      target: { value: "A storm over snowy mountain peaks and ruined citadel" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to start cover generation.")).toBeInTheDocument();
    });
  });

  it("shows a user-facing error when save to gallery fails at network layer", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: "job-11" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          job_id: "job-11",
          status: "completed",
          images: [{ url: "https://cdn.example.com/tmp/covers/m/1.webp", seed: 1, safety_status: "ok" }],
          completed_images: [{ url: "https://cdn.example.com/tmp/covers/m/1.webp", seed: 1, safety_status: "ok" }],
          retry_after: null,
          error_message: null,
        }),
      })
      .mockRejectedValueOnce(new Error("gallery network down")) as unknown as typeof fetch;

    render(
      <CoverGenerator
        manuscriptId="manu-1"
        manuscriptTitle="Test Manuscript"
        authorName="Author Name"
        manuscriptMetadata={{}}
      />
    );

    fireEvent.change(screen.getByLabelText("Visual Description"), {
      target: { value: "A bright sunrise above a city skyline and river" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByAltText("A bright sunrise above a city skyline and river")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save to Gallery" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to save image to gallery.")).toBeInTheDocument();
    });
  });

  it("shows a user-facing error when select as cover fails at network layer", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: "job-11" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          job_id: "job-11",
          status: "completed",
          images: [{ url: "https://cdn.example.com/tmp/covers/m/1.webp", seed: 1, safety_status: "ok" }],
          completed_images: [{ url: "https://cdn.example.com/tmp/covers/m/1.webp", seed: 1, safety_status: "ok" }],
          retry_after: null,
          error_message: null,
        }),
      })
      .mockRejectedValueOnce(new Error("selection network down")) as unknown as typeof fetch;

    render(
      <CoverGenerator
        manuscriptId="manu-1"
        manuscriptTitle="Test Manuscript"
        authorName="Author Name"
        manuscriptMetadata={{}}
      />
    );

    fireEvent.change(screen.getByLabelText("Visual Description"), {
      target: { value: "A bright sunrise above a city skyline and river" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByAltText("A bright sunrise above a city skyline and river")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Select as Book Cover" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to select image as book cover.")).toBeInTheDocument();
    });
  });

  it("confirms cover replacement when pressing Enter in the confirmation dialog", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: "job-11" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          job_id: "job-11",
          status: "completed",
          images: [{ url: "https://cdn.example.com/tmp/covers/m/1.webp", seed: 1, safety_status: "ok" }],
          completed_images: [{ url: "https://cdn.example.com/tmp/covers/m/1.webp", seed: 1, safety_status: "ok" }],
          retry_after: null,
          error_message: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          cover_url: "https://cdn.example.com/permanent/covers/m/1.webp",
        }),
      }) as unknown as typeof fetch;

    render(
      <CoverGenerator
        manuscriptId="manu-1"
        manuscriptTitle="Test Manuscript"
        authorName="Author Name"
        manuscriptMetadata={{}}
      />
    );

    fireEvent.change(screen.getByLabelText("Visual Description"), {
      target: { value: "A bright sunrise above a city skyline and river" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByAltText("A bright sunrise above a city skyline and river")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Select as Book Cover" }));
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Book cover updated.")).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/covers/jobs/job-11/select",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses mobile-first responsive grid classes for generated image layout", () => {
    const { container } = render(
      <CoverGenerator
        manuscriptId="manu-1"
        manuscriptTitle="Test Manuscript"
        authorName="Author Name"
        manuscriptMetadata={{}}
      />
    );

    const grids = container.querySelectorAll("div.grid.grid-cols-1.gap-4.md\\:grid-cols-2");
    expect(grids.length).toBeGreaterThan(0);
  });
});
