import { describe, it, expect, beforeEach } from "vitest";
import { handValue, openingBet, loadChips, saveChips, STARTING_CHIPS, type Card } from "./game";

const c = (rank: Card["rank"]): Card => ({ rank, suit: "♠" });

describe("handValue", () => {
  it("counts aces as 11 or 1", () => {
    expect(handValue([c("A"), c("K")])).toEqual({ total: 21, soft: true });
    expect(handValue([c("A"), c("A"), c("9")]).total).toBe(21);
    expect(handValue([c("K"), c("Q"), c("A")])).toEqual({ total: 21, soft: false });
  });
});

describe("openingBet", () => {
  it("caps the default bet at the chips the player has", () => {
    expect(openingBet(1000)).toBe(100);
    expect(openingBet(60)).toBe(60);
    expect(openingBet(10)).toBe(10);
  });
  it("never goes below the minimum bet", () => {
    expect(openingBet(5)).toBe(10);
  });
});

describe("chip persistence", () => {
  beforeEach(() => localStorage.clear());
  it("starts with the starting stack when nothing is stored", () => {
    expect(loadChips()).toBe(STARTING_CHIPS);
  });
  it("round-trips the chip count, including zero", () => {
    saveChips(345);
    expect(loadChips()).toBe(345);
    saveChips(0);
    expect(loadChips()).toBe(0);
  });
});
