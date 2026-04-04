-- Add slug column to signals and paper_trades for Polymarket deep linking
ALTER TABLE signals ADD COLUMN slug TEXT NOT NULL DEFAULT '';
ALTER TABLE paper_trades ADD COLUMN slug TEXT NOT NULL DEFAULT '';
