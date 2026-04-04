import { calcUnrealizedPnl } from "./price";
import { PERFORMANCE_MONITOR_REASON_SQL } from "./trade-semantics";

export const REALIZED_TRADE_STATUSES = [
  "RESOLVED",
  "STOPPED",
  "EXPIRED",
  "PROFIT_TAKEN",
  "TRAILING_STOPPED",
  "REVERSED",
] as const;

export const REALIZED_TRADE_STATUS_SQL = REALIZED_TRADE_STATUSES
  .map(status => `'${status}'`)
  .join(",");

export const PERFORMANCE_REALIZED_TRADE_WHERE_SQL =
  `status IN (${REALIZED_TRADE_STATUS_SQL}) AND ${PERFORMANCE_MONITOR_REASON_SQL}`;

export interface OpenTradeAccountingInput {
  market_id: string;
  direction: string;
  shares: number;
  amount: number;
}

type PriceLookup = Map<string, number> | Record<string, number>;

function getPrice(priceLookup: PriceLookup, marketId: string): number | undefined {
  return priceLookup instanceof Map ? priceLookup.get(marketId) : priceLookup[marketId];
}

export function calculateCashBalance(
  initialBalance: number,
  invested: number,
  realizedPnl: number,
): number {
  return Math.round((initialBalance - invested + realizedPnl) * 100) / 100;
}

export function calculateTotalValue(
  initialBalance: number,
  realizedPnl: number,
  unrealizedPnl: number,
): number {
  return Math.round((initialBalance + realizedPnl + unrealizedPnl) * 100) / 100;
}

export function calculateReturnPct(initialBalance: number, totalValue: number): number {
  if (initialBalance === 0) return 0;
  return ((totalValue - initialBalance) / initialBalance) * 100;
}

export function calculateDrawdownPct(initialBalance: number, totalValue: number): number {
  if (initialBalance === 0) return 0;
  return Math.max(0, (initialBalance - totalValue) / initialBalance);
}

export function calculateCurrentPositionValue(amount: number, unrealizedPnl: number): number {
  return Math.round((amount + unrealizedPnl) * 100) / 100;
}

export function calculateOpenPositionStats(
  trades: OpenTradeAccountingInput[],
  priceLookup: PriceLookup,
): {
  openPositions: number;
  invested: number;
  unrealizedPnl: number;
} {
  let invested = 0;
  let unrealizedPnl = 0;

  for (const trade of trades) {
    invested += Number(trade.amount ?? 0);
    const currentPrice = getPrice(priceLookup, trade.market_id);
    if (typeof currentPrice !== "number") continue;
    unrealizedPnl += calcUnrealizedPnl(
      trade.direction,
      Number(trade.shares ?? 0),
      Number(trade.amount ?? 0),
      currentPrice,
    );
  }

  return {
    openPositions: trades.length,
    invested: Math.round(invested * 100) / 100,
    unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
  };
}
