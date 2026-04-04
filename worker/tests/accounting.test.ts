import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCashBalance,
  calculateCurrentPositionValue,
  calculateDrawdownPct,
  calculateOpenPositionStats,
  calculateReturnPct,
  calculateTotalValue,
  PERFORMANCE_REALIZED_TRADE_WHERE_SQL,
  REALIZED_TRADE_STATUSES,
} from "../src/accounting";

test("mark-to-market total does not count open principal as profit", () => {
  const openStats = calculateOpenPositionStats(
    [{ market_id: "market-1", direction: "BUY_YES", shares: 20000, amount: 10000 }],
    new Map([["market-1", 0.5]]),
  );

  assert.equal(openStats.invested, 10000);
  assert.equal(openStats.unrealizedPnl, 0);

  const totalValue = calculateTotalValue(10000, 0, openStats.unrealizedPnl);
  const returnPct = calculateReturnPct(10000, totalValue);

  assert.equal(totalValue, 10000);
  assert.equal(returnPct, 0);
});

test("open position stats compute unrealized pnl for mixed long and short trades", () => {
  const openStats = calculateOpenPositionStats(
    [
      { market_id: "long", direction: "BUY_YES", shares: 1000, amount: 400 },
      { market_id: "short", direction: "SELL_YES", shares: 1000, amount: 700 },
    ],
    new Map([
      ["long", 0.5],
      ["short", 0.6],
    ]),
  );

  assert.equal(openStats.openPositions, 2);
  assert.equal(openStats.invested, 1100);
  assert.equal(openStats.unrealizedPnl, 200);
});

test("cash balance subtracts invested capital and adds realized pnl", () => {
  assert.equal(calculateCashBalance(10000, 725, 0), 9275);
  assert.equal(calculateCashBalance(10000, 725, 150), 9425);
});

test("drawdown uses mark-to-market equity instead of invested notional", () => {
  const totalValue = calculateTotalValue(10000, 0, -250);
  assert.equal(totalValue, 9750);
  assert.equal(calculateDrawdownPct(10000, totalValue), 0.025);
});

test("current position value is cost basis plus unrealized pnl", () => {
  assert.equal(calculateCurrentPositionValue(400, 100), 500);
  assert.equal(calculateCurrentPositionValue(700, -100), 600);
});

test("realized trade status list includes monitor-driven close states", () => {
  assert.deepEqual(
    REALIZED_TRADE_STATUSES,
    [
      "RESOLVED",
      "STOPPED",
      "EXPIRED",
      "PROFIT_TAKEN",
      "TRAILING_STOPPED",
      "REVERSED",
    ],
  );
});

test("performance filter excludes migrated invalidation rows", () => {
  assert.match(PERFORMANCE_REALIZED_TRADE_WHERE_SQL, /monitor_reason IS NULL/);
  assert.match(PERFORMANCE_REALIZED_TRADE_WHERE_SQL, /NOT LIKE 'MIGRATED:%'/);
});
