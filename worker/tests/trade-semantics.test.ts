import test from "node:test";
import assert from "node:assert/strict";

import {
  countsTowardPerformance,
  getCloseReasonCode,
  getCloseReasonText,
  toDisplayTradeStatus,
} from "../src/trade-semantics";

test("legacy migrated expiry is presented as invalidated", () => {
  const reason = "MIGRATED: market_id was event slug, cannot fetch price";

  assert.equal(toDisplayTradeStatus("EXPIRED", reason), "INVALIDATED");
  assert.equal(countsTowardPerformance("EXPIRED", reason), false);
});

test("real expiry still counts toward performance", () => {
  assert.equal(
    toDisplayTradeStatus("EXPIRED", "Max hold window reached (21d)"),
    "EXPIRED",
  );
  assert.equal(
    countsTowardPerformance("EXPIRED", "Max hold window reached (21d)"),
    true,
  );
});

test("close reason helpers preserve strategy semantics", () => {
  assert.equal(getCloseReasonCode("REVERSED", "Probability reversed by 21.0pp"), "PROBABILITY_REVERSED");
  assert.equal(getCloseReasonCode("RESOLVED", null), "MARKET_RESOLVED");
  assert.match(
    getCloseReasonText("EXPIRED", "MIGRATED: legacy slug trade") ?? "",
    /System migration closed/i,
  );
});
