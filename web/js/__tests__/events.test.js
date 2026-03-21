import { describe, it, expect, vi, beforeEach } from "vitest";
import { on, off, emit, once } from "../events.js";

describe("events", () => {
  it("calls subscriber when event is emitted", () => {
    const fn = vi.fn();
    on("test", fn);
    emit("test", { value: 42 });
    expect(fn).toHaveBeenCalledWith({ value: 42 });
    off("test", fn);
  });

  it("does not call unsubscribed listener", () => {
    const fn = vi.fn();
    on("test2", fn);
    off("test2", fn);
    emit("test2", {});
    expect(fn).not.toHaveBeenCalled();
  });

  it("once() fires only once", () => {
    const fn = vi.fn();
    once("test3", fn);
    emit("test3", "a");
    emit("test3", "b");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("supports multiple subscribers", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    on("multi", fn1);
    on("multi", fn2);
    emit("multi", "x");
    expect(fn1).toHaveBeenCalledWith("x");
    expect(fn2).toHaveBeenCalledWith("x");
    off("multi", fn1);
    off("multi", fn2);
  });
});
