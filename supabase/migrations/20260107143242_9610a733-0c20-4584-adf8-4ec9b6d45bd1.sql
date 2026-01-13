-- Allow users to insert accounts when they have a valid participant record
CREATE POLICY "Users can create accounts for their participations"
ON public.accounts
FOR INSERT
WITH CHECK (
  participant_id IN (
    SELECT id FROM competition_participants WHERE user_id = auth.uid()
  )
);

-- Allow system to insert equity snapshots for user accounts
CREATE POLICY "Users can create equity snapshots for their accounts"
ON public.equity_snapshots
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT a.id FROM accounts a
    JOIN competition_participants cp ON a.participant_id = cp.id
    WHERE cp.user_id = auth.uid()
  )
);