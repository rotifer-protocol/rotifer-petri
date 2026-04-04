import type { ArbSignal, AgentEvent, Env, FundConfig, TradeAction } from "./types";
import { PERFORMANCE_REALIZED_TRADE_WHERE_SQL } from "./accounting";

// ─── Telegram Formatting ────────────────────────────────

function esc(t: string): string {
  return String(t).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function escN(n: number): string {
  return String(n).replace(/\./g, "\\.");
}

function mtr(c: number): string {
  const f = Math.round(c * 5);
  return "█".repeat(f) + "░".repeat(5 - f);
}

const TE: Record<string, string> = {
  MISPRICING: "⚠️",
  MULTI_OUTCOME_ARB: "🎯",
  SPREAD: "📊",
};

const TL: Record<string, string> = {
  MISPRICING: "定价偏差",
  MULTI_OUTCOME_ARB: "多结果套利",
  SPREAD: "买卖价差",
};

const DL: Record<string, string> = {
  SELL_BOTH: "做空双方",
  BUY_BOTH: "买入双方",
  SELL_WEAKEST: "做空最弱项",
  BUY_STRONGEST: "买入最强项",
  PROVIDE_LIQUIDITY: "提供流动性",
  BUY_YES: "买入 Yes",
  SELL_YES: "卖出 Yes",
};

const TG_TIMEOUT_MS = 10_000;

async function tg(token: string, chatId: string, text: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TG_TIMEOUT_MS);
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const d: any = await r.json();
    return r.ok && d.ok;
  } catch {
    console.error("Telegram send failed");
    return false;
  }
}

export function fmtSig(sig: ArbSignal, i: number): string {
  return [
    `${TE[sig.type] || "🔔"} *信号 \\#${i + 1}* \\| \`${esc(sig.signalId)}\``,
    ``,
    `*类型:* ${esc(TL[sig.type] || sig.type)}`,
    `*边际:* ${escN(sig.edge)}%`,
    `*信心度:* ${mtr(sig.confidence)} ${Math.round(sig.confidence * 100)}%`,
    `*方向:* ${esc(DL[sig.direction] || sig.direction)}`,
    ``,
    `❓ ${esc(sig.question.slice(0, 100))}`,
    ``,
    `📝 ${esc(sig.description.slice(0, 200))}`,
    ``,
    `[在 Polymarket 查看](https://polymarket.com/event/${sig.marketId})`,
  ].join("\n");
}

export function fmtTrade(t: TradeAction): string {
  return [
    `${t.fundEmoji} *${esc(t.fundName)}基金 开仓*`,
    ``,
    `📍 ${esc(DL[t.direction] || t.direction)} @ $${escN(t.price)}`,
    `💰 投入: $${t.amount}`,
    `❓ ${esc(t.question.slice(0, 80))}`,
  ].join("\n");
}

export function fmtSummary(
  total: number,
  cnt: number,
  avg: number,
  ok: number,
  fail: number,
  trades: TradeAction[],
  ts: string,
): string {
  const lines = [
    `📡 *Polymarket 套利扫描报告*`,
    ``,
    `🔍 扫描市场数: ${total}`,
    `🎯 发现信号: ${cnt}`,
    `📊 平均边际: ${escN(avg)}%`,
    `✅ 已推送: ${ok} \\| ❌ 失败: ${fail}`,
  ];
  if (trades.length > 0) {
    lines.push(``, `💼 *本轮开仓:*`);
    const byFund = new Map<string, TradeAction[]>();
    for (const t of trades) {
      const a = byFund.get(t.fundId) || [];
      a.push(t);
      byFund.set(t.fundId, a);
    }
    for (const [, ts] of byFund) {
      lines.push(
        `${ts[0].fundEmoji} ${esc(ts[0].fundName)}: ${ts.length}笔 \\($${ts.reduce((s, t) => s + t.amount, 0)}\\)`,
      );
    }
  } else {
    lines.push(``, `💼 本轮无新开仓`);
  }
  lines.push(``, `⏰ ${esc(ts)}`);
  return lines.join("\n");
}

