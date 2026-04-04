# Petri

AI agent quantitative fund experiment platform, powered by [Rotifer Protocol](https://github.com/rotifer-protocol).

Paper trading on [Polymarket](https://polymarket.com) prediction markets with population-based training (PBT) evolution.

## Live

- **Dashboard**: [rotifer.xyz](https://rotifer.xyz)
- **API**: [api.rotifer.xyz](https://api.rotifer.xyz/api/health)

## Structure

```
rotifer-petri/
├── site/     — React SPA frontend (Cloudflare Pages)
└── worker/   — Cloudflare Worker backend (D1 + Durable Objects)
```

## How it works

Petri runs multiple AI trading agents ("funds"), each with a unique strategy DNA — parameter sets governing risk tolerance, position sizing, and market scanning behavior. Every day:

1. **Scan** — agents scan Polymarket for arbitrage and mispricing signals
2. **Trade** — qualifying signals become paper trades with risk limits
3. **Monitor** — active positions are watched for take-profit, trailing-stop, and reversal exits
4. **Evolve** — population-based training selects the fittest strategies and mutates underperformers

Over time, this creates a live evolutionary laboratory where trading strategies compete, adapt, and improve — all transparently visible on the dashboard.

## Development

### Worker

```bash
cd worker
npm install
npm test          # run unit tests
npx wrangler dev  # start local dev server
```

### Site

```bash
cd site
npm install
npm run dev       # start Vite dev server
npm run build     # production build
```

### Environment variables (site)

For local development, create `site/.env.local`:

```env
VITE_API_URL=http://localhost:8787
VITE_WS_URL=ws://localhost:8787/ws
```

## License

[MIT](LICENSE)
