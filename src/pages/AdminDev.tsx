import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Database, RefreshCw, Play, Zap } from "lucide-react";

const AdminDev = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  const seedMarketPrices = async () => {
    setLoading("prices");
    try {
      // Get all active instruments
      const { data: instruments, error: instrError } = await supabase
        .from("instruments")
        .select("id, symbol")
        .eq("is_active", true);

      if (instrError) throw instrError;

      // Define base prices for common instruments
      const basePrices: Record<string, { price: number; spread: number }> = {
        EURUSD: { price: 1.0850, spread: 0.0002 },
        GBPUSD: { price: 1.2650, spread: 0.0003 },
        USDJPY: { price: 154.50, spread: 0.03 },
        AUDUSD: { price: 0.6520, spread: 0.0002 },
        USDCAD: { price: 1.3580, spread: 0.0002 },
        NZDUSD: { price: 0.5920, spread: 0.0002 },
        USDCHF: { price: 0.8820, spread: 0.0002 },
        XAUUSD: { price: 2340.50, spread: 0.50 },
        XAGUSD: { price: 27.50, spread: 0.03 },
        USOIL: { price: 78.50, spread: 0.05 },
        UKOIL: { price: 82.30, spread: 0.05 },
        NATGAS: { price: 2.85, spread: 0.01 },
        US500: { price: 5420.00, spread: 0.50 },
        US30: { price: 39850.00, spread: 3.00 },
        NAS100: { price: 18950.00, spread: 1.50 },
        GER40: { price: 18250.00, spread: 1.00 },
        UK100: { price: 8150.00, spread: 0.80 },
        JPN225: { price: 38500.00, spread: 10.00 },
        BTCUSD: { price: 67500.00, spread: 25.00 },
        ETHUSD: { price: 3450.00, spread: 2.00 },
        XRPUSD: { price: 0.52, spread: 0.001 },
        SOLUSD: { price: 145.00, spread: 0.15 },
        AAPL: { price: 185.50, spread: 0.05 },
        TSLA: { price: 245.30, spread: 0.10 },
        NVDA: { price: 875.20, spread: 0.50 },
        GOOGL: { price: 175.80, spread: 0.05 },
        MSFT: { price: 425.60, spread: 0.10 },
        AMZN: { price: 185.40, spread: 0.05 },
      };

      const upserts = instruments?.map(inst => {
        const priceInfo = basePrices[inst.symbol] || { price: 100, spread: 0.01 };
        const bid = priceInfo.price - priceInfo.spread / 2;
        const ask = priceInfo.price + priceInfo.spread / 2;
        return {
          instrument_id: inst.id,
          price: priceInfo.price,
          bid,
          ask,
          source: "seed",
          ts: new Date().toISOString()
        };
      });

      if (upserts?.length) {
        const { error } = await supabase
          .from("market_prices_latest")
          .upsert(upserts, { onConflict: "instrument_id" });

        if (error) throw error;
        toast.success(`Seeded prices for ${upserts.length} instruments`);
      }
    } catch (error: any) {
      console.error("Seed prices error:", error);
      toast.error(error.message || "Failed to seed prices");
    } finally {
      setLoading(null);
    }
  };

  const createTestCompetition = async () => {
    setLoading("competition");
    try {
      const now = new Date();
      const startsAt = new Date(now.getTime() - 1000 * 60 * 5); // Started 5 min ago
      const endsAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // Ends in 7 days

      // Create competition
      const { data: competition, error: compError } = await supabase
        .from("competitions")
        .insert({
          name: "Test Live Competition",
          description: "A test competition for development purposes",
          status: "live",
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          entry_fee: 0,
          prize_pool: 1000,
          max_participants: 100,
          created_by: user?.id
        })
        .select()
        .single();

      if (compError) throw compError;

      // Create rules
      const { error: rulesError } = await supabase
        .from("competition_rules")
        .insert({
          competition_id: competition.id,
          starting_balance: 100000,
          max_drawdown_pct: 10,
          max_leverage_global: 100,
          max_position_pct: 20,
          min_trades: 5,
          allow_weekend_trading: true
        });

      if (rulesError) throw rulesError;

      // Add all active instruments to competition
      const { data: instruments } = await supabase
        .from("instruments")
        .select("id")
        .eq("is_active", true);

      if (instruments?.length) {
        const compInstruments = instruments.map(inst => ({
          competition_id: competition.id,
          instrument_id: inst.id
        }));

        await supabase.from("competition_instruments").insert(compInstruments);
      }

      toast.success(`Created test competition: ${competition.id}`);
    } catch (error: any) {
      console.error("Create competition error:", error);
      toast.error(error.message || "Failed to create competition");
    } finally {
      setLoading(null);
    }
  };

  const runJoinAndTradeTest = async () => {
    setLoading("test");
    try {
      // Get a live competition
      const { data: competitions } = await supabase
        .from("competitions")
        .select("id")
        .eq("status", "live")
        .limit(1);

      if (!competitions?.length) {
        toast.error("No live competition found. Create one first.");
        return;
      }

      const competitionId = competitions[0].id;

      // Try to join
      const { data: joinData, error: joinError } = await supabase.functions.invoke("join-competition", {
        body: { competition_id: competitionId }
      });

      if (joinError) {
        console.error("Join error:", joinError);
        toast.error(`Join failed: ${joinError.message}`);
        return;
      }

      if (joinData?.error) {
        if (joinData.error.includes("Already joined")) {
          toast.info("Already joined this competition");
        } else {
          toast.error(`Join failed: ${joinData.error}`);
          return;
        }
      } else {
        toast.success("Joined competition successfully");
      }

      // Get an instrument to trade
      const { data: compInstruments } = await supabase
        .from("competition_instruments")
        .select("instrument_id")
        .eq("competition_id", competitionId)
        .limit(1);

      if (!compInstruments?.length) {
        toast.error("No instruments configured for this competition");
        return;
      }

      // Place a test order
      const { data: orderData, error: orderError } = await supabase.functions.invoke("place-order", {
        body: {
          competition_id: competitionId,
          instrument_id: compInstruments[0].instrument_id,
          side: "buy",
          quantity: 0.1,
          leverage: 10
        }
      });

      if (orderError) {
        toast.error(`Order failed: ${orderError.message}`);
        return;
      }

      if (orderData?.error) {
        toast.error(`Order failed: ${orderData.error}`);
      } else {
        toast.success(`Order filled at $${orderData.filled_price?.toFixed(2)}`);
      }

      navigate(`/dashboard/${competitionId}`);
    } catch (error: any) {
      console.error("Test error:", error);
      toast.error(error.message || "Test failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Admin Dev Tools
          </h1>
          <p className="text-muted-foreground">
            Development and testing utilities for TradeArena MVP
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Seed Market Prices
              </CardTitle>
              <CardDescription>
                Insert/update market prices for all instruments with realistic values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={seedMarketPrices} 
                disabled={loading === "prices"}
                className="w-full"
              >
                {loading === "prices" ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  "Seed Prices"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Create Test Competition
              </CardTitle>
              <CardDescription>
                Create a live competition with all instruments for testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={createTestCompetition} 
                disabled={loading === "competition"}
                className="w-full"
              >
                {loading === "competition" ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Competition"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Run Full Test
              </CardTitle>
              <CardDescription>
                Join a live competition and place a test order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={runJoinAndTradeTest} 
                disabled={loading === "test"}
                className="w-full"
              >
                {loading === "test" ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Run Test"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
          <h3 className="font-semibold text-foreground mb-2">Test Flow</h3>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Click "Seed Prices" to populate market_prices_latest</li>
            <li>Click "Create Competition" to create a live test competition</li>
            <li>Go to Competitions page and click "Join Now" on the test competition</li>
            <li>After joining, go to Trading page and place orders</li>
            <li>Check Dashboard for your rank and performance</li>
            <li>Check Leaderboard for global rankings</li>
          </ol>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDev;
