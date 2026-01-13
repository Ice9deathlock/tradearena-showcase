import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  request?: string[];
  response: string[];
  screens: string[];
}

interface ApiGroup {
  name: string;
  endpoints: Endpoint[];
}

const apiGroups: ApiGroup[] = [
  {
    name: "Auth / User",
    endpoints: [
      {
        method: "GET",
        path: "/me",
        description: "Get current authenticated user profile",
        response: ["id", "email", "display_name", "avatar_url"],
        screens: ["All authenticated pages"],
      },
    ],
  },
  {
    name: "Competitions",
    endpoints: [
      {
        method: "GET",
        path: "/competitions",
        description: "List all competitions with optional filters",
        request: ["status?", "difficulty?", "limit?", "offset?"],
        response: ["id", "name", "status", "entry_fee", "prize_pool", "starts_at", "ends_at", "participant_count"],
        screens: ["Competitions List"],
      },
      {
        method: "GET",
        path: "/competitions/{id}",
        description: "Get single competition details with rules",
        response: ["id", "name", "description", "status", "rules", "prize_breakdown", "participant_count"],
        screens: ["Competition Detail"],
      },
      {
        method: "POST",
        path: "/competitions/{id}/join",
        description: "Join a competition",
        request: ["competition_id"],
        response: ["participant_id", "account_id", "starting_balance"],
        screens: ["Competition Detail", "Competition Card"],
      },
    ],
  },
  {
    name: "Dashboard",
    endpoints: [
      {
        method: "GET",
        path: "/my/competitions/{id}/dashboard",
        description: "Get user's competition dashboard data",
        response: [
          "competition_name",
          "status",
          "time_remaining",
          "rank",
          "total_participants",
          "net_profit_pct",
          "max_drawdown_pct",
          "score",
          "is_in_winning_range",
          "disqualification_reason?",
        ],
        screens: ["My Competition Dashboard"],
      },
    ],
  },
  {
    name: "Trading (Simulation)",
    endpoints: [
      {
        method: "GET",
        path: "/my/competitions/{id}/account",
        description: "Get trading account state",
        response: ["balance", "equity", "unrealized_pnl", "margin_used", "margin_available"],
        screens: ["Trading Demo"],
      },
      {
        method: "POST",
        path: "/my/competitions/{id}/orders",
        description: "Place a market order (validates instrument is allowed for competition)",
        request: ["instrument_id", "side", "quantity"],
        response: ["order_id", "status", "filled_price", "position_id?", "margin_used"],
        screens: ["Trading Demo"],
      },
      {
        method: "GET",
        path: "/my/competitions/{id}/positions",
        description: "List open positions",
        response: ["positions[]{ id, instrument, side, quantity, entry_price, current_price, unrealized_pnl }"],
        screens: ["Trading Demo"],
      },
      {
        method: "POST",
        path: "/my/competitions/{id}/positions/{pos_id}/close",
        description: "Close a position",
        request: ["position_id"],
        response: ["trade_id", "realized_pnl", "exit_price"],
        screens: ["Trading Demo"],
      },
    ],
  },
  {
    name: "Instruments",
    endpoints: [
      {
        method: "GET",
        path: "/competitions/{id}/instruments",
        description: "Get allowed instruments for a competition with leverage overrides",
        response: [
          "instruments[]{ id, symbol, name, asset_class, contract_size, tick_size, quantity_type, leverage_max }",
        ],
        screens: ["Trading Demo", "Competition Detail"],
      },
    ],
  },
  {
    name: "Market Data",
    endpoints: [
      {
        method: "GET",
        path: "/marketdata/last",
        description: "Get last execution price for an instrument",
        request: ["symbol"],
        response: ["symbol", "bid", "ask", "ts", "source"],
        screens: ["Trading Demo"],
      },
      {
        method: "GET",
        path: "/marketdata/candles",
        description: "Get OHLCV candle data (optional, for audit)",
        request: ["symbol", "timeframe?", "from?", "to?", "limit?"],
        response: ["candles[]{ ts, open, high, low, close, volume }"],
        screens: ["Trading Demo (charts via TradingView widget)"],
      },
    ],
  },
  {
    name: "Leaderboard",
    endpoints: [
      {
        method: "GET",
        path: "/competitions/{id}/leaderboard",
        description: "Get competition leaderboard",
        request: ["limit?", "offset?"],
        response: ["rankings[]{ rank, user_display_name, net_profit_pct, score, trade_count }"],
        screens: ["Leaderboard"],
      },
    ],
  },
  {
    name: "Wallet",
    endpoints: [
      {
        method: "GET",
        path: "/wallet",
        description: "Get user wallet balance and history",
        response: ["balance", "pending_balance", "transactions[]{ type, amount, description, created_at }"],
        screens: ["Wallet & Earnings"],
      },
      {
        method: "POST",
        path: "/wallet/withdraw",
        description: "Request withdrawal (UI only for now)",
        request: ["amount", "payout_method"],
        response: ["transaction_id", "status", "estimated_processing_time"],
        screens: ["Wallet & Earnings"],
      },
    ],
  },
  {
    name: "Admin",
    endpoints: [
      {
        method: "POST",
        path: "/admin/competitions",
        description: "Create a new competition",
        request: [
          "name",
          "entry_fee",
          "starts_at",
          "ends_at",
          "allowed_instruments",
          "starting_balance",
          "max_leverage",
          "max_drawdown_pct",
          "min_trades",
          "winner_distribution",
        ],
        response: ["competition_id"],
        screens: ["Admin - Create Competition"],
      },
      {
        method: "PATCH",
        path: "/admin/competitions/{id}",
        description: "Update competition status (pause/resume/end)",
        request: ["status"],
        response: ["updated_at"],
        screens: ["Admin Panel"],
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ApiContractTab = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">API Design Principles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">RESTful</h4>
              <p className="text-muted-foreground">Resource-based endpoints</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Auth</h4>
              <p className="text-muted-foreground">Bearer token (Supabase JWT)</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Format</h4>
              <p className="text-muted-foreground">JSON request/response</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Errors</h4>
              <p className="text-muted-foreground">Standard HTTP codes + message</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {apiGroups.map((group) => (
        <Card key={group.name} className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{group.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.endpoints.map((endpoint, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className={`font-mono ${methodColors[endpoint.method]}`}>
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm font-mono text-foreground">{endpoint.path}</code>
                </div>
                
                <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                
                <div className="grid gap-3 md:grid-cols-3 text-xs">
                  {endpoint.request && (
                    <div className="space-y-1">
                      <span className="font-semibold text-muted-foreground">Request</span>
                      <div className="bg-secondary/30 rounded p-2 font-mono">
                        {endpoint.request.map((field, i) => (
                          <div key={i} className="text-foreground">{field}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground">Response</span>
                    <div className="bg-secondary/30 rounded p-2 font-mono">
                      {endpoint.response.map((field, i) => (
                        <div key={i} className="text-foreground">{field}</div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground">Used By</span>
                    <div className="flex flex-wrap gap-1">
                      {endpoint.screens.map((screen, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {screen}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ApiContractTab;
