import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TradingEngineRulesTab = () => {
  return (
    <div className="space-y-6">
      {/* Market Data Architecture */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Market Data Architecture
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Data Feed</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Chart Data (Display)</h4>
              <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="text-primary font-mono">Source: Twelve Data API</p>
                <p className="mt-2">• Lightweight Charts with live price updates</p>
                <p>• Real-time candlestick charts synced with execution</p>
                <p>• Single source of truth: price-engine</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Execution Prices (Trading)</h4>
              <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="text-primary font-mono">Source: Twelve Data (via price-engine)</p>
                <p className="mt-2">• Centralized price-engine edge function</p>
                <p>• Chart = Panel = Execution = P&L</p>
                <p>• Realtime updates via Supabase</p>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-400 font-medium">Audit Trail</p>
            <p className="mt-1">market_candles and market_prices tables store historical data for dispute resolution and backtesting.</p>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Asset Instrument Support */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Multi-Asset Instrument Support
            <Badge variant="secondary">Instruments</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-5 gap-2 font-semibold text-muted-foreground border-b border-border pb-2">
              <span>Asset Class</span>
              <span>Example</span>
              <span>Contract Size</span>
              <span>Quantity Type</span>
              <span>Quote Currency</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-muted-foreground">
              <span className="text-foreground">Forex</span>
              <span>EUR/USD</span>
              <span>100,000</span>
              <span>Lots</span>
              <span>USD</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-muted-foreground">
              <span className="text-foreground">Indices</span>
              <span>US500</span>
              <span>1</span>
              <span>Contracts</span>
              <span>USD</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-muted-foreground">
              <span className="text-foreground">Commodities</span>
              <span>XAUUSD</span>
              <span>100</span>
              <span>Units</span>
              <span>USD</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-muted-foreground">
              <span className="text-foreground">Stocks</span>
              <span>AAPL</span>
              <span>1</span>
              <span>Shares</span>
              <span>USD</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-muted-foreground">
              <span className="text-foreground">Crypto</span>
              <span>BTC/USD</span>
              <span>1</span>
              <span>Units</span>
              <span>USD</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Margin Formula */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Margin Calculation (Instrument-Aware)
            <Badge variant="secondary">Core</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm space-y-2">
            <p className="text-muted-foreground">Notional Value = Quantity × Entry Price × Contract Size</p>
            <p className="text-primary">Required Margin = Notional Value ÷ Leverage</p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Example (Forex):</strong> Opening 0.1 lot EUR/USD at 1.0850 with 50x leverage</p>
            <p className="pl-4">Notional = 0.1 × 1.0850 × 100,000 = $10,850</p>
            <p className="pl-4">Required Margin = $10,850 ÷ 50 = <span className="text-foreground">$217</span></p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Example (Crypto):</strong> Opening 0.5 BTC at $50,000 with 10x leverage</p>
            <p className="pl-4">Notional = 0.5 × $50,000 × 1 = $25,000</p>
            <p className="pl-4">Required Margin = $25,000 ÷ 10 = <span className="text-foreground">$2,500</span></p>
          </div>
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">• Free Margin = Equity – Used Margin</p>
            <p className="text-muted-foreground">• Orders rejected if Free Margin &lt; Required Margin</p>
            <p className="text-muted-foreground">• Leverage may be overridden per instrument via competition_instruments</p>
          </div>
        </CardContent>
      </Card>

      {/* P&L Formula */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Profit & Loss Calculation (Instrument-Aware)
            <Badge variant="secondary">Core</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm space-y-2">
            <p className="text-emerald-400">Long P&L = (Current Price – Entry Price) × Quantity × Contract Size</p>
            <p className="text-red-400">Short P&L = (Entry Price – Current Price) × Quantity × Contract Size</p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Example (Forex):</strong> Long 0.1 lot EUR/USD, entry 1.0850, current 1.0900</p>
            <p className="pl-4">P&L = (1.0900 – 1.0850) × 0.1 × 100,000 = <span className="text-emerald-400">+$500</span></p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Unrealized P&L:</strong> Calculated in real-time for open positions</p>
            <p><strong>Realized P&L:</strong> Locked in when position is closed</p>
          </div>
        </CardContent>
      </Card>

      {/* Equity Updates */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Equity Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm">
            <p className="text-primary">Equity = Balance + Unrealized P&L</p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Equity updates on every price tick (or at defined intervals)</p>
            <p>• Balance only changes when positions are closed</p>
            <p>• Snapshots stored periodically for charting and auditing</p>
          </div>
        </CardContent>
      </Card>

      {/* Peak Equity & Drawdown */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Peak Equity & Drawdown
            <Badge variant="destructive">Risk Control</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm space-y-2">
            <p className="text-muted-foreground">Peak Equity = MAX(Equity) over competition lifetime</p>
            <p className="text-primary">Drawdown % = (Peak Equity – Current Equity) ÷ Peak Equity × 100</p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Peak Equity only increases, never decreases</p>
            <p>• Max Drawdown = highest Drawdown % recorded</p>
            <p>• Used for disqualification checks and scoring</p>
          </div>
        </CardContent>
      </Card>

      {/* Disqualification Triggers */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Disqualification Triggers
            <Badge variant="destructive">Enforcement</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-red-400 font-semibold">1.</span>
              <div>
                <p className="text-foreground font-medium">Max Drawdown Breach</p>
                <p className="text-muted-foreground">Current Drawdown % exceeds competition's max_drawdown_pct</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-red-400 font-semibold">2.</span>
              <div>
                <p className="text-foreground font-medium">Minimum Trade Requirement</p>
                <p className="text-muted-foreground">Less than min_trades completed by competition end</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-amber-400 font-semibold">3.</span>
              <div>
                <p className="text-foreground font-medium">Suspicious Activity (Future)</p>
                <p className="text-muted-foreground">Pattern detection for manipulation or collusion</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Formula */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Score Formula
            <Badge className="bg-primary/20 text-primary border-primary/30">Ranking</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 font-mono text-lg text-center">
            <p className="text-primary font-bold">Score = Net Profit % – (Max Drawdown % × 0.5)</p>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Rationale:</strong> Rewards profitability while penalizing excessive risk-taking</p>
            <p><strong>Example:</strong></p>
            <div className="pl-4 space-y-1">
              <p>• Trader A: +25% profit, 10% max drawdown → Score = 25 – 5 = <span className="text-emerald-400">20</span></p>
              <p>• Trader B: +30% profit, 25% max drawdown → Score = 30 – 12.5 = <span className="text-amber-400">17.5</span></p>
            </div>
            <p className="pt-2">Trader A ranks higher despite lower raw profit due to better risk management.</p>
          </div>
        </CardContent>
      </Card>

      {/* Open Positions at End */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Handling Open Positions at Competition End</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-3">
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
              <span className="text-primary font-semibold">1.</span>
              <p className="text-muted-foreground">
                All open positions are <span className="text-foreground">automatically closed</span> at the final price tick
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
              <span className="text-primary font-semibold">2.</span>
              <p className="text-muted-foreground">
                Unrealized P&L becomes Realized P&L
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
              <span className="text-primary font-semibold">3.</span>
              <p className="text-muted-foreground">
                Final equity and score are calculated and locked
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
              <span className="text-primary font-semibold">4.</span>
              <p className="text-muted-foreground">
                Rankings are finalized and prize distribution begins
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Flow Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Engine Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-secondary/30 p-4 rounded-lg text-muted-foreground overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────┐
│                    TRADING ENGINE FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Price Tick] ──► Update Positions ──► Recalc Unrealized P&L │
│                          │                                   │
│                          ▼                                   │
│                   Update Equity                              │
│                          │                                   │
│                          ▼                                   │
│              Check Peak Equity (update if higher)            │
│                          │                                   │
│                          ▼                                   │
│                Calculate Current Drawdown %                  │
│                          │                                   │
│                          ▼                                   │
│              ┌───── Drawdown Check ─────┐                    │
│              │                          │                    │
│         [PASS]                     [BREACH]                  │
│              │                          │                    │
│              ▼                          ▼                    │
│         Continue                   Disqualify                │
│                                         │                    │
│                                         ▼                    │
│                                  Close All Positions         │
│                                  Lock Account                │
│                                                              │
└─────────────────────────────────────────────────────────────┘`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingEngineRulesTab;
