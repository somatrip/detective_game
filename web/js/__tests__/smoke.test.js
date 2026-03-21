import { describe, it, expect } from "vitest";
import { escapeHtml, npcDisplayName } from "../utils.js";

describe("utils", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('a"b')).toBe("a&quot;b");
    expect(escapeHtml("a'b")).toBe("a&#39;b");
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });

  it("extracts NPC display name", () => {
    expect(npcDisplayName("Mira — Curator")).toBe("Mira");
    expect(npcDisplayName("Solo")).toBe("Solo");
    expect(npcDisplayName(null)).toBe("");
  });
});
