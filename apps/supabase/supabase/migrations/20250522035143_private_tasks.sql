drop policy "Users can view their tasks and their friends tasks" on "public"."tasks";

alter table "public"."tasks" add column "is_private" boolean not null default false;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_friends_with_today_task_counts(user_id uuid, updated_at_min timestamp with time zone, tomorrow_str date)
 RETURNS TABLE(id text, user_id uuid, friend_id uuid, friend_username text, status text, created_at timestamp with time zone, today_total_tasks integer, today_completed_tasks integer)
 LANGUAGE sql
AS $function$
SELECT
    fv.id,
    fv.user_id,
    fv.friend_id,
    fv.friend_username,
    fv.status,
    fv.created_at,
    COUNT(t.id) AS today_total_tasks,
    COUNT(t.id) FILTER (WHERE t.is_done) AS today_completed_tasks
FROM friends_view fv
LEFT JOIN tasks t
    ON t.user_id = fv.friend_id
    AND (
        (t.is_done = false AND t.due_date IS NULL)
        OR (t.is_done = false AND t.due_date < tomorrow_str)
        OR (t.is_done = true AND t.updated_at >= updated_at_min)
    )
WHERE fv.user_id = get_friends_with_today_task_counts.user_id
GROUP BY fv.id, fv.user_id, fv.friend_id, fv.friend_username, fv.status, fv.created_at;
$function$
;

create policy "Users can update their own user profile"
on "public"."user_profiles"
as permissive
for update
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));


create policy "Users can view their tasks and their friends tasks"
on "public"."tasks"
as permissive
for select
to authenticated
using (((( SELECT auth.uid() AS uid) = user_id) OR ((EXISTS ( SELECT 1
   FROM friend_requests fr
  WHERE ((fr.status = 'confirmed'::text) AND (((fr.requester_id = ( SELECT auth.uid() AS uid)) AND (fr.recipient_id = tasks.user_id)) OR ((fr.recipient_id = ( SELECT auth.uid() AS uid)) AND (fr.requester_id = tasks.user_id)))))) AND (is_private = false))));



