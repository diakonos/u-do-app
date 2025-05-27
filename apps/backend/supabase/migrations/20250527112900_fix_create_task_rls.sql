-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own friend_permissions" ON public.friend_permissions;

-- Create updated policy to allow viewing both granted and received permissions
CREATE POLICY "Users can view their own friend_permissions"
ON public.friend_permissions
FOR SELECT
TO authenticated
USING (
    -- User is granting the permission
    ((SELECT auth.uid() AS uid) = user_id) 
    OR 
    -- User is receiving the permission
    ((SELECT auth.uid() AS uid) = friend_user_id)
);

-- Drop the existing insert policy for tasks
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;

-- Create updated RLS policy for inserting tasks
CREATE POLICY "Users can insert their own tasks"
ON public.tasks
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
    -- User owns the task
    ((SELECT auth.uid() AS uid) = user_id) 
    OR 
    -- User has permission to create tasks for the task owner
    EXISTS (
        SELECT 1 
        FROM friend_permissions fp 
        WHERE (fp.user_id = tasks.user_id) 
        AND (fp.friend_user_id = (SELECT auth.uid() AS uid))
        AND (fp.create_tasks = true)
    )
);