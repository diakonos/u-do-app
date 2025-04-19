-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own tasks" ON "public"."tasks";
DROP POLICY IF EXISTS "Users can view their own tasks" ON "public"."tasks";
DROP POLICY IF EXISTS "Users can update their own tasks" ON "public"."tasks";
DROP POLICY IF EXISTS "Users can delete their own tasks" ON "public"."tasks";

-- Enable authenticated users to insert their own tasks
CREATE POLICY "Users can insert their own tasks" ON "public"."tasks"
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable users to view their own tasks
CREATE POLICY "Users can view their own tasks" ON "public"."tasks"
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Enable users to update their own tasks
CREATE POLICY "Users can update their own tasks" ON "public"."tasks"
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable users to delete their own tasks
CREATE POLICY "Users can delete their own tasks" ON "public"."tasks"
FOR DELETE TO authenticated
USING (auth.uid() = user_id);