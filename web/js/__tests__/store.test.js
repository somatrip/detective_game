import { describe, it, expect, beforeEach } from "vitest";
import { store, resetStore } from "../store.js";

describe("store", () => {
  beforeEach(() => {
    resetStore();
  });

  it("has default values for all game state", () => {
    expect(store.npcs).toEqual([]);
    expect(store.activeNpcId).toBeNull();
    expect(store.conversations).toEqual({});
    expect(store.evidence).toEqual([]);
    expect(store.discoveries).toEqual({});
    expect(store.npcInterrogation).toEqual({});
    expect(store.discoveryMessageIndices).toEqual({});
    expect(store.playerNotes).toBe("");
    expect(store.caseReadyPromptShown).toBe(false);
    expect(store.briefingOpen).toBe(true);
    expect(store.stringBoard).toEqual({ cardPositions: {}, links: [] });
    expect(store.audioEnabled).toBe(false);
    expect(store.gameId).toBe("");
    expect(store.sending).toBe(false);
  });

  it("resetStore restores defaults", () => {
    store.playerNotes = "some notes";
    store.evidence = [{ id: "test" }];
    resetStore();
    expect(store.playerNotes).toBe("");
    expect(store.evidence).toEqual([]);
  });

  it("properties are directly mutable", () => {
    store.activeNpcId = "npc_mira";
    expect(store.activeNpcId).toBe("npc_mira");
  });
});
