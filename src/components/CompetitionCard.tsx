import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, DollarSign } from "lucide-react";

interface CompetitionCardProps {
  id: string;
  title: string;
  prizePool: string;
  entryFee: string;
  participants: number;
  maxParticipants: number;
  startDate: string;
  duration: string;
  status: "upcoming" | "live" | "ended";
  difficulty: "beginner" | "intermediate" | "advanced";
}

const CompetitionCard = ({
  id,
  title,
  prizePool,
  entryFee,
  participants,
  maxParticipants,
  startDate,
  duration,
  status,
  difficulty,
}: CompetitionCardProps) => {
  const statusColors = {
    upcoming: "bg-info/20 text-info border-info/30",
    live: "bg-success/20 text-success border-success/30",
    ended: "bg-muted text-muted-foreground border-muted",
  };

  const difficultyColors = {
    beginner: "text-success",
    intermediate: "text-warning",
    advanced: "text-destructive",
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
          {status === "live" && <span className="inline-block w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <span className={`text-xs font-medium ${difficultyColors[difficulty]}`}>
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-display text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {/* Prize Pool */}
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-primary" />
        <span className="text-2xl font-bold text-gradient">{prizePool}</span>
        <span className="text-sm text-muted-foreground">Prize Pool</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Entry: {entryFee}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{participants}/{maxParticipants}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{duration}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {startDate}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(participants / maxParticipants) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {maxParticipants - participants} spots remaining
        </p>
      </div>

      {/* CTA */}
      {status === "live" ? (
        <Link to={`/dashboard/${id}`}>
          <Button className="w-full" variant="default">
            Join Now
          </Button>
        </Link>
      ) : (
        <Link to={`/competitions/${id}`}>
          <Button className="w-full" variant="outline">
            View Details
          </Button>
        </Link>
      )}
    </div>
  );
};

export default CompetitionCard;
