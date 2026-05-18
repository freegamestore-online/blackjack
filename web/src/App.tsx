import { useState, useCallback, useEffect, useMemo } from "react";
import { GameShell, GameTopbar, GameAuth, GameButton } from "@freegamestore/games";
import { useHighScore } from "./hooks/useHighScore";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
interface Card { rank: Rank; suit: Suit; }

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const STARTING_CHIPS = 1000;
const DEFAULT_BET = 100;

function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

function handValue(hand: Card[]): { total: number; soft: boolean } {
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

type Phase = "betting" | "player" | "dealer" | "settled";
type Outcome = "win" | "blackjack" | "push" | "lose" | "bust" | null;

export default function App() {
  const [deck, setDeck] = useState<Card[]>(() => freshDeck());
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("betting");
  const [chips, setChips] = useState(STARTING_CHIPS);
  const [bet, setBet] = useState(DEFAULT_BET);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [hideHole, setHideHole] = useState(true);
  const [bestChips, updateBestChips] = useHighScore("blackjack-best");

  const pTotal = useMemo(() => handValue(player).total, [player]);
  const dTotal = useMemo(() => handValue(dealer).total, [dealer]);

  const draw = useCallback(
    (n: number): [Card[], Card[]] => {
      const d = deck.length < 10 ? freshDeck() : deck.slice();
      const drawn: Card[] = [];
      for (let i = 0; i < n; i++) drawn.push(d.pop()!);
      return [drawn, d];
    },
    [deck],
  );

  const deal = useCallback(() => {
    if (chips < bet) return;
    const d = deck.length < 10 ? freshDeck() : deck.slice();
    const p = [d.pop()!, d.pop()!];
    const h = [d.pop()!, d.pop()!];
    setDeck(d);
    setPlayer(p);
    setDealer(h);
    setHideHole(true);
    setOutcome(null);
    setChips((c) => c - bet);
    const pv = handValue(p).total;
    const dv = handValue(h).total;
    if (pv === 21 || dv === 21) {
      setHideHole(false);
      if (pv === 21 && dv === 21) {
        setOutcome("push");
        setChips((c) => c + bet);
      } else if (pv === 21) {
        setOutcome("blackjack");
        setChips((c) => c + Math.floor(bet * 2.5));
      } else {
        setOutcome("lose");
      }
      setPhase("settled");
    } else {
      setPhase("player");
    }
  }, [deck, chips, bet]);

  const hit = useCallback(() => {
    if (phase !== "player") return;
    const [drawn, d] = draw(1);
    const np = player.concat(drawn);
    setDeck(d);
    setPlayer(np);
    const v = handValue(np).total;
    if (v >= 21) {
      setHideHole(false);
      if (v > 21) {
        setOutcome("bust");
        setPhase("settled");
      } else {
        setPhase("dealer");
      }
    }
  }, [phase, player, draw]);

  const stand = useCallback(() => {
    if (phase !== "player") return;
    setHideHole(false);
    setPhase("dealer");
  }, [phase]);

  const doubleDown = useCallback(() => {
    if (phase !== "player" || player.length !== 2 || chips < bet) return;
    setChips((c) => c - bet);
    setBet((b) => b * 2);
    const [drawn, d] = draw(1);
    const np = player.concat(drawn);
    setDeck(d);
    setPlayer(np);
    setHideHole(false);
    const v = handValue(np).total;
    if (v > 21) {
      setOutcome("bust");
      setPhase("settled");
    } else {
      setPhase("dealer");
    }
  }, [phase, player, chips, bet, draw]);

  // Dealer turn — stand on all 17 (incl soft) for simplicity
  useEffect(() => {
    if (phase !== "dealer") return;
    let h = dealer.slice();
    let d = deck.slice();
    const step = () => {
      const v = handValue(h);
      if (v.total < 17) {
        if (d.length < 1) d = freshDeck();
        h = h.concat([d.pop()!]);
        setDealer(h);
        setDeck(d);
        setTimeout(step, 450);
      } else {
        const pv = handValue(player).total;
        const dv = v.total;
        let result: Outcome;
        if (dv > 21 || pv > dv) { result = "win"; setChips((c) => c + bet * 2); }
        else if (pv === dv) { result = "push"; setChips((c) => c + bet); }
        else result = "lose";
        setOutcome(result);
        setPhase("settled");
      }
    };
    const t = setTimeout(step, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Track best chip count
  useEffect(() => { updateBestChips(chips); }, [chips, updateBestChips]);

  const newHand = useCallback(() => {
    setBet(DEFAULT_BET);
    setPhase("betting");
    setOutcome(null);
    setPlayer([]);
    setDealer([]);
  }, []);

  const fullReset = useCallback(() => {
    setChips(STARTING_CHIPS);
    setBet(DEFAULT_BET);
    setDeck(freshDeck());
    setPlayer([]);
    setDealer([]);
    setPhase("betting");
    setOutcome(null);
  }, []);

  const adjustBet = useCallback(
    (delta: number) => {
      if (phase !== "betting") return;
      setBet((b) => Math.max(10, Math.min(chips, b + delta)));
    },
    [phase, chips],
  );

  const outcomeText =
    outcome === "blackjack" ? "Blackjack! 3:2 payout" :
    outcome === "win" ? "You win" :
    outcome === "push" ? "Push" :
    outcome === "lose" ? "Dealer wins" :
    outcome === "bust" ? "Bust" : "";

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Blackjack"
          stats={[
            { label: "Chips", value: chips, accent: true },
            { label: "Bet", value: bet },
            { label: "Best", value: bestChips },
          ]}
          rules={
            <div>
              <h3 style={{ marginBottom: "0.5rem", fontWeight: 700 }}>Blackjack</h3>
              <p>Beat the dealer without going over 21. Face cards = 10, Ace = 1 or 11.</p>
              <h4 style={{ marginTop: "0.75rem", fontWeight: 600 }}>Controls</h4>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                <li>Set your bet, then Deal</li>
                <li>Hit — take a card. Stand — keep your total. Double — one card, double bet</li>
              </ul>
              <h4 style={{ marginTop: "0.75rem", fontWeight: 600 }}>Rules</h4>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem" }}>
                <li>Dealer stands on 17 (including soft 17)</li>
                <li>Natural blackjack pays 3:2</li>
                <li>Bust loses immediately. Start over with Reset when chips run out.</li>
              </ul>
            </div>
          }
          actions={<GameAuth />}
        />
      }
    >
      <div className="flex flex-col items-center h-full gap-3 p-3 overflow-hidden">
        {/* Dealer */}
        <div className="flex flex-col items-center gap-2">
          <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            Dealer{!hideHole && dealer.length > 0 ? ` — ${dTotal}` : ""}
          </div>
          <CardRow cards={dealer} hideIndex={hideHole ? 1 : -1} />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 0,
            textAlign: "center",
          }}
        >
          {phase === "settled" && (
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontWeight: 800,
                fontSize: "clamp(1.25rem, 5vmin, 2rem)",
                color:
                  outcome === "win" || outcome === "blackjack" ? "var(--success)" :
                  outcome === "push" ? "var(--muted)" : "var(--error)",
              }}
            >
              {outcomeText}
            </div>
          )}
          {phase === "betting" && (
            <div className="flex items-center gap-3">
              <GameButton size="md" variant="ghost" onClick={() => adjustBet(-50)}>−50</GameButton>
              <div
                style={{
                  fontFamily: "Fraunces, serif",
                  fontWeight: 800,
                  fontSize: "1.5rem",
                  minWidth: "4rem",
                }}
              >
                {bet}
              </div>
              <GameButton size="md" variant="ghost" onClick={() => adjustBet(50)}>+50</GameButton>
            </div>
          )}
        </div>

        {/* Player */}
        <div className="flex flex-col items-center gap-2">
          <CardRow cards={player} hideIndex={-1} />
          <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            You{player.length > 0 ? ` — ${pTotal}` : ""}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex gap-2 flex-wrap justify-center">
          {phase === "betting" && chips >= bet && (
            <GameButton size="md" variant="primary" onClick={deal}>Deal</GameButton>
          )}
          {phase === "betting" && chips < bet && (
            <GameButton size="md" variant="primary" onClick={fullReset}>Reset Chips</GameButton>
          )}
          {phase === "player" && (
            <>
              <GameButton size="md" variant="primary" onClick={hit}>Hit</GameButton>
              <GameButton size="md" variant="secondary" onClick={stand}>Stand</GameButton>
              {player.length === 2 && chips >= bet && (
                <GameButton size="md" variant="ghost" onClick={doubleDown}>Double</GameButton>
              )}
            </>
          )}
          {phase === "settled" && (
            <GameButton size="md" variant="primary" onClick={newHand}>New Hand</GameButton>
          )}
        </div>

        <a
          href="https://freegamestore.online"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--muted)", fontSize: "0.7rem", textDecoration: "none" }}
        >
          Part of FreeGameStore — free forever
        </a>
      </div>
    </GameShell>
  );
}

