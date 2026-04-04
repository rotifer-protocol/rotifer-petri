-- Initial schema for Polymarket Agent
-- Tables: scans, signals, paper_trades, portfolio_snapshots

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  scanned_at TEXT NOT NULL,
  total_fetched INTEGER NOT NULL,
  markets_filtered INTEGER NOT NULL,
  signals_found INTEGER NOT NULL,
  avg_edge REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  signal_id TEXT NOT NULL,
  type TEXT NOT NULL,
  market_id TEXT NOT NULL,
  question TEXT NOT NULL,
  description TEXT NOT NULL,
  edge REAL NOT NULL,
  confidence REAL NOT NULL,
  direction TEXT NOT NULL,
  prices TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (scan_id) REFERENCES scans(id)
);

CREATE TABLE IF NOT EXISTS paper_trades (
  id TEXT PRIMARY KEY,
  fund_id TEXT NOT NULL,
  signal_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  question TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL,
  shares REAL NOT NULL,
  amount REAL NOT NULL,
  pnl REAL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  opened_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id TEXT PRIMARY KEY,
  fund_id TEXT NOT NULL,
  date TEXT NOT NULL,
  cash_balance REAL NOT NULL,
  open_positions INTEGER NOT NULL DEFAULT 0,
  unrealized_pnl REAL NOT NULL DEFAULT 0,
  realized_pnl REAL NOT NULL DEFAULT 0,
  total_value REAL NOT NULL,
  win_count INTEGER NOT NULL DEFAULT 0,
  loss_count INTEGER NOT NULL DEFAULT 0,
  win_rate REAL NOT NULL DEFAULT 0,
  monthly_target REAL,
  drawdown_limit REAL,
  frozen_until TEXT
);

CREATE INDEX IF NOT EXISTS idx_trades_fund_status ON paper_trades(fund_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_market ON paper_trades(market_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_opened ON paper_trades(opened_at);
CREATE INDEX IF NOT EXISTS idx_signals_created ON signals(created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_fund_date ON portfolio_snapshots(fund_id, date);
