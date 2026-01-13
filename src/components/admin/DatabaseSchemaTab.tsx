import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Column {
  name: string;
  type: string;
  constraints: string[];
}

interface TableSchema {
  name: string;
  columns: Column[];
  indexes?: string[];
  notes?: string;
}

const schemas: TableSchema[] = [
  {
    name: "users",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK", "default gen_random_uuid()"] },
      { name: "email", type: "text", constraints: ["NOT NULL", "UNIQUE"] },
      { name: "display_name", type: "text", constraints: [] },
      { name: "avatar_url", type: "text", constraints: [] },
      { name: "created_at", type: "timestamptz", constraints: ["NOT NULL", "default now()"] },
      { name: "updated_at", type: "timestamptz", constraints: ["NOT NULL", "default now()"] },
    ],
    indexes: ["idx_users_email"],
    notes: "Synced from auth.users via trigger",
  },
  {
    name: "competitions",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "name", type: "text", constraints: ["NOT NULL"] },
      { name: "description", type: "text", constraints: [] },
      { name: "status", type: "enum", constraints: ["upcoming/live/ended"] },
      { name: "entry_fee", type: "decimal(10,2)", constraints: ["NOT NULL"] },
      { name: "prize_pool", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "max_participants", type: "integer", constraints: [] },
      { name: "starts_at", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "ends_at", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "created_at", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "updated_at", type: "timestamptz", constraints: ["NOT NULL"] },
    ],
    indexes: ["idx_competitions_status", "idx_competitions_starts_at"],
  },
  {
    name: "competition_rules",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "competition_id", type: "uuid", constraints: ["FK → competitions", "UNIQUE"] },
      { name: "starting_balance", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "max_leverage", type: "integer", constraints: ["NOT NULL"] },
      { name: "max_drawdown_pct", type: "decimal(5,2)", constraints: ["NOT NULL"] },
      { name: "min_trades", type: "integer", constraints: ["default 0"] },
      { name: "allowed_instruments", type: "text[]", constraints: [] },
      { name: "winner_distribution", type: "jsonb", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "competition_participants",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "competition_id", type: "uuid", constraints: ["FK → competitions"] },
      { name: "user_id", type: "uuid", constraints: ["FK → users"] },
      { name: "joined_at", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "status", type: "enum", constraints: ["active/disqualified/completed"] },
    ],
    indexes: ["idx_participants_competition", "idx_participants_user"],
    notes: "UNIQUE(competition_id, user_id)",
  },
  {
    name: "accounts",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "participant_id", type: "uuid", constraints: ["FK → competition_participants", "UNIQUE"] },
      { name: "balance", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "equity", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "peak_equity", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "realized_pnl", type: "decimal(12,2)", constraints: ["default 0"] },
      { name: "unrealized_pnl", type: "decimal(12,2)", constraints: ["default 0"] },
      { name: "max_drawdown_pct", type: "decimal(5,2)", constraints: ["default 0"] },
      { name: "trade_count", type: "integer", constraints: ["default 0"] },
      { name: "updated_at", type: "timestamptz", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "instruments",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "symbol", type: "text", constraints: ["NOT NULL", "UNIQUE"] },
      { name: "name", type: "text", constraints: ["NOT NULL"] },
      { name: "asset_class", type: "enum", constraints: ["forex/indices/commodities/stocks/crypto"] },
      { name: "base_currency", type: "text", constraints: [] },
      { name: "quote_currency", type: "text", constraints: [] },
      { name: "contract_size", type: "decimal(12,4)", constraints: ["NOT NULL", "default 1"] },
      { name: "tick_size", type: "decimal(12,8)", constraints: ["NOT NULL"] },
      { name: "quantity_type", type: "enum", constraints: ["shares/contracts/lots/units"] },
      { name: "min_quantity", type: "decimal(10,4)", constraints: ["NOT NULL"] },
      { name: "is_active", type: "boolean", constraints: ["default true"] },
    ],
    indexes: ["idx_instruments_asset_class", "idx_instruments_symbol"],
    notes: "Multi-asset support: forex pairs, indices, commodities, stocks, crypto CFDs",
  },
  {
    name: "competition_instruments",
    columns: [
      { name: "competition_id", type: "uuid", constraints: ["PK", "FK → competitions"] },
      { name: "instrument_id", type: "uuid", constraints: ["PK", "FK → instruments"] },
      { name: "leverage_max_override", type: "integer", constraints: [] },
      { name: "created_at", type: "timestamptz", constraints: ["NOT NULL", "default now()"] },
    ],
    notes: "PK(competition_id, instrument_id) - allows per-instrument leverage overrides",
  },
  {
    name: "market_candles",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "instrument_id", type: "uuid", constraints: ["FK → instruments"] },
      { name: "timeframe", type: "text", constraints: ["NOT NULL"] },
      { name: "ts", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "open", type: "decimal(16,8)", constraints: ["NOT NULL"] },
      { name: "high", type: "decimal(16,8)", constraints: ["NOT NULL"] },
      { name: "low", type: "decimal(16,8)", constraints: ["NOT NULL"] },
      { name: "close", type: "decimal(16,8)", constraints: ["NOT NULL"] },
      { name: "volume", type: "decimal(20,4)", constraints: [] },
      { name: "source", type: "text", constraints: ["NOT NULL"] },
    ],
    indexes: ["idx_candles_instrument_ts", "idx_candles_timeframe"],
    notes: "OHLCV data for audit/backtesting. Source: TradingView or broker feed",
  },
  {
    name: "market_prices",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "instrument_id", type: "uuid", constraints: ["FK → instruments"] },
      { name: "ts", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "bid", type: "decimal(16,8)", constraints: ["NOT NULL"] },
      { name: "ask", type: "decimal(16,8)", constraints: ["NOT NULL"] },
      { name: "source", type: "text", constraints: ["NOT NULL"] },
    ],
    indexes: ["idx_prices_instrument_ts"],
    notes: "Execution price feed from MarketDataProvider abstraction",
  },
  {
    name: "orders",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "account_id", type: "uuid", constraints: ["FK → accounts"] },
      { name: "instrument_id", type: "uuid", constraints: ["FK → instruments"] },
      { name: "side", type: "enum", constraints: ["buy/sell"] },
      { name: "type", type: "enum", constraints: ["market"] },
      { name: "quantity", type: "decimal(12,4)", constraints: ["NOT NULL"] },
      { name: "filled_price", type: "decimal(12,4)", constraints: [] },
      { name: "status", type: "enum", constraints: ["pending/filled/rejected"] },
      { name: "created_at", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "filled_at", type: "timestamptz", constraints: [] },
    ],
    indexes: ["idx_orders_account", "idx_orders_created_at"],
  },
  {
    name: "positions",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "account_id", type: "uuid", constraints: ["FK → accounts"] },
      { name: "instrument_id", type: "uuid", constraints: ["FK → instruments"] },
      { name: "side", type: "enum", constraints: ["long/short"] },
      { name: "quantity", type: "decimal(12,4)", constraints: ["NOT NULL"] },
      { name: "entry_price", type: "decimal(12,4)", constraints: ["NOT NULL"] },
      { name: "current_price", type: "decimal(12,4)", constraints: ["NOT NULL"] },
      { name: "unrealized_pnl", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "opened_at", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "closed_at", type: "timestamptz", constraints: [] },
    ],
    indexes: ["idx_positions_account", "idx_positions_open"],
  },
  {
    name: "trades",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "account_id", type: "uuid", constraints: ["FK → accounts"] },
      { name: "position_id", type: "uuid", constraints: ["FK → positions"] },
      { name: "instrument_id", type: "uuid", constraints: ["FK → instruments"] },
      { name: "side", type: "enum", constraints: ["long/short"] },
      { name: "quantity", type: "decimal(12,4)", constraints: ["NOT NULL"] },
      { name: "entry_price", type: "decimal(12,4)", constraints: ["NOT NULL"] },
      { name: "exit_price", type: "decimal(12,4)", constraints: ["NOT NULL"] },
      { name: "realized_pnl", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "closed_at", type: "timestamptz", constraints: ["NOT NULL"] },
    ],
    indexes: ["idx_trades_account", "idx_trades_closed_at"],
  },
  {
    name: "wallet_accounts",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "user_id", type: "uuid", constraints: ["FK → users", "UNIQUE"] },
      { name: "balance", type: "decimal(12,2)", constraints: ["default 0"] },
      { name: "pending_balance", type: "decimal(12,2)", constraints: ["default 0"] },
      { name: "created_at", type: "timestamptz", constraints: ["NOT NULL"] },
      { name: "updated_at", type: "timestamptz", constraints: ["NOT NULL"] },
    ],
  },
  {
    name: "wallet_transactions",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "wallet_id", type: "uuid", constraints: ["FK → wallet_accounts"] },
      { name: "type", type: "enum", constraints: ["credit/debit/withdrawal"] },
      { name: "amount", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "description", type: "text", constraints: [] },
      { name: "reference_id", type: "uuid", constraints: [] },
      { name: "status", type: "enum", constraints: ["pending/completed/failed"] },
      { name: "created_at", type: "timestamptz", constraints: ["NOT NULL"] },
    ],
    indexes: ["idx_wallet_tx_wallet", "idx_wallet_tx_created_at"],
  },
  {
    name: "payouts",
    columns: [
      { name: "id", type: "uuid", constraints: ["PK"] },
      { name: "competition_id", type: "uuid", constraints: ["FK → competitions"] },
      { name: "wallet_id", type: "uuid", constraints: ["FK → wallet_accounts"] },
      { name: "rank", type: "integer", constraints: ["NOT NULL"] },
      { name: "amount", type: "decimal(12,2)", constraints: ["NOT NULL"] },
      { name: "created_at", type: "timestamptz", constraints: ["NOT NULL"] },
    ],
    indexes: ["idx_payouts_competition"],
  },
];

const DatabaseSchemaTab = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Schema Conventions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Primary Keys</h4>
              <p className="text-muted-foreground">UUID with gen_random_uuid()</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Timestamps</h4>
              <p className="text-muted-foreground">created_at, updated_at on all tables</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Soft Delete</h4>
              <p className="text-muted-foreground">deleted_at where applicable</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {schemas.map((schema) => (
        <Card key={schema.name} className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono text-primary">{schema.name}</CardTitle>
              {schema.indexes && (
                <div className="flex gap-1">
                  {schema.indexes.map((idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs font-mono">
                      {idx}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {schema.notes && (
              <p className="text-sm text-muted-foreground">{schema.notes}</p>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Column</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Constraints</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schema.columns.map((col) => (
                  <TableRow key={col.name} className="border-border">
                    <TableCell className="font-mono text-foreground">{col.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{col.type}</TableCell>
                    <TableCell>
                      {col.constraints.map((c, i) => (
                        <Badge 
                          key={i} 
                          variant={c.includes("PK") || c.includes("FK") ? "default" : "outline"}
                          className="text-xs mr-1 mb-1"
                        >
                          {c}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DatabaseSchemaTab;
