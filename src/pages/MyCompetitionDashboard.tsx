import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trophy,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Timer,
  Award,
  Info,
  Loader2,
  LineChart,
} from "lucide-react";

const MyCompetitionDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch competition details
  const { data: competition, isLoading: loadingCompetition } = useQuery({
    queryKey: ['competition-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          competition_rules (*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch user's participation and account
  const { data: participation, isLoading: loadingParticipation } = useQuery({
    queryKey: ['user-participation', id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from('competition_participants')
        .select(`
          *,
          accounts (*)
        `)
        .eq('competition_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Fetch rank snapshot for this user
  const { data: rankSnapshot } = useQuery({
    queryKey: ['user-rank', participation?.accounts],
    queryFn: async () => {
      const account = Array.isArray(participation?.accounts) 
        ? participation.accounts[0] 
        : participation?.accounts;
      if (!account?.id || !id) return null;
      
      const { data, error } = await supabase
        .from('rank_snapshots')
        .select('*')
        .eq('account_id', account.id)
        .eq('competition_id', id)
        .order('ts', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!participation?.accounts,
  });

  // Fetch participant count
  const { data: participantCount } = useQuery({
    queryKey: ['participant-count', id],
    queryFn: async () => {
      if (!id) return 0;
      const { count, error } = await supabase
        .from('competition_participants')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', id);
      
      if (error) return 0;
      return count || 0;
    },
    enabled: !!id,
  });

  // Fetch disqualification if any
  const { data: disqualification } = useQuery({
    queryKey: ['disqualification', participation?.accounts],
    queryFn: async () => {
      const account = Array.isArray(participation?.accounts) 
        ? participation.accounts[0] 
        : participation?.accounts;
      if (!account?.id) return null;
      
      const { data, error } = await supabase
        .from('disqualifications')
        .select('*')
        .eq('account_id', account.id)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: !!participation?.accounts,
  });

  const isLoading = loadingCompetition || loadingParticipation;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 container mx-auto px-4 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            Competition Not Found
          </h1>
          <Link to="/competitions">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitions
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (!participation) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 container mx-auto px-4 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">
            Not Participating
          </h1>
          <p className="text-muted-foreground mb-4">
            You haven't joined this competition yet.
          </p>
          <Link to={`/competitions/${id}`}>
            <Button>
              View Competition Details
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const account = Array.isArray(participation.accounts) 
    ? participation.accounts[0] 
    : participation.accounts;
  
  const rules = Array.isArray(competition.competition_rules) 
    ? competition.competition_rules[0] 
    : competition.competition_rules;

  const competitionState = participation.status === 'disqualified' 
    ? 'disqualified' 
    : competition.status;

  const isActive = competitionState === 'live';

  const startingBalance = rules?.starting_balance || 100000;
  const profitPct = account 
    ? ((account.equity - startingBalance) / startingBalance) * 100 
    : 0;
  const maxDrawdownPct = account?.max_drawdown_pct || 0;
  const maxAllowedDrawdown = rules?.max_drawdown_pct || 10;

  const isInWinningRange = (rankSnapshot?.rank || 999) <= 30;

  const statusColors: Record<string, string> = {
    upcoming: "bg-info/20 text-info border-info/30",
    live: "bg-success/20 text-success border-success/30",
    active: "bg-success/20 text-success border-success/30",
    ended: "bg-muted text-muted-foreground border-muted",
    disqualified: "bg-destructive/10 text-destructive border-destructive/30",
  };

  const getTimeRemaining = () => {
    if (competitionState === "upcoming") {
      return `Starts ${new Date(competition.starts_at).toLocaleDateString()}`;
    } else if (competitionState === "ended") {
      return "Competition Ended";
    } else if (competitionState === "disqualified") {
      return "Disqualified";
    }
    const endDate = new Date(competition.ends_at);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${diffDays}d ${diffHours}h remaining`;
  };

  const getStatusLabel = () => {
    if (competitionState === "disqualified") return "Disqualified";
    if (competitionState === "ended") return "Ended";
    if (competitionState === "upcoming") return "Upcoming";
    return "Live";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Link */}
          <Link
            to="/competitions"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Competitions
          </Link>

          {/* Header Section */}
          <div className="rounded-xl border border-border bg-card p-6 md:p-8 mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[competitionState] || statusColors.live}`}
              >
                {isActive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
                )}
                {getStatusLabel()}
              </span>
            </div>

            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              {competition.name}
            </h1>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{getTimeRemaining()}</span>
            </div>
          </div>

          {/* Upcoming State - Countdown */}
          {competitionState === "upcoming" && (
            <div className="rounded-xl border border-info/30 bg-info/5 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Competition Starts Soon</p>
                  <p className="text-sm text-muted-foreground">Trading will be available once the competition begins</p>
                </div>
              </div>
            </div>
          )}

          {/* Disqualified State */}
          {competitionState === "disqualified" && disqualification && (
            <div className="rounded-xl border border-border bg-muted/20 p-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Competition Participation Ended</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your participation in this competition has concluded due to a rule violation.
                  </p>
                  <div className="rounded-lg bg-background/50 border border-border p-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Reason: </span>
                      {disqualification.reason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Competition Ended - Final Results */}
          {competitionState === "ended" && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-foreground">Competition Complete</p>
                  <p className="text-sm text-muted-foreground">Final results are now available</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-lg bg-background/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Final Rank</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    #{rankSnapshot?.rank || '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-background/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Final Score</p>
                  <p className="font-display text-2xl font-bold text-primary">
                    {rankSnapshot?.score?.toFixed(0) || '-'}
                  </p>
                </div>
                <div className="rounded-lg bg-background/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
                  <p className={`font-display text-2xl font-bold ${profitPct >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                  </p>
                </div>
                <div className="rounded-lg bg-background/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
                  <p className="font-display text-2xl font-bold text-primary">
                    ${competition.prize_pool?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-background/50 border border-border p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Prize earnings have been credited to your wallet and will be available for withdrawal after the standard processing period.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Stats - Show for active state */}
          {isActive && account && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-medium">Current Rank</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  #{rankSnapshot?.rank || '-'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {participantCount} participants
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Net Profit</span>
                </div>
                <p className={`text-2xl font-bold ${profitPct >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Equity: ${account.equity?.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs font-medium">Max Drawdown</span>
                </div>
                <p className={`text-2xl font-bold ${maxDrawdownPct > maxAllowedDrawdown * 0.7 ? 'text-destructive' : 'text-foreground'}`}>
                  -{maxDrawdownPct.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Limit: -{maxAllowedDrawdown}%
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Score</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {rankSnapshot?.score?.toFixed(0) || '-'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Performance score
                </p>
              </div>
            </div>
          )}

          {/* Winning Range Indicator - Only for active state */}
          {isActive && (
            <div className={`rounded-xl border p-5 mb-6 ${
              isInWinningRange 
                ? "bg-success/5 border-success/30" 
                : "bg-muted/20 border-border"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isInWinningRange 
                    ? "bg-success/20" 
                    : "bg-muted"
                }`}>
                  {isInWinningRange ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <Target className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${
                    isInWinningRange 
                      ? "text-success" 
                      : "text-foreground"
                  }`}>
                    {isInWinningRange 
                      ? "You're in the Prize Zone!" 
                      : "Continue Trading to Improve Your Position"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isInWinningRange 
                      ? "You're currently within prize-winning positions. Keep it up!" 
                      : `Currently at position #${rankSnapshot?.rank || '-'}. Keep trading to improve your rank.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rules Summary */}
          {rules && competitionState !== "ended" && (
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-foreground">Competition Rules</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Starting Balance</span>
                    <span className="font-medium text-foreground">${rules.starting_balance?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span className="font-medium text-foreground">{rules.max_drawdown_pct}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Max Leverage</span>
                    <span className="font-medium text-foreground">{rules.max_leverage_global}x</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Min Trades</span>
                    <span className="font-medium text-foreground">{rules.min_trades}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-foreground">Prize Pool</h3>
                </div>
                <div className="text-center py-4">
                  <p className="font-display text-4xl font-bold text-primary mb-2">
                    ${competition.prize_pool?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Prize Pool</p>
                </div>
                {competition.winner_distribution && (
                  <div className="space-y-2 mt-4">
                    {Object.entries(competition.winner_distribution as Record<string, number>).map(([place, pct]) => (
                      <div key={place} className="flex justify-between py-1 text-sm">
                        <span className="text-muted-foreground">#{place}</span>
                        <span className="font-medium text-foreground">{pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trading Button - Only for active state */}
          {isActive && (
            <div className="text-center">
              <Button 
                size="lg" 
                className="gap-2"
                onClick={() => navigate('/trading')}
              >
                <LineChart className="h-5 w-5" />
                Go to Trading
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyCompetitionDashboard;