export async function fmtDailyReport(db: D1Database, funds: FundConfig[]): Promise<string> {
  const snapshots: { fund: FundConfig; snap: any }[] = [];
  for (const fund of funds) {
    const snap = await db.prepare(
      "SELECT * FROM portfolio_snapshots WHERE fund_id = ? ORDER BY date DESC LIMIT 1",
    ).bind(fund.id).first();
    snapshots.push({ fund, snap });
  }

  snapshots.sort(
    (a, b) =>
      (b.snap?.total_value ?? b.fund.initialBalance) -
      (a.snap?.total_value ?? a.fund.initialBalance),
  );

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const lines = [`🏆 *每日竞赛报告*`, ``];

  for (let i = 0; i < snapshots.length; i++) {
    const { fund, snap } = snapshots[i];
    const val = snap?.total_value ?? fund.initialBalance;
    const ret = ((val - fund.initialBalance) / fund.initialBalance) * 100;
    const wr = snap ? `${Math.round((snap.win_rate ?? 0) * 100)}%` : "N/A";
    const openPos = snap?.open_positions ?? 0;
    const sign = ret >= 0 ? "\\+" : "";
    lines.push(
      `${medals[i] || `${i + 1}.`} ${fund.emoji} *${esc(fund.name)}* \\| $${escN(Math.round(val))} \\(${sign}${escN(Math.round(ret * 100) / 100)}%\\)`,
    );
    lines.push(
      `   胜率: ${esc(wr)} \\| 持仓: ${openPos}笔 \\| 目标: \\+${Math.round(fund.monthlyTarget * 100)}%/月`,
    );
    lines.push(`   _${esc(fund.motto)}_`);
    lines.push(``);
  }

  const totalTrades = await db.prepare(
    "SELECT COUNT(*) as cnt FROM paper_trades",
  ).first<{ cnt: number }>();
  const openAll = await db.prepare(
    "SELECT COUNT(*) as cnt FROM paper_trades WHERE status = 'OPEN'",
  ).first<{ cnt: number }>();
  const resolvedAll = await db.prepare(
    `SELECT COUNT(*) as cnt FROM paper_trades WHERE ${PERFORMANCE_REALIZED_TRADE_WHERE_SQL}`,
  ).first<{ cnt: number }>();
  const scansAll = await db.prepare(
    "SELECT COUNT(*) as cnt FROM scans",
  ).first<{ cnt: number }>();

  lines.push(`📊 *统计*`);
  lines.push(`总扫描次数: ${scansAll?.cnt ?? 0}`);
  lines.push(
    `总交易笔数: ${totalTrades?.cnt ?? 0} \\(开仓 ${openAll?.cnt ?? 0} / 已结 ${resolvedAll?.cnt ?? 0}\\)`,
  );

  return lines.join("\n");
}

// ─── Send helpers ───────────────────────────────────────

export async function sendSignals(env: Env, sigs: ArbSignal[]): Promise<{ ok: number; fail: number }> {
  let ok = 0, fail = 0;
  for (let i = 0; i < sigs.length; i++) {
    if (await tg(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, fmtSig(sigs[i], i))) ok++;
    else fail++;
    if (i < sigs.length - 1) await new Promise(r => setTimeout(r, 300));
  }
  return { ok, fail };
}

export async function sendTrades(env: Env, trades: TradeAction[]): Promise<void> {
  for (const t of trades) {
    await tg(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, fmtTrade(t));
    await new Promise(r => setTimeout(r, 300));
  }
}

export async function sendSummary(
  env: Env,
  total: number,
  cnt: number,
  avg: number,
  ok: number,
  fail: number,
  trades: TradeAction[],
  ts: string,
): Promise<void> {
  await tg(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, fmtSummary(total, cnt, avg, ok, fail, trades, ts));
}

export async function sendDailyReport(env: Env, funds: FundConfig[]): Promise<void> {
  const report = await fmtDailyReport(env.DB, funds);
  await tg(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, report);
}

// ─── Durable Object Broadcast ───────────────────────────

export async function broadcast(env: Env, event: AgentEvent): Promise<void> {
  try {
    const id = env.LIVE_HUB.idFromName("singleton");
    const stub = env.LIVE_HUB.get(id);
    await stub.fetch("http://internal/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch (e) {
    console.error("DO broadcast failed:", e);
  }
}
