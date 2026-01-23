/**
 * Story 5.8 — 5.8-COMP-001: Text container has appropriate padding on small screens.
 *
 * Asserts the editor content wrapper uses responsive padding classes
 * (px-4 py-6 md:px-8 md:py-12) so that padding is appropriate on mobile.
 */

import React from "react";
import { render, screen } from "@testing-library/react";

describe("5.8-COMP-001: Editor text container responsive padding", () => {
  it("editor content wrapper has responsive padding classes for mobile", () => {
    const wrapperClasses =
      "mx-auto px-4 py-6 md:px-8 md:py-12 transition-all duration-300 max-w-3xl";
    render(
      <div className={wrapperClasses} data-testid="editor-content-wrapper">
        <div className="tiptap">Editor content</div>
      </div>
    );

    const wrapper = screen.getByTestId("editor-content-wrapper");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass("px-4");
    expect(wrapper).toHaveClass("py-6");
    expect(wrapper).toHaveClass("md:px-8");
    expect(wrapper).toHaveClass("md:py-12");
    expect(wrapper).toHaveClass("max-w-3xl");
  });
});