function CardRow({ cards, hideIndex }: { cards: Card[]; hideIndex: number }) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", minHeight: "5.5rem" }}>
      {cards.map((c, i) => (
        <CardView key={i} card={c} hidden={i === hideIndex} />
      ))}
    </div>
  );
}

function CardView({ card, hidden }: { card: Card; hidden: boolean }) {
  const red = card.suit === "♥" || card.suit === "♦";
  if (hidden) {
    return (
      <div
        style={{
          width: "clamp(2.6rem, 11vmin, 3.6rem)",
          height: "clamp(3.6rem, 15vmin, 5rem)",
          borderRadius: "0.4rem",
          background: "var(--accent)",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 4px, transparent 4px 8px)",
          border: "1px solid var(--line-strong)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "clamp(2.6rem, 11vmin, 3.6rem)",
        height: "clamp(3.6rem, 15vmin, 5rem)",
        borderRadius: "0.4rem",
        background: "var(--paper)",
        border: "1px solid var(--line-strong)",
        color: red ? "#dc2626" : "var(--ink)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "0.25rem 0.35rem",
        fontFamily: "Fraunces, serif",
        fontWeight: 700,
        fontSize: "clamp(0.85rem, 4vmin, 1.15rem)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      <span style={{ alignSelf: "flex-start" }}>{card.rank}</span>
      <span style={{ alignSelf: "flex-end", fontSize: "1.1em" }}>{card.suit}</span>
    </div>
  );
}
