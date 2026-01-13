import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const entities = [
  {
    name: "users",
    description: "User accounts from auth system",
    relations: ["Has many competition_participants", "Has one wallet_account"],
  },
  {
    name: "competitions",
    description: "Trading competitions with rules and prize pools",
    relations: ["Has many competition_participants", "Has one competition_rules", "Has many rank_snapshots", "Has many competition_instruments"],
  },
  {
    name: "competition_rules",
    description: "Rules and constraints for each competition",
    relations: ["Belongs to competition"],
  },
  {
    name: "competition_instruments",
    description: "Mapping of allowed instruments per competition with optional overrides",
    relations: ["Belongs to competition", "Belongs to instrument"],
  },
  {
    name: "competition_participants",
    description: "User enrollment in competitions",
    relations: ["Belongs to user", "Belongs to competition", "Has one account"],
  },
  {
    name: "accounts",
    description: "Virtual trading account per user per competition",
    relations: ["Belongs to competition_participant", "Has many orders", "Has many positions", "Has many equity_snapshots"],
  },
  {
    name: "instruments",
    description: "Multi-asset instruments (forex, indices, commodities, stocks, crypto CFDs)",
    relations: ["Has many competition_instruments", "Has many orders", "Has many market_candles"],
  },
  {
    name: "market_candles",
    description: "OHLCV candle data for audit and backtesting",
    relations: ["Belongs to instrument"],
  },
  {
    name: "market_prices",
    description: "Real-time execution prices from MarketDataProvider",
    relations: ["Belongs to instrument"],
  },
  {
    name: "orders",
    description: "Trade orders placed by users",
    relations: ["Belongs to account", "Belongs to instrument", "May create position"],
  },
  {
    name: "positions",
    description: "Open trading positions",
    relations: ["Belongs to account", "Belongs to instrument", "Creates trade on close"],
  },
  {
    name: "trades",
    description: "Closed/completed trades with realized P&L",
    relations: ["Belongs to account", "Originated from position"],
  },
  {
    name: "equity_snapshots",
    description: "Periodic snapshots of account equity",
    relations: ["Belongs to account"],
  },
  {
    name: "rank_snapshots",
    description: "Leaderboard rankings at points in time",
    relations: ["Belongs to competition", "References account"],
  },
  {
    name: "disqualifications",
    description: "Records of user disqualifications with reasons",
    relations: ["Belongs to competition_participant"],
  },
  {
    name: "wallet_accounts",
    description: "User wallet for rewards and withdrawals",
    relations: ["Belongs to user", "Has many wallet_transactions"],
  },
  {
    name: "wallet_transactions",
    description: "Wallet credits, debits, and withdrawals",
    relations: ["Belongs to wallet_account"],
  },
  {
    name: "payouts",
    description: "Prize payouts from competitions",
    relations: ["Belongs to competition", "Belongs to wallet_account"],
  },
];

const DataModelTab = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Entity Relationship Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Core entities and their relationships for TradeArena's trading competition platform.
            Designed for Postgres/Supabase compatibility.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {entities.map((entity) => (
              <Card key={entity.name} className="bg-secondary/30 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-mono text-primary">
                    {entity.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {entity.description}
                  </p>
                  <div className="space-y-1">
                    {entity.relations.map((rel, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-xs mr-1 mb-1 border-border text-muted-foreground"
                      >
                        {rel}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Key Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Competition Flow</h4>
              <pre className="text-xs bg-secondary/50 p-3 rounded-lg text-muted-foreground overflow-x-auto">
{`user
  └── competition_participant
        └── account
              ├── orders
              ├── positions
              ├── trades
              └── equity_snapshots`}
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Wallet Flow</h4>
              <pre className="text-xs bg-secondary/50 p-3 rounded-lg text-muted-foreground overflow-x-auto">
{`user
  └── wallet_account
        ├── wallet_transactions
        └── payouts (from competitions)`}
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Instrument & Market Data Flow</h4>
              <pre className="text-xs bg-secondary/50 p-3 rounded-lg text-muted-foreground overflow-x-auto">
{`competition
  └── competition_instruments
        └── instrument
              ├── market_candles (OHLCV audit)
              └── market_prices (execution feed)`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataModelTab;
