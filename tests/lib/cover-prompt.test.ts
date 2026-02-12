import {
  buildCoverPromptPayload,
  buildWrappedCoverPrompt,
  createDeterministicSeed,
  generateVariationSeeds,
} from "@/lib/covers/prompt";

describe("cover prompt helpers", () => {
  it("builds wrapped prompt with style modifiers and no-text guardrails", () => {
    const prompt = buildWrappedCoverPrompt({
      description: "A lone knight facing a dragon above a frozen valley",
      genre: "Fantasy",
      mood: "Epic",
      style: "Cinematic",
      title: "Ash and Ice",
      authorName: "A. Writer",
    });

    expect(prompt).toMatch(/flat artwork/i);
    expect(prompt).toMatch(/do NOT render a 3D book/i);
    expect(prompt).toMatch(/do NOT include any text/i);
    expect(prompt).toMatch(/Genre: Fantasy/i);
    expect(prompt).toMatch(/Mood: Epic/i);
    expect(prompt).toMatch(/Style: Cinematic/i);
    expect(prompt).toMatch(/Aspect ratio: portrait 3:4/i);
    // Title and author should NOT appear in the prompt (prevents text rendering)
    expect(prompt).not.toMatch(/Ash and Ice/);
    expect(prompt).not.toMatch(/A\. Writer/);
  });

  it("returns consistent prompt payload metadata", () => {
    const payload = buildCoverPromptPayload({
      description: "Soft watercolor garden gate in misty dawn light",
      genre: "Romance",
      mood: "Dreamlike",
      style: "Illustrated",
    });

    expect(payload.aspectRatio).toBe("3:4");
    expect(payload.negativePrompt).toBe("");
    expect(payload.wrappedPrompt).toMatch(/Style: Illustrated/i);
  });

  it("generates deterministic and distinct variation seeds", () => {
    const baseSeed = createDeterministicSeed("job-1:manu-2:Cinematic");
    const seeds = generateVariationSeeds(baseSeed, 4);

    expect(seeds).toHaveLength(4);
    expect(new Set(seeds).size).toBe(4);
    expect(seeds.every((seed) => Number.isInteger(seed) && seed > 0)).toBe(true);
  });
});
