import {
  COVER_POLL_MAX_ATTEMPTS,
  COVER_POLL_MAX_SECONDS,
  COVER_POLL_MIN_SECONDS,
  getCoverPollDelaySeconds,
} from "@/lib/covers/polling";

describe("cover polling", () => {
  it("exports expected polling bounds", () => {
    expect(COVER_POLL_MIN_SECONDS).toBe(2);
    expect(COVER_POLL_MAX_SECONDS).toBe(10);
    expect(COVER_POLL_MAX_ATTEMPTS).toBe(60);
  });

  it("uses exponential backoff and caps at max", () => {
    expect(getCoverPollDelaySeconds(1)).toBe(2);
    expect(getCoverPollDelaySeconds(2)).toBe(4);
    expect(getCoverPollDelaySeconds(3)).toBe(8);
    expect(getCoverPollDelaySeconds(4)).toBe(10);
    expect(getCoverPollDelaySeconds(10)).toBe(10);
  });
});

