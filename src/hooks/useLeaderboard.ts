import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  rank: number;
  account_id: string;
  user_id: string;
  display_name: string;
  profit_pct: number;
  max_drawdown_pct: number;
  score: number;
}

export function useLeaderboard(competitionId?: string) {
  return useQuery({
    queryKey: ["leaderboard", competitionId],
    queryFn: async () => {
      // Get the latest rank snapshots for the competition
      let query = supabase
        .from("rank_snapshots")
        .select(`
          *,
          accounts!inner(
            participant_id,
            competition_participants!inner(
              user_id,
              profiles(display_name)
            )
          )
        `)
        .order("ts", { ascending: false });

      if (competitionId) {
        query = query.eq("competition_id", competitionId);
      }

      const { data: snapshots, error } = await query.limit(100);

      if (error) {
        console.error("Leaderboard query error:", error);
        // If no snapshots, try to compute from accounts
        return await computeLeaderboardFromAccounts(competitionId);
      }

      if (!snapshots?.length) {
        return await computeLeaderboardFromAccounts(competitionId);
      }

      // Get unique latest entries per account
      const latestByAccount = new Map<string, typeof snapshots[0]>();
      snapshots.forEach(s => {
        if (!latestByAccount.has(s.account_id) || 
            new Date(s.ts) > new Date(latestByAccount.get(s.account_id)!.ts)) {
          latestByAccount.set(s.account_id, s);
        }
      });

      const entries = Array.from(latestByAccount.values())
        .sort((a, b) => b.score - a.score)
        .map((s, index) => {
          const account = Array.isArray(s.accounts) ? s.accounts[0] : s.accounts;
          const participant = account?.competition_participants;
          const profile = participant?.profiles;
          return {
            rank: index + 1,
            account_id: s.account_id,
            user_id: participant?.user_id || "",
            display_name: profile?.display_name || `Trader ${index + 1}`,
            profit_pct: s.profit_pct,
            max_drawdown_pct: s.max_drawdown_pct,
            score: s.score
          };
        });

      return entries as LeaderboardEntry[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

async function computeLeaderboardFromAccounts(competitionId?: string) {
  // Fallback: compute from accounts directly
  // First get accounts with participants
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select(`
      id,
      balance,
      equity,
      peak_equity,
      max_drawdown_pct,
      participant_id
    `)
    .eq("status", "active");

  if (accountsError || !accounts?.length) {
    console.error("Failed to fetch accounts:", accountsError);
    return [];
  }

  // Get participants with their competitions and profiles
  const participantIds = accounts.map(a => a.participant_id);
  const { data: participants, error: participantsError } = await supabase
    .from("competition_participants")
    .select(`
      id,
      competition_id,
      user_id,
      status,
      competitions (
        id,
        status
      )
    `)
    .in("id", participantIds);

  if (participantsError) {
    console.error("Failed to fetch participants:", participantsError);
    return [];
  }

  // Get profile info for all users
  const userIds = [...new Set(participants?.map(p => p.user_id) || [])];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  
  const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

  // Get competition rules for starting balances
  const competitionIds = [...new Set(participants?.map(p => p.competition_id) || [])];
  const { data: rules } = await supabase
    .from("competition_rules")
    .select("competition_id, starting_balance")
    .in("competition_id", competitionIds);

  const rulesMap = new Map(rules?.map(r => [r.competition_id, r.starting_balance]) || []);

  // Build participant lookup
  const participantMap = new Map(participants?.map(p => [p.id, p]) || []);

  // Filter and map accounts
  const entries: LeaderboardEntry[] = [];
  
  for (const account of accounts) {
    const participant = participantMap.get(account.participant_id);
    if (!participant) continue;

    const competition = participant.competitions;
    
    // Filter by competition ID if provided
    if (competitionId && participant.competition_id !== competitionId) continue;
    
    // Only include live competitions
    if (competition?.status !== "live") continue;
    
    // Only include active participants
    if (participant.status !== "active") continue;

    const displayName = profileMap.get(participant.user_id);
    const startingBalance = rulesMap.get(participant.competition_id) || 100000;
    const profitPct = ((account.equity - startingBalance) / startingBalance) * 100;
    const score = profitPct - (account.max_drawdown_pct * 0.5);

    entries.push({
      account_id: account.id,
      user_id: participant.user_id,
      display_name: displayName || "Anonymous",
      profit_pct: profitPct,
      max_drawdown_pct: account.max_drawdown_pct,
      score: score,
      rank: 0
    });
  }

  // Sort by score and assign ranks
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}
