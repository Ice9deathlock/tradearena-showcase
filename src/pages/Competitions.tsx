import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, DollarSign, Filter, AlertCircle, Loader2 } from "lucide-react";
import { useCompetitions, useJoinCompetition } from "@/hooks/useCompetitions";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

type StatusFilter = "all" | "live" | "upcoming" | "ended";

const Competitions = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { data: competitions, isLoading, error } = useCompetitions();
  const joinMutation = useJoinCompetition();
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredCompetitions = competitions?.filter((comp) => {
    return statusFilter === "all" || comp.status === statusFilter;
  }) || [];

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All Status" },
    { value: "live", label: "Live" },
    { value: "upcoming", label: "Upcoming" },
    { value: "ended", label: "Ended" },
  ];

  const statusColors: Record<string, string> = {
    upcoming: "bg-info/20 text-info border-info/30",
    live: "bg-success/20 text-success border-success/30",
    ended: "bg-muted text-muted-foreground border-muted",
  };

  const handleJoin = (competitionId: string, isAlreadyJoined: boolean) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (isAlreadyJoined) {
      navigate(`/dashboard/${competitionId}`);
      return;
    }

    joinMutation.mutate(competitionId);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                  Competitions
                </h1>
                <p className="text-muted-foreground">
                  Browse and join skill-based trading competitions
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={statusFilter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive">Failed to load competitions</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredCompetitions.length === 0 && (
            <div className="text-center py-20">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No competitions found
              </h3>
              <p className="text-muted-foreground">
                {competitions?.length ? "Try adjusting your filters." : "Check back later for new competitions."}
              </p>
            </div>
          )}

          {/* Results Count */}
          {!isLoading && filteredCompetitions.length > 0 && (
            <p className="text-sm text-muted-foreground mb-6">
              Showing {filteredCompetitions.length} competition{filteredCompetitions.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Competition Grid */}
          {!isLoading && filteredCompetitions.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompetitions.map((competition) => {
                const isJoined = !!competition.user_participation;
                const participantCount = competition.participant_count || 0;
                const maxParticipants = competition.max_participants || 100;

                return (
                  <div
                    key={competition.id}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[competition.status] || statusColors.ended}`}>
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

                    {/* Title */}
                    <h3 className="font-display text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                      {competition.name}
                    </h3>

                    {/* Prize Pool */}
                    <div className="flex items-center gap-2 mb-6">
                      <Trophy className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold text-gradient">${competition.prize_pool.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">Prize Pool</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Entry: ${competition.entry_fee}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{participantCount}/{maxParticipants}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{getDuration(competition.starts_at, competition.ends_at)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(competition.starts_at)}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min((participantCount / maxParticipants) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.max(maxParticipants - participantCount, 0)} spots remaining
                      </p>
                    </div>

                    {/* CTA */}
                    {competition.status === "live" || competition.status === "upcoming" ? (
                      <Button
                        className="w-full"
                        variant={isJoined ? "outline" : "default"}
                        onClick={() => handleJoin(competition.id, isJoined)}
                        disabled={joinMutation.isPending}
                      >
                        {joinMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : isJoined ? (
                          "Go to Dashboard"
                        ) : (
                          "Join Now"
                        )}
                      </Button>
                    ) : (
                      <Link to={`/competitions/${competition.id}`}>
                        <Button className="w-full" variant="outline">
                          View Details
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Competitions;
