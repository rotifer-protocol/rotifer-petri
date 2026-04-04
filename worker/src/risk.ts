import type { FundConfig, MarketSnapshot, Settlement } from "./types";
import { fetchCurrentPrice, calcUnrealizedPnl } from "./price";

export interface RiskCheckResult {
  stopped: Settlement[];
  expired: Settlement[];
}

/**
 * D-Evo-12: Check stop-loss and time-based exit for all open positions.
 * Called during each cron cycle before opening new trades.
 */
export async function checkRiskLimits(
  db: D1Database,
  funds: FundConfig[],
): Promise<RiskCheckResult> {
  const stopped: Settlement[] = [];
  const expired: Settlement[] = [];
  const now = new Date();
  const ts = now.toISOString();

  const openTrades = await db.prepare(
    "SELECT * FROM paper_trades WHERE status = 'OPEN'",
  ).all();
  if (!openTrades.results || openTrades.results.length === 0) {
    return { stopped, expired };
  }

  for (const trade of openTrades.results as any[]) {
    const fund = funds.find(f => f.id === trade.fund_id);
    if (!fund) continue;

    const openedAt = new Date(trade.opened_at);
    const holdDays = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (holdDays >= fund.maxHoldDays) {
      const currentPrice = await fetchCurrentPrice(trade.market_id);
      const exitPrice = currentPrice ?? trade.entry_price;
      const pnl = calcUnrealizedPnl(trade.direction, trade.shares, trade.amount, exitPrice);
      const closeReason = `Max hold window reached (${fund.maxHoldDays}d)`;

      await db.prepare(
        "UPDATE paper_trades SET status = 'EXPIRED', exit_price = ?, pnl = ?, closed_at = ?, monitor_reason = ? WHERE id = ?",
      ).bind(exitPrice, pnl, ts, closeReason, trade.id).run();

      expired.push({
        fundId: trade.fund_id,
        fundEmoji: fund.emoji,
        slug: trade.slug ?? "",
        question: trade.question,
        pnl,
        direction: trade.direction,
        entryPrice: trade.entry_price,
        exitPrice,
        status: "EXPIRED",
      });
      continue;
    }

    const currentPrice = await fetchCurrentPrice(trade.market_id);
    if (currentPrice === null) continue;

    const unrealizedPnl = calcUnrealizedPnl(trade.direction, trade.shares, trade.amount, currentPrice);
    const lossPct = -unrealizedPnl / trade.amount;

    if (lossPct >= fund.stopLossPercent) {
      const closeReason = `Stop loss triggered at ${(lossPct * 100).toFixed(1)}% (threshold ${(fund.stopLossPercent * 100).toFixed(1)}%)`;
      await db.prepare(
        "UPDATE paper_trades SET status = 'STOPPED', exit_price = ?, pnl = ?, closed_at = ?, monitor_reason = ? WHERE id = ?",
      ).bind(currentPrice, unrealizedPnl, ts, closeReason, trade.id).run();

      stopped.push({
        fundId: trade.fund_id,
        fundEmoji: fund.emoji,
        slug: trade.slug ?? "",
        question: trade.question,
        pnl: unrealizedPnl,
        direction: trade.direction,
        entryPrice: trade.entry_price,
        exitPrice: currentPrice,
        status: "STOPPED",
      });
    }
  }

  return { stopped, expired };
}

/**
 * D-Evo-12: Calculate effective position sizing with drawdown soft limit.
 * When drawdown is between softLimit and hardLimit, sizing is halved.
 */
export function effectiveSizing(
  rawSize: number,
  currentDrawdown: number,
  fund: FundConfig,
): number {
  if (currentDrawdown >= fund.drawdownLimit) return 0;
  if (currentDrawdown >= fund.drawdownSoftLimit) return Math.round(rawSize * 0.5);
  return rawSize;
}

/**
 * Check if a fund has too many open positions.
 */
export async function getOpenPositionCount(
  db: D1Database,
  fundId: string,
): Promise<number> {
  const r = await db.prepare(
    "SELECT COUNT(*) as cnt FROM paper_trades WHERE fund_id = ? AND status = 'OPEN'",
  ).bind(fundId).first<{ cnt: number }>();
  return r?.cnt ?? 0;
}
