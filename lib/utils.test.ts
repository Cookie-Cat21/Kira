import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-4", "py-2", "text-sm")).toBe("px-4 py-2 text-sm");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    // tailwind-merge resolves conflicts: bg-red-500 overrides bg-blue-500
    expect(cn("bg-blue-500", "bg-red-500")).toBe("bg-red-500");
    // px-4 overrides px-2
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignores falsy arguments (undefined, null, false, empty string)", () => {
    expect(cn("text-lg", undefined, false, null, "", "font-bold")).toBe(
      "text-lg font-bold"
    );
  });
});
