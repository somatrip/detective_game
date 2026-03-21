import { describe, it, expect } from "vitest";
import { escapeHtml, npcDisplayName } from "../utils.js";

describe("utils", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("extracts NPC display name", () => {
    expect(npcDisplayName("Mira — Curator")).toBe("Mira");
    expect(npcDisplayName("Solo")).toBe("Solo");
    expect(npcDisplayName(null)).toBe("");
  });
});
