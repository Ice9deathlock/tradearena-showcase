import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Clock,
  Users,
  DollarSign,
  ArrowLeft,
  Shield,
  Target,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useCompetition, useJoinCompetition } from "@/hooks/useCompetitions";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const CompetitionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: competition, isLoading, error } = useCompetition(id || "");
  const joinMutation = useJoinCompetition();

  const handleJoinNow = () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!id) return;

    if (competition?.user_participation) {
      navigate(`/dashboard/${id}`);
      return;
    }

    joinMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 container mx-auto px-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !competition) {
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

  const statusColors: Record<string, string> = {
    upcoming: "bg-info/20 text-info border-info/30",
    live: "bg-success/20 text-success border-success/30",
    ended: "bg-muted text-muted-foreground border-muted",
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' HH:mm");
    } catch {
      return dateStr;
    }
  };

  const getDuration = (start: string, end: string) => {
    try {
      const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
      return `${days} days`;
    } catch {
      return "N/A";
    }
  };

  const isJoined = !!competition.user_participation;
  const participantCount = competition.participant_count || 0;
  const maxParticipants = competition.max_participants || 100;

  // Build rules from competition_rules
  const rulesList = [];
  if (competition.rules) {
    rulesList.push(`Starting balance: $${competition.rules.starting_balance?.toLocaleString()} simulated`);
    rulesList.push(`Maximum drawdown: ${competition.rules.max_drawdown_pct}%`);
    rulesList.push(`Maximum leverage: ${competition.rules.max_leverage_global}x`);
    rulesList.push(`Maximum position size: ${competition.rules.max_position_pct}% of portfolio`);
    rulesList.push(`Minimum trades required: ${competition.rules.min_trades}`);
    if (!competition.rules.allow_weekend_trading) {
      rulesList.push("No weekend trading");
    }
  }

  // Build prize distribution
  const prizeDistribution = competition.winner_distribution as Record<string, number> | null;
  const prizes = prizeDistribution ? Object.entries(prizeDistribution).map(([place, pct]) => ({
    place: place === "1" ? "1st" : place === "2" ? "2nd" : place === "3" ? "3rd" : `${place}th`,
    amount: `$${((pct / 100) * competition.prize_pool).toLocaleString()}`
  })) : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <Link
            to="/competitions"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Competitions
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Card */}
              <div className="rounded-xl border border-border bg-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[competition.status] || statusColors.ended}`}
                  >
                    {competition.status === "live" && (
                      <span className="inline-block w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
                    )}
                    {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                  </span>
                  {isJoined && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">
                      Joined
                    </span>
                  )}
                </div>

                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {competition.name}
                </h1>

                <p className="text-muted-foreground mb-6">{competition.description}</p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-secondary">
                    <Trophy className="h-5 w-5 text-primary mb-2" />
                    <p className="text-2xl font-bold text-gradient">${competition.prize_pool.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Prize Pool</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary">
                    <DollarSign className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold text-foreground">${competition.entry_fee}</p>
                    <p className="text-xs text-muted-foreground">Entry Fee</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary">
                    <Users className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold text-foreground">
                      {participantCount}/{maxParticipants}
                    </p>
                    <p className="text-xs text-muted-foreground">Participants</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary">
                    <Clock className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold text-foreground">{getDuration(competition.starts_at, competition.ends_at)}</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                </div>
              </div>

              {/* Rules */}
              {rulesList.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl font-bold text-foreground">Competition Rules</h2>
                  </div>
                  <ul className="space-y-3">
                    {rulesList.map((rule, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prize Structure */}
              {prizes.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl font-bold text-foreground">Prize Structure</h2>
                  </div>
                  <div className="space-y-3">
                    {prizes.map((prize, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          index === 0
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-secondary"
                        }`}
                      >
                        <span className="font-semibold text-foreground">{prize.place}</span>
                        <span className={index === 0 ? "text-primary font-bold text-lg" : "text-foreground font-medium"}>
                          {prize.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning mb-1">Simulated Trading Only</p>
                    <p className="text-xs text-muted-foreground">
                      This competition uses simulated trading accounts with virtual funds. 
                      No real money is traded. Entry fees fund the prize pool only.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Join Card */}
              <div className="rounded-xl border border-border bg-card p-6 sticky top-24">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  {competition.status === "ended" ? "Competition Ended" : isJoined ? "You're In!" : "Join This Competition"}
                </h3>

                {competition.status !== "ended" && (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Spots Filled</span>
                        <span className="text-foreground font-medium">
                          {participantCount}/{maxParticipants}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min((participantCount / maxParticipants) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entry Fee</span>
                        <span className="text-foreground font-medium">${competition.entry_fee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Starts</span>
                        <span className="text-foreground font-medium">{formatDate(competition.starts_at)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      variant="hero" 
                      size="lg"
                      onClick={handleJoinNow}
                      disabled={joinMutation.isPending}
                    >
                      {joinMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : isJoined ? (
                        "Go to Dashboard"
                      ) : competition.status === "live" ? (
                        "Join Now"
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </>
                )}

                {competition.status === "ended" && (
                  <p className="text-sm text-muted-foreground">
                    This competition has ended. Check out other active competitions.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CompetitionDetail;
