import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import App from "./App";

// Every card is a 2: no naturals, and the dealer needs several timed draws to reach 17.
vi.mock("./game", async (orig) => ({
  ...(await orig<typeof import("./game")>()),
  freshDeck: () => Array.from({ length: 52 }, () => ({ rank: "2", suit: "♠" })),
}));

describe("App", () => {
  beforeEach(() => localStorage.clear());

  it("restores stored chips and offers Deal with fewer than 100 chips", () => {
    localStorage.setItem("blackjack-chips", "60");
    render(<App />);
    expect(screen.getByRole("button", { name: "Deal" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset Chips" })).not.toBeInTheDocument();
  });

  it("clears every dealer timer on unmount", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Deal" }));
      fireEvent.click(screen.getByRole("button", { name: "Stand" }));
      act(() => { vi.advanceTimersByTime(500); });
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
