import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* DOM yok: window'u olay hedefi olarak taklit ederiz. */
type L = (e: { stopPropagation(): void; preventDefault(): void }) => void;
const listeners: Record<string, L[]> = {};
const fire = (type: string) => {
  const e = { stopped: false, stopPropagation() { this.stopped = true; }, preventDefault() {} };
  (listeners[type] ?? []).forEach((fn) => fn(e));
  return e.stopped;
};

describe("tıklama bastırma", () => {
  let now = 1000;
  beforeEach(async () => {
    vi.resetModules();
    for (const k of Object.keys(listeners)) delete listeners[k];
    now = 1000;
    vi.stubGlobal("window", { addEventListener: (t: string, fn: L) => (listeners[t] ??= []).push(fn) });
    vi.stubGlobal("performance", { now: () => now });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sürüklemenin kendi tıklaması yutulur, bir sonraki tıklama geçer", async () => {
    const { swallowNextClick } = await import("./clickGuard");
    swallowNextClick();
    now += 5;
    expect(fire("click")).toBe(true);
    expect(fire("click")).toBe(false);
  });

  it("süre geçtiyse tıklama yutulmaz", async () => {
    const { swallowNextClick } = await import("./clickGuard");
    swallowNextClick(80);
    now += 200;
    expect(fire("click")).toBe(false);
  });

  it("yeni dokunuş (pointerdown) bastırmayı siler: jestten sonraki ilk dokunuş boşa gitmez", async () => {
    const { swallowNextClick } = await import("./clickGuard");
    swallowNextClick(10000);
    now += 30;
    fire("pointerdown");
    now += 5;
    expect(fire("click")).toBe(false);
  });

  it("bastırma kurulmadıysa tıklamaya dokunulmaz", async () => {
    const { swallowNextClick, _clickGuardState } = await import("./clickGuard");
    swallowNextClick(50);
    now += 60;
    expect(_clickGuardState().armed).toBe(false);
    expect(fire("click")).toBe(false);
  });
});
