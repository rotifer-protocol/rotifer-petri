const PRICE_FETCH_TIMEOUT_MS = 10_000;

export async function fetchCurrentPrice(marketId: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PRICE_FETCH_TIMEOUT_MS);
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets/${marketId}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data: any = await res.json();
    const prices = Array.isArray(data.outcomePrices)
      ? data.outcomePrices
      : typeof data.outcomePrices === "string"
        ? JSON.parse(data.outcomePrices)
        : null;
    if (!prices || prices.length === 0) return null;
    return Number(prices[0]);
  } catch {
    return null;
  }
}

export async function fetchPrices(marketIds: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(marketIds)];
  const map = new Map<string, number>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const entries = await Promise.allSettled(
      batch.map(async id => {
        const price = await fetchCurrentPrice(id);
        return [id, price] as const;
      }),
    );
    for (const e of entries) {
      if (e.status === "fulfilled" && e.value[1] !== null) {
        map.set(e.value[0], e.value[1]);
      }
    }
  }

  return map;
}

export function calcUnrealizedPnl(
  direction: string,
  shares: number,
  amount: number,
  currentPrice: number,
): number {
  return direction === "BUY_YES"
    ? shares * currentPrice - amount
    : amount - shares * currentPrice;
}
