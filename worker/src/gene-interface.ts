/**
 * Phase 3: Gene Interface Layer (ADR-199 §3.1)
 *
 * Defines the GeneResult/GeneInput contracts that each module must conform to.
 * Once Rotifer Protocol v0.9 Composition spec is finalized, these can be
 * extracted into independent Genes with phenotype.json schemas.
 */

import type { ArbSignal, FundConfig, MarketSnapshot, TradeAction, AgentEvent } from "./types";
import type { MonitorAction, MonitorResult } from "./monitor";
import type { MicroEvolveResult } from "./micro-evolve";
import type { EvolutionReport } from "./evolve";

// ─── Scanner Gene ───────────────────────────────────────

export interface ScannerInput {
  scanLimit: number;
  minVolume: number;
  minLiquidity: number;
}

export interface ScannerOutput {
  markets: MarketSnapshot[];
  filtered: MarketSnapshot[];
  signals: ArbSignal[];
  totalFetched: number;
  avgEdge: number;
}

// ─── Risk Gene ──────────────────────────────────────────

export interface RiskInput {
  funds: FundConfig[];
}

export interface RiskOutput {
  stopped: Array<{ fundId: string; fundEmoji: string; slug: string; question: string; pnl: number; entryPrice: number; exitPrice: number }>;
  expired: Array<{ fundId: string; fundEmoji: string; slug: string; question: string; pnl: number }>;
}

// ─── Monitor Gene ───────────────────────────────────────

export interface MonitorInput {
  funds: FundConfig[];
}

export interface MonitorOutput {
  actions: MonitorAction[];
  highWaterMarkUpdates: MonitorResult["highWaterMarkUpdates"];
}

// ─── Trader Gene ────────────────────────────────────────

export interface TraderInput {
  signals: ArbSignal[];
  markets: MarketSnapshot[];
  funds: FundConfig[];
  timestamp: string;
}

export interface TraderOutput {
  trades: TradeAction[];
}

// ─── Settler Gene ───────────────────────────────────────

export interface SettlerInput {
  markets: MarketSnapshot[];
  funds: FundConfig[];
}

export interface SettlerOutput {
  settlements: Array<{ fundId: string; fundEmoji: string; slug: string; question: string; pnl: number; entryPrice: number; exitPrice: number }>;
}

// ─── Evolver Gene ───────────────────────────────────────

export interface EvolverInput {
  mode: "micro" | "macro";
  funds: FundConfig[];
}

export interface MicroEvolverOutput {
  results: MicroEvolveResult[];
}

export interface MacroEvolverOutput {
  report: EvolutionReport;
}

// ─── Genome Pipeline Result ─────────────────────────────

export interface GenomePipelineResult {
  scanner: ScannerOutput;
  risk: RiskOutput;
  monitor: MonitorOutput;
  settler: SettlerOutput;
  trader: TraderOutput;
  microEvolver: MicroEvolverOutput;
  events: AgentEvent[];
  timestamp: string;
}

// ─── Gene Metadata ──────────────────────────────────────
//
// Fidelity follows Rotifer Protocol Specification §4 (Gene Standard):
//   - "hybrid"  = requires external network calls (API, WebSocket)
//   - "native"  = pure computation, eligible for WASM IR compilation
//   - "wrapped" = thin wrapper around external service
//
// Status: all 6 genes are currently "embedded" in the Petri Worker
// (Phase 3.5 touchstone). They are NOT yet published to Rotifer Cloud
// or compiled to IR. The fidelity field reflects the *target* form
// for when they enter the full protocol lifecycle.
//
// Migration path: see internal/plan/petri-phase-0-5-implementation.md
// § "Petri → Rotifer 化过渡清单"

export type GeneFidelity = "native" | "wrapped" | "hybrid";
export type GeneLifecycleStatus = "embedded" | "published" | "trial" | "active";

export interface GeneMeta {
  id: string;
  name: string;
  nameZh?: string;
  version: string;
  fidelity: GeneFidelity;
  lifecycleStatus: GeneLifecycleStatus;
  inputSchema: string;
  outputSchema: string;
  externalDependencies?: string[];
}

export const GENE_REGISTRY: GeneMeta[] = [
  {
    id: "polymarket-scanner",
    name: "Polymarket Scanner",
    nameZh: "信号扫描器",
    version: "0.1.0",
    fidelity: "hybrid",
    lifecycleStatus: "embedded",
    inputSchema: "ScannerInput",
    outputSchema: "ScannerOutput",
    externalDependencies: ["gamma-api.polymarket.com"],
  },
  {
    id: "polymarket-risk",
    name: "Polymarket Risk Manager",
    nameZh: "风控管理器",
    version: "0.1.0",
    fidelity: "native",
    lifecycleStatus: "embedded",
    inputSchema: "RiskInput",
    outputSchema: "RiskOutput",
  },
  {
    id: "polymarket-monitor",
    name: "Polymarket Active Monitor",
    nameZh: "持仓监控器",
    version: "0.1.0",
    fidelity: "hybrid",
    lifecycleStatus: "embedded",
    inputSchema: "MonitorInput",
    outputSchema: "MonitorOutput",
    externalDependencies: ["gamma-api.polymarket.com"],
  },
  {
    id: "polymarket-settler",
    name: "Polymarket Market Settler",
    nameZh: "结算清算器",
    version: "0.1.0",
    fidelity: "native",
    lifecycleStatus: "embedded",
    inputSchema: "SettlerInput",
    outputSchema: "SettlerOutput",
  },
  {
    id: "polymarket-trader",
    name: "Polymarket Paper Trader",
    nameZh: "模拟交易器",
    version: "0.1.0",
    fidelity: "native",
    lifecycleStatus: "embedded",
    inputSchema: "TraderInput",
    outputSchema: "TraderOutput",
  },
  {
    id: "polymarket-evolver",
    name: "Polymarket Strategy Evolver",
    nameZh: "策略进化器",
    version: "0.1.0",
    fidelity: "native",
    lifecycleStatus: "embedded",
    inputSchema: "EvolverInput",
    outputSchema: "MicroEvolverOutput | MacroEvolverOutput",
  },
];
