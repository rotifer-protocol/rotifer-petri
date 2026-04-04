import type { ArbSignal, FundConfig, MarketSnapshot, TradeAction } from "./types";
import { sizing } from "./types";
import { effectiveSizing, getOpenPositionCount } from "./risk";
import {
  calculateCashBalance,
  calculateDrawdownPct,
  calculateOpenPositionStats,
  calculateTotalValue,
  PERFORMANCE_REALIZED_TRADE_WHERE_SQL,
} from "./accounting";
import { fetchPrices } from "./price";

function entryDirection(sig: ArbSignal): string {
  if (sig.type === "MISPRICING") return sig.direction === "BUY_BOTH" ? "BUY_YES" : "SELL_YES";
  if (sig.type === "MULTI_OUTCOME_ARB") return sig.direction === "BUY_STRONGEST" ? "BUY_YES" : "SELL_YES";
  return "BUY_YES";
}

function entryPrice(sig: ArbSignal): number {
  if (sig.type === "SPREAD") return sig.prices["midpoint"] ?? 0.5;
  const p = Object.entries(sig.prices).filter(
    ([k]) => k !== "sum" && k !== "yes_price_sum" && k !== "volume24hr",
  );
  if (p.length === 0) return 0.5;
  if (sig.direction === "BUY_STRONGEST" || sig.direction === "BUY_BOTH") {
    return Math.max(...p.map(([, v]) => v));
  }
  return Math.min(...p.map(([, v]) => v));
}

async function getBalance(db: D1Database, fundId: string, initial: number): Promise<number> {
  const invested = await db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM paper_trades WHERE fund_id = ? AND status = 'OPEN'",
  ).bind(fundId).first<{ total: number }>();
  const realized = await db.prepare(
    `SELECT COALESCE(SUM(pnl), 0) as total
     FROM paper_trades
     WHERE fund_id = ? AND ${PERFORMANCE_REALIZED_TRADE_WHERE_SQL}`,
  ).bind(fundId).first<{ total: number }>();
  return calculateCashBalance(initial, invested?.total ?? 0, realized?.total ?? 0);
}

async function getEventExposure(db: D1Database, fundId: string, eventSlug: string): Promise<number> {
  const r = await db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM paper_trades WHERE fund_id = ? AND status = 'OPEN' AND slug = ?",
  ).bind(fundId, eventSlug).first<{ total: number }>();
  return r?.total ?? 0;
}

async function isFrozen(db: D1Database, fundId: string): Promise<boolean> {
  const r = await db.prepare(
    "SELECT frozen_until FROM portfolio_snapshots WHERE fund_id = ? AND frozen_until IS NOT NULL ORDER BY date DESC LIMIT 1",
  ).bind(fundId).first<{ frozen_until: string }>();
  if (!r) return false;
  return new Date(r.frozen_until) > new Date();
}

async function isDuplicate(db: D1Database, fundId: string, marketId: string): Promise<boolean> {
  const r = await db.prepare(
    "SELECT COUNT(*) as cnt FROM paper_trades WHERE fund_id = ? AND market_id = ? AND status = 'OPEN'",
  ).bind(fundId, marketId).first<{ cnt: number }>();
  return (r?.cnt ?? 0) > 0;
}

export async function paperTrade(
  db: D1Database,
  sigs: ArbSignal[],
  markets: MarketSnapshot[],
  funds: FundConfig[],
  ts: string,
): Promise<TradeAction[]> {
  const trades: TradeAction[] = [];

  for (const fund of funds) {
    if (await isFrozen(db, fund.id)) continue;

    const openCount = await getOpenPositionCount(db, fund.id);
    if (openCount >= fund.maxOpenPositions) continue;

    let cash = await getBalance(db, fund.id, fund.initialBalance);
    let positionsOpened = 0;
    const openTradesResult = await db.prepare(
      "SELECT market_id, direction, shares, amount FROM paper_trades WHERE fund_id = ? AND status = 'OPEN'",
    ).bind(fund.id).all<{
      market_id: string;
      direction: string;
      shares: number;
      amount: number;
    }>();
    const openTrades = openTradesResult.results ?? [];
    const priceMap = openTrades.length > 0
      ? await fetchPrices(openTrades.map(trade => trade.market_id))
      : new Map<string, number>();
    const openStats = calculateOpenPositionStats(openTrades, priceMap);
    const realizedPnl = cash + openStats.invested - fund.initialBalance;
    const currentEquity = calculateTotalValue(fund.initialBalance, realizedPnl, openStats.unrealizedPnl);
    const currentDrawdown = calculateDrawdownPct(fund.initialBalance, currentEquity);

    for (const sig of sigs) {
      if (openCount + positionsOpened >= fund.maxOpenPositions) break;

      if (!fund.allowedTypes.includes(sig.type)) continue;
      if (sig.edge < fund.minEdge) continue;
      if (sig.confidence < fund.minConfidence) continue;

      const vol = sig.prices["volume24hr"] ?? 0;
      if (vol < fund.minVolume) continue;

      const liq = sig.prices["liquidity"] ?? vol;
      if (liq < fund.minLiquidity) continue;

      if (fund.id === "octopus" && sig.type !== "SPREAD" && sig.edge * sig.confidence < 1.5) continue;

      const effectiveMarketId = sig.resolvedMarketId ?? sig.marketId;
      if (await isDuplicate(db, fund.id, effectiveMarketId)) continue;
      const exposure = await getEventExposure(db, fund.id, sig.slug);
      if (exposure >= fund.maxPerEvent) continue;

      const rawSize = sizing(fund, sig);
      const adjustedSize = effectiveSizing(rawSize, currentDrawdown, fund);
      const amount = Math.min(adjustedSize, cash, fund.maxPerEvent - exposure);
      if (amount < 50) continue;

      const price = entryPrice(sig);
      if (price <= 0.01 || price >= 0.99) continue;
      const dir = entryDirection(sig);
      const shares = amount / price;

      await db.prepare(
        "INSERT INTO paper_trades (id, fund_id, signal_id, market_id, slug, question, direction, entry_price, shares, amount, status, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)",
      ).bind(crypto.randomUUID(), fund.id, sig.signalId, effectiveMarketId, sig.slug, sig.question, dir, price, shares, amount, ts).run();

      cash -= amount;
      positionsOpened++;
      trades.push({
        fundId: fund.id,
        fundEmoji: fund.emoji,
        fundName: fund.name,
        signalId: sig.signalId,
        slug: sig.slug,
        question: sig.question,
        direction: dir,
        price,
        amount,
        shares,
      });
    }
  }
  return trades;
}
