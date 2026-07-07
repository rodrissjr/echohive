import { describe, it, expect } from "vitest";
import { formatNum, timeAgo, initials, totalReactions, validateMediaFile, MAX_MEDIA_BYTES } from "./utils";

describe("formatNum", () => {
  it("returns small numbers as-is", () => {
    expect(formatNum(0)).toBe("0");
    expect(formatNum(999)).toBe("999");
  });

  it("abbreviates thousands with one decimal, dropping trailing .0", () => {
    expect(formatNum(1000)).toBe("1k");
    expect(formatNum(1500)).toBe("1.5k");
    expect(formatNum(9999)).toBe("10k");
  });

  it("abbreviates tens of thousands without a decimal", () => {
    expect(formatNum(10000)).toBe("10k");
    expect(formatNum(999999)).toBe("999k");
  });

  it("abbreviates millions with one decimal", () => {
    expect(formatNum(1000000)).toBe("1.0M");
    expect(formatNum(2500000)).toBe("2.5M");
  });
});

describe("timeAgo", () => {
  it("reports seconds just after the timestamp", () => {
    expect(timeAgo(Date.now() - 5000)).toBe("5s ago");
  });

  it("reports minutes, hours, and days as they cross each threshold", () => {
    expect(timeAgo(Date.now() - 90 * 1000)).toBe("1m ago");
    expect(timeAgo(Date.now() - 90 * 60 * 1000)).toBe("1h ago");
    expect(timeAgo(Date.now() - 25 * 60 * 60 * 1000)).toBe("1d ago");
  });

  it("falls back to a calendar date after 30 days", () => {
    const ts = Date.now() - 31 * 24 * 60 * 60 * 1000;
    expect(timeAgo(ts)).toBe(new Date(ts).toLocaleDateString());
  });
});

describe("initials", () => {
  it("takes the first letter of up to two words, uppercased", () => {
    expect(initials("James Kalolo")).toBe("JK");
    expect(initials("cher")).toBe("C");
  });

  it("ignores extra words beyond the first two", () => {
    expect(initials("James Modestus Kalolo")).toBe("JM");
  });

  it("handles an empty/undefined name without throwing", () => {
    expect(initials()).toBe("");
    expect(initials("")).toBe("");
  });
});

describe("totalReactions", () => {
  it("reads the denormalized likeCount off a post", () => {
    expect(totalReactions({ likeCount: 4 })).toBe(4);
  });

  it("treats a missing likeCount as zero", () => {
    expect(totalReactions({})).toBe(0);
  });
});

describe("validateMediaFile", () => {
  const makeFile = (name, type, size) => ({ name, type, size });

  it("accepts images and videos under the size limit", () => {
    expect(validateMediaFile(makeFile("a.png", "image/png", 1024))).toBeNull();
    expect(validateMediaFile(makeFile("a.mp4", "video/mp4", 1024))).toBeNull();
  });

  it("rejects files that are neither an image nor a video", () => {
    const err = validateMediaFile(makeFile("resume.pdf", "application/pdf", 1024));
    expect(err).toMatch(/isn't an image or video/);
  });

  it("rejects files over the 25MB limit", () => {
    const err = validateMediaFile(makeFile("big.png", "image/png", MAX_MEDIA_BYTES + 1));
    expect(err).toMatch(/larger than 25MB/);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateMediaFile(makeFile("edge.png", "image/png", MAX_MEDIA_BYTES))).toBeNull();
  });
});
