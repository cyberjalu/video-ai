import { describe, expect, it } from "vitest";
import { extractHttpUrls } from "@/lib/domain/urls";

describe("extractHttpUrls", () => {
  it("extracts unique http(s) urls from a prompt", () => {
    const text =
      "Dùng https://www.strix.ai/ và https://github.com/usestrix/strix để automation. Xem lại https://www.strix.ai/";
    expect(extractHttpUrls(text)).toEqual([
      "https://www.strix.ai/",
      "https://github.com/usestrix/strix",
    ]);
  });

  it("strips trailing punctuation", () => {
    expect(extractHttpUrls("Visit https://example.com/docs.")).toEqual(["https://example.com/docs"]);
  });

  it("respects limit", () => {
    const text = "https://a.com https://b.com https://c.com https://d.com";
    expect(extractHttpUrls(text, 2)).toHaveLength(2);
  });

  it("returns empty for no urls", () => {
    expect(extractHttpUrls("no links here")).toEqual([]);
  });
});
