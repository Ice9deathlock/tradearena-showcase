import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Competition = Tables<"competitions">;
type CompetitionRules = Tables<"competition_rules">;

export interface CompetitionWithDetails extends Competition {
  rules?: CompetitionRules;
  participant_count?: number;
  user_participation?: {
    id: string;
    status: string;
    account_id?: string;
  } | null;
}

export function useCompetitions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competitions"],
    queryFn: async () => {
      // Fetch competitions with rules
      const { data: competitions, error } = await supabase
        .from("competitions")
        .select(`
          *,
          competition_rules(*)
        `)
        .in("status", ["upcoming", "live", "ended"])
        .order("starts_at", { ascending: true });

      if (error) throw error;

      // Get participant counts
      const competitionIds = competitions?.map(c => c.id) || [];
      const { data: counts } = await supabase
        .from("competition_participants")
        .select("competition_id")
        .in("competition_id", competitionIds);

      const countMap = new Map<string, number>();
      counts?.forEach(c => {
        countMap.set(c.competition_id, (countMap.get(c.competition_id) || 0) + 1);
      });

      // Get user's participations
      let userParticipations: Map<string, { id: string; status: string; account_id?: string }> = new Map();
      if (user) {
        const { data: participations } = await supabase
          .from("competition_participants")
          .select("id, competition_id, status, accounts(id)")
          .eq("user_id", user.id);

        participations?.forEach(p => {
          const account = Array.isArray(p.accounts) ? p.accounts[0] : p.accounts;
          userParticipations.set(p.competition_id, {
            id: p.id,
            status: p.status,
            account_id: account?.id
          });
        });
      }

      return competitions?.map(c => ({
        ...c,
        rules: Array.isArray(c.competition_rules) ? c.competition_rules[0] : c.competition_rules,
        participant_count: countMap.get(c.id) || 0,
        user_participation: userParticipations.get(c.id) || null
      })) as CompetitionWithDetails[];
    },
  });
}

export function useCompetition(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competition", id],
    queryFn: async () => {
      const { data: competition, error } = await supabase
        .from("competitions")
        .select(`
          *,
          competition_rules(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Get participant count
      const { count } = await supabase
        .from("competition_participants")
        .select("*", { count: "exact", head: true })
        .eq("competition_id", id);

      // Get user participation
      let userParticipation = null;
      if (user) {
        const { data: participation } = await supabase
          .from("competition_participants")
          .select("id, status, accounts(id)")
          .eq("competition_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (participation) {
          const account = Array.isArray(participation.accounts) ? participation.accounts[0] : participation.accounts;
          userParticipation = {
            id: participation.id,
            status: participation.status,
            account_id: account?.id
          };
        }
      }

      return {
        ...competition,
        rules: Array.isArray(competition.competition_rules) ? competition.competition_rules[0] : competition.competition_rules,
        participant_count: count || 0,
        user_participation: userParticipation
      } as CompetitionWithDetails;
    },
    enabled: !!id,
  });
}

export function useJoinCompetition() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (competitionId: string) => {
      if (!session?.access_token) {
        throw new Error("Please log in to join competitions");
      }

      console.log("Joining competition:", competitionId);

      const { data, error } = await supabase.functions.invoke("join-competition", {
        body: { competition_id: competitionId },
      });

      if (error) {
        console.error("Join error:", error);
        throw new Error(error.message || "Failed to join competition");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data, competitionId) => {
      toast.success(data.message || "Successfully joined competition!");
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      queryClient.invalidateQueries({ queryKey: ["competition", competitionId] });
      queryClient.invalidateQueries({ queryKey: ["user-participations"] });
      navigate(`/dashboard/${competitionId}`);
    },
    onError: (error: Error) => {
      console.error("Join mutation error:", error);
      toast.error(error.message || "Failed to join competition");
    },
  });
}
