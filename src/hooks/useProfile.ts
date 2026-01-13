import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserCompetition {
  id: string;
  competition_id: string;
  competition_name: string;
  status: string;
  joined_at: string;
  starts_at: string;
  ends_at: string;
  competition_status: string;
}

export const useProfile = () => {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });

  const { data: competitions, isLoading: competitionsLoading } = useQuery({
    queryKey: ["user-competitions", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("competition_participants")
        .select(`
          id,
          competition_id,
          status,
          joined_at,
          competitions (
            name,
            status,
            starts_at,
            ends_at
          )
        `)
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;

      return data.map((p) => {
        const comp = p.competitions as any;
        return {
          id: p.id,
          competition_id: p.competition_id,
          competition_name: comp?.name || "Unknown",
          status: p.status,
          joined_at: p.joined_at,
          starts_at: comp?.starts_at,
          ends_at: comp?.ends_at,
          competition_status: comp?.status,
        };
      }) as UserCompetition[];
    },
    enabled: !!user,
  });

  return {
    profile,
    competitions: competitions || [],
    isLoading: profileLoading || competitionsLoading,
  };
};
