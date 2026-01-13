import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Trophy, Medal, TrendingUp, Target, Award, Loader2 } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useSearchParams } from "react-router-dom";

const Leaderboard = () => {
  const [searchParams] = useSearchParams();
  const competitionId = searchParams.get("competition") || undefined;
  const { data: leaderboardData, isLoading } = useLeaderboard(competitionId);

  const topThree = leaderboardData?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Global Rankings</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Leaderboard
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Top performers in active competitions. Rankings update periodically.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !leaderboardData?.length ? (
            <div className="text-center py-20">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No Rankings Yet
              </h3>
              <p className="text-muted-foreground">
                Join a competition and start trading to appear on the leaderboard.
              </p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {topThree.length >= 3 && (
                <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-12">
                  {/* 2nd Place */}
                  <div className="order-2 md:order-1 w-full md:w-64">
                    <div className="relative rounded-xl border border-border bg-card p-6 text-center">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                          <Medal className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="text-4xl mb-2">🥈</div>
                      <h3 className="font-display font-bold text-foreground mb-1">{topThree[1].display_name}</h3>
                      <p className="text-2xl font-bold text-chart-up mb-2">{topThree[1].profit_pct.toFixed(2)}%</p>
                      <div className="text-sm text-muted-foreground">
                        DD: {topThree[1].max_drawdown_pct.toFixed(2)}% · Score: {topThree[1].score.toFixed(2)}
                      </div>
                    </div>
                    <div className="h-16 bg-secondary rounded-b-xl" />
                  </div>

                  {/* 1st Place */}
                  <div className="order-1 md:order-2 w-full md:w-72">
                    <div className="relative rounded-xl border-2 border-primary bg-card p-8 text-center glow-primary">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                          <Trophy className="h-6 w-6 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="text-5xl mb-3">🏆</div>
                      <h3 className="font-display text-xl font-bold text-foreground mb-1">{topThree[0].display_name}</h3>
                      <p className="text-3xl font-bold text-gradient mb-2">{topThree[0].profit_pct.toFixed(2)}%</p>
                      <div className="text-sm text-muted-foreground">
                        DD: {topThree[0].max_drawdown_pct.toFixed(2)}% · Score: {topThree[0].score.toFixed(2)}
                      </div>
                    </div>
                    <div className="h-24 bg-primary/20 rounded-b-xl" />
                  </div>

                  {/* 3rd Place */}
                  <div className="order-3 w-full md:w-64">
                    <div className="relative rounded-xl border border-border bg-card p-6 text-center">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                          <Award className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="text-4xl mb-2">🥉</div>
                      <h3 className="font-display font-bold text-foreground mb-1">{topThree[2].display_name}</h3>
                      <p className="text-2xl font-bold text-chart-up mb-2">{topThree[2].profit_pct.toFixed(2)}%</p>
                      <div className="text-sm text-muted-foreground">
                        DD: {topThree[2].max_drawdown_pct.toFixed(2)}% · Score: {topThree[2].score.toFixed(2)}
                      </div>
                    </div>
                    <div className="h-12 bg-secondary rounded-b-xl" />
                  </div>
                </div>
              )}

              {/* Full Leaderboard Table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display text-lg font-bold text-foreground">Full Rankings</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left p-4 font-medium text-muted-foreground">Rank</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Trader</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Profit %</th>
                        <th className="text-right p-4 font-medium text-muted-foreground hidden md:table-cell">Drawdown</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData?.map((trader) => (
                        <tr key={trader.account_id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                trader.rank === 1
                                  ? "bg-primary text-primary-foreground"
                                  : trader.rank === 2
                                  ? "bg-secondary text-foreground"
                                  : trader.rank === 3
                                  ? "bg-secondary text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {trader.rank}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium text-foreground">{trader.display_name}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-bold ${trader.profit_pct >= 0 ? 'text-chart-up' : 'text-destructive'}`}>
                              {trader.profit_pct >= 0 ? '+' : ''}{trader.profit_pct.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-4 text-right hidden md:table-cell text-muted-foreground">
                            {trader.max_drawdown_pct.toFixed(2)}%
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium text-foreground">{trader.score.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <Target className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-3xl font-bold text-foreground mb-1">{leaderboardData?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Active Competitors</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <TrendingUp className="h-8 w-8 text-chart-up mx-auto mb-3" />
              <p className="text-3xl font-bold text-foreground mb-1">
                {topThree[0]?.profit_pct?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-muted-foreground">Top Performer Profit</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-3xl font-bold text-foreground mb-1">
                {topThree[0]?.score?.toFixed(1) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Top Score</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Leaderboard;
