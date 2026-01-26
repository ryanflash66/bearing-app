/**
 * Story 5.8 — 5.8-COMP-001: Text container has appropriate padding on small screens.
 *
 * Asserts the editor content wrapper uses responsive padding classes.
 */

import React from "react";
import { EDITOR_CONTENT_WRAPPER_CLASSNAME } from "@/components/manuscripts/ManuscriptEditor";

describe("5.8-COMP-001: Editor text container responsive padding", () => {
  it("editor content wrapper has responsive padding classes for mobile", () => {
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("mx-auto");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("px-4");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("py-6");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("md:px-8");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("md:py-12");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("max-w-3xl");
  });
});
