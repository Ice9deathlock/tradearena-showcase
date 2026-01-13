import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const CreateCompetitionTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    entryFee: "0",
    prizePool: "1000",
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
    startingBalance: "100000",
    maxLeverage: "100",
    maxDrawdown: "10",
    maxPositionPct: "20",
    minTrades: "5",
    allowWeekendTrading: true,
    maxParticipants: "100",
    selectedInstruments: [] as string[],
  });

  // Fetch available instruments
  const { data: instruments } = useQuery({
    queryKey: ["instruments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instruments")
        .select("id, symbol, name, asset_class")
        .eq("is_active", true)
        .order("asset_class", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const toggleInstrument = (instrumentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedInstruments: prev.selectedInstruments.includes(instrumentId)
        ? prev.selectedInstruments.filter(id => id !== instrumentId)
        : [...prev.selectedInstruments, instrumentId]
    }));
  };

  const selectAllInstruments = () => {
    setFormData(prev => ({
      ...prev,
      selectedInstruments: instruments?.map(i => i.id) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in required fields: Name, Start Date, End Date");
      return;
    }

    if (formData.selectedInstruments.length === 0) {
      toast.error("Please select at least one instrument");
      return;
    }

    setLoading(true);

    try {
      const startsAt = new Date(`${formData.startDate}T${formData.startTime}:00Z`).toISOString();
      const endsAt = new Date(`${formData.endDate}T${formData.endTime}:00Z`).toISOString();

      // Create competition
      const { data: competition, error: compError } = await supabase
        .from("competitions")
        .insert({
          name: formData.name,
          description: formData.description || null,
          entry_fee: parseFloat(formData.entryFee) || 0,
          prize_pool: parseFloat(formData.prizePool) || 0,
          starts_at: startsAt,
          ends_at: endsAt,
          status: new Date(startsAt) <= new Date() ? "live" : "upcoming",
          max_participants: parseInt(formData.maxParticipants) || 100,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (compError) throw compError;

      // Create competition rules
      const { error: rulesError } = await supabase
        .from("competition_rules")
        .insert({
          competition_id: competition.id,
          starting_balance: parseFloat(formData.startingBalance) || 100000,
          max_leverage_global: parseFloat(formData.maxLeverage) || 100,
          max_drawdown_pct: parseFloat(formData.maxDrawdown) || 10,
          max_position_pct: parseFloat(formData.maxPositionPct) || 20,
          min_trades: parseInt(formData.minTrades) || 5,
          allow_weekend_trading: formData.allowWeekendTrading,
        });

      if (rulesError) throw rulesError;

      // Add selected instruments to competition
      const compInstruments = formData.selectedInstruments.map(instrumentId => ({
        competition_id: competition.id,
        instrument_id: instrumentId,
      }));

      const { error: instError } = await supabase
        .from("competition_instruments")
        .insert(compInstruments);

      if (instError) throw instError;

      toast.success("Competition created successfully!", {
        description: `"${formData.name}" is now ${competition.status}.`,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        entryFee: "0",
        prizePool: "1000",
        startDate: "",
        startTime: "00:00",
        endDate: "",
        endTime: "23:59",
        startingBalance: "100000",
        maxLeverage: "100",
        maxDrawdown: "10",
        maxPositionPct: "20",
        minTrades: "5",
        allowWeekendTrading: true,
        maxParticipants: "100",
        selectedInstruments: [],
      });

    } catch (error: any) {
      console.error("Create competition error:", error);
      toast.error("Failed to create competition", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Group instruments by asset class
  const groupedInstruments = instruments?.reduce((acc, inst) => {
    if (!acc[inst.asset_class]) acc[inst.asset_class] = [];
    acc[inst.asset_class].push(inst);
    return acc;
  }, {} as Record<string, typeof instruments>);

  return (
    <div className="max-w-3xl">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Create Competition</CardTitle>
          <CardDescription>
            Create a new trading competition with custom rules and instruments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Competition Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Weekly Crypto Challenge"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-secondary/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the competition..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-secondary/30 min-h-[80px]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee ($)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.entryFee}
                    onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prizePool">Prize Pool ($)</Label>
                  <Input
                    id="prizePool"
                    type="number"
                    min="0"
                    placeholder="1000"
                    value={formData.prizePool}
                    onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Schedule
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="bg-secondary/30"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time (UTC)</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="bg-secondary/30"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (UTC)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
              </div>
            </div>

            {/* Trading Rules */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Trading Rules
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startingBalance">Starting Balance ($)</Label>
                  <Input
                    id="startingBalance"
                    type="number"
                    value={formData.startingBalance}
                    onChange={(e) => setFormData({ ...formData, startingBalance: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLeverage">Max Leverage (x)</Label>
                  <Input
                    id="maxLeverage"
                    type="number"
                    value={formData.maxLeverage}
                    onChange={(e) => setFormData({ ...formData, maxLeverage: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="maxDrawdown">Max Drawdown (%)</Label>
                  <Input
                    id="maxDrawdown"
                    type="number"
                    value={formData.maxDrawdown}
                    onChange={(e) => setFormData({ ...formData, maxDrawdown: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPositionPct">Max Position Size (%)</Label>
                  <Input
                    id="maxPositionPct"
                    type="number"
                    value={formData.maxPositionPct}
                    onChange={(e) => setFormData({ ...formData, maxPositionPct: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minTrades">Minimum Trades</Label>
                  <Input
                    id="minTrades"
                    type="number"
                    value={formData.minTrades}
                    onChange={(e) => setFormData({ ...formData, minTrades: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowWeekendTrading"
                  checked={formData.allowWeekendTrading}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowWeekendTrading: !!checked })}
                />
                <Label htmlFor="allowWeekendTrading" className="text-sm cursor-pointer">
                  Allow Weekend Trading
                </Label>
              </div>
            </div>

            {/* Instruments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Allowed Instruments *
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={selectAllInstruments}>
                  Select All
                </Button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto p-3 rounded-lg bg-secondary/20 border border-border">
                {groupedInstruments && Object.entries(groupedInstruments).map(([assetClass, insts]) => (
                  <div key={assetClass}>
                    <p className="text-xs font-semibold text-primary uppercase mb-2">{assetClass}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {insts?.map((inst) => (
                        <div
                          key={inst.id}
                          onClick={() => toggleInstrument(inst.id)}
                          className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                            formData.selectedInstruments.includes(inst.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary hover:bg-secondary/80 text-foreground"
                          }`}
                        >
                          {inst.symbol}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.selectedInstruments.length} instrument(s) selected
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Competition"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateCompetitionTab;
