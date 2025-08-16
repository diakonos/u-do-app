-- Allow all authenticated users to insert notifications
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow the service_role to insert notifications (server-side)
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Allow the service_role to select notifications (server-side)
CREATE POLICY "Service role can select notifications" ON public.notifications
  FOR SELECT TO service_role
  USING (true);

-- Allow the service_role to delete notifications (server-side)
CREATE POLICY "Service role can delete notifications" ON public.notifications
  FOR DELETE TO service_role
  USING (true);

-- Allow authenticated users to select their own notifications (where they are the target)
CREATE POLICY "Users can select their own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

-- Allow authenticated users to delete their own notifications (where they are the target)
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (target_user_id = auth.uid());

-- Allow authenticated users to insert notifications for their friends (friendship confirmed in friend_requests)
create policy "Users can create notifications for their friends"
  on "public"."notifications"
  as PERMISSIVE
  for INSERT
  to authenticated
  with check (
    EXISTS (
      SELECT 1 FROM public.friend_requests
      WHERE
        (
          (requester_id = auth.uid() AND recipient_id = target_user_id)
          OR
          (requester_id = target_user_id AND recipient_id = auth.uid())
        )
        AND status = 'confirmed'
    )
  );

-- Optionally, you may want to allow select/update/delete as well, but only insert is required for creation.
