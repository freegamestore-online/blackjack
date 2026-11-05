export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export interface Card { rank: Rank; suit: Suit; }

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const STARTING_CHIPS = 1000;
export const DEFAULT_BET = 100;
export const MIN_BET = 10;
const CHIPS_KEY = "blackjack-chips";

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

export function handValue(hand: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    if (c.rank === "A") { total += 11; aces++; }
    else if (c.rank === "K" || c.rank === "Q" || c.rank === "J") total += 10;
    else total += parseInt(c.rank, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

/** Bet to start a new hand with: the default, capped at what the player can afford. */
export function openingBet(chips: number): number {
  return Math.max(MIN_BET, Math.min(DEFAULT_BET, chips));
}

export function loadChips(): number {
  const n = parseInt(localStorage.getItem(CHIPS_KEY) ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : STARTING_CHIPS;
}

export function saveChips(chips: number): void {
  localStorage.setItem(CHIPS_KEY, String(chips));
}
