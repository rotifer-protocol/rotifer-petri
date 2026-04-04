import type { TradeStatus } from "./types";

export type TradeDisplayStatus = TradeStatus | "INVALIDATED";

export type CloseReasonCode =
  | "MARKET_RESOLVED"
  | "STOP_LOSS_TRIGGERED"
  | "MAX_HOLD_REACHED"
  | "TAKE_PROFIT_TRIGGERED"
  | "TRAILING_STOP_TRIGGERED"
  | "PROBABILITY_REVERSED"
  | "SYSTEM_INVALIDATED";

export const SYSTEM_INVALIDATION_REASON_PREFIX = "MIGRATED:";
export const PERFORMANCE_MONITOR_REASON_SQL =
  "(monitor_reason IS NULL OR monitor_reason NOT LIKE 'MIGRATED:%')";
export const SYSTEM_INVALIDATION_MONITOR_REASON_SQL =
  "monitor_reason LIKE 'MIGRATED:%'";

export function isSystemInvalidationReason(reason: unknown): boolean {
  return typeof reason === "string" && reason.startsWith(SYSTEM_INVALIDATION_REASON_PREFIX);
}

export function toDisplayTradeStatus(
  status: unknown,
  monitorReason: unknown,
): TradeDisplayStatus {
  const rawStatus = String(status ?? "");
  if (rawStatus === "EXPIRED" && isSystemInvalidationReason(monitorReason)) {
    return "INVALIDATED";
  }
  return rawStatus as TradeDisplayStatus;
}

export function getCloseReasonCode(
  status: unknown,
  monitorReason: unknown,
): CloseReasonCode | null {
  if (isSystemInvalidationReason(monitorReason)) {
    return "SYSTEM_INVALIDATED";
  }

  switch (String(status ?? "")) {
    case "RESOLVED":
      return "MARKET_RESOLVED";
    case "STOPPED":
      return "STOP_LOSS_TRIGGERED";
    case "EXPIRED":
      return "MAX_HOLD_REACHED";
    case "PROFIT_TAKEN":
      return "TAKE_PROFIT_TRIGGERED";
    case "TRAILING_STOPPED":
      return "TRAILING_STOP_TRIGGERED";
    case "REVERSED":
      return "PROBABILITY_REVERSED";
    default:
      return null;
  }
}

export function getCloseReasonText(
  status: unknown,
  monitorReason: unknown,
): string | null {
  const code = getCloseReasonCode(status, monitorReason);

  if (typeof monitorReason === "string" && monitorReason.trim()) {
    if (code === "SYSTEM_INVALIDATED") {
      return "System migration closed this legacy trade because it stored an event slug instead of a concrete market id.";
    }
    return monitorReason;
  }

  switch (code) {
    case "MARKET_RESOLVED":
      return "Market resolved on Polymarket.";
    case "STOP_LOSS_TRIGGERED":
      return "Stop loss triggered.";
    case "MAX_HOLD_REACHED":
      return "Max hold window reached.";
    case "TAKE_PROFIT_TRIGGERED":
      return "Take profit triggered.";
    case "TRAILING_STOP_TRIGGERED":
      return "Trailing stop triggered.";
    case "PROBABILITY_REVERSED":
      return "Probability reversal triggered.";
    case "SYSTEM_INVALIDATED":
      return "System migration closed this legacy trade because it stored an event slug instead of a concrete market id.";
    default:
      return null;
  }
}

export function countsTowardPerformance(
  status: unknown,
  monitorReason: unknown,
): boolean {
  const displayStatus = toDisplayTradeStatus(status, monitorReason);
  return displayStatus !== "OPEN" && displayStatus !== "INVALIDATED";
}
