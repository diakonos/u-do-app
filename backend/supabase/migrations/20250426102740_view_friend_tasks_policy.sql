CREATE POLICY "Allow users to view tasks of friends"
ON public.tasks
FOR SELECT
TO "authenticated"
USING (
  EXISTS (
    SELECT 1
    FROM public.friend_requests fr
    WHERE fr.status = 'confirmed'
    AND (
      (fr.requester_id = auth.uid() AND fr.recipient_id = tasks.user_id) OR
      (fr.recipient_id = auth.uid() AND fr.requester_id = tasks.user_id)
    )
  )
);
