-- Allow users to update events of their own matches
CREATE POLICY "Users can update events of own matches"
ON public.match_events
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM matches
  WHERE matches.id = match_events.match_id AND matches.user_id = auth.uid()
));