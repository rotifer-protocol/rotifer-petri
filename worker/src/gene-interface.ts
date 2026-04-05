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

// ─── Gene Metadata (future phenotype.json) ──────────────

export interface GeneMeta {
  id: string;
  name: string;
  version: string;
  fidelity: "native" | "wrapped";
  inputSchema: string;
  outputSchema: string;
}

export const GENE_REGISTRY: GeneMeta[] = [
  {
    id: "polymarket-scanner",
    name: "Polymarket Scanner",
    version: "0.1.0",
    fidelity: "native",
    inputSchema: "ScannerInput",
    outputSchema: "ScannerOutput",
  },
  {
    id: "polymarket-risk",
    name: "Polymarket Risk Manager",
    version: "0.1.0",
    fidelity: "native",
    inputSchema: "RiskInput",
    outputSchema: "RiskOutput",
  },
  {
    id: "polymarket-monitor",
    name: "Polymarket Active Monitor",
    version: "0.1.0",
    fidelity: "native",
    inputSchema: "MonitorInput",
    outputSchema: "MonitorOutput",
  },
  {
    id: "polymarket-settler",
    name: "Polymarket Market Settler",
    version: "0.1.0",
    fidelity: "native",
    inputSchema: "SettlerInput",
    outputSchema: "SettlerOutput",
  },
  {
    id: "polymarket-trader",
    name: "Polymarket Paper Trader",
    version: "0.1.0",
    fidelity: "native",
    inputSchema: "TraderInput",
    outputSchema: "TraderOutput",
  },
  {
    id: "polymarket-evolver",
    name: "Polymarket Strategy Evolver",
    version: "0.1.0",
    fidelity: "native",
    inputSchema: "EvolverInput",
    outputSchema: "MicroEvolverOutput | MacroEvolverOutput",
  },
];
