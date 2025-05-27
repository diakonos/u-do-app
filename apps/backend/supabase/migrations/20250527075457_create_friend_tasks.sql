-- Add assigned_by column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN assigned_by UUID REFERENCES public.user_profiles(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX idx_tasks_assigned_by ON public.tasks(assigned_by);

-- Drop the existing RLS policy
DROP POLICY IF EXISTS "Users can view their tasks and their friends tasks" ON public.tasks;

-- Create updated RLS policy with new conditions
CREATE POLICY "Users can view their tasks and their friends tasks"
ON public.tasks
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
    -- User owns the task
    ((SELECT auth.uid() AS uid) = user_id) 
    OR 
    -- User is confirmed friend of task owner and task is not private
    (
        EXISTS (
            SELECT 1 
            FROM friend_requests fr 
            WHERE fr.status = 'confirmed' 
            AND (
                (fr.requester_id = (SELECT auth.uid() AS uid) AND fr.recipient_id = tasks.user_id) 
                OR 
                (fr.recipient_id = (SELECT auth.uid() AS uid) AND fr.requester_id = tasks.user_id)
            )
        ) 
        AND is_private = false
    )
    OR
    -- Task was assigned by the current user
    ((SELECT auth.uid() AS uid) = assigned_by)
);

-- Add comment to the new column
COMMENT ON COLUMN public.tasks.assigned_by IS 'ID of the user who assigned this task, if applicable.';

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
        WHERE (fp.user_id = (SELECT auth.uid() AS uid)) 
        AND (fp.friend_user_id = tasks.user_id)
        AND (fp.create_tasks = true)
    )
);
